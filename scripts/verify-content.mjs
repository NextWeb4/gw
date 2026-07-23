import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { authorizedUrlsForSource, MAX_SOURCE_BYTES, validateConfiguredHosts, validateSourceUrl } from './content-sync-policy.mjs';

const root = path.resolve(import.meta.dirname, '..');
const pack = JSON.parse(await readFile(path.join(root, 'content', 'generated', 'knowledge-pack.json'), 'utf8'));
const authorization = JSON.parse(await readFile(path.join(root, 'content', 'licensed', 'authorization.json'), 'utf8'));
const snapshotDocument = JSON.parse(await readFile(path.join(root, 'content', 'generated', 'source-snapshots.json'), 'utf8'));
const sourceConfig = parse(await readFile(path.join(root, 'content', 'sources', 'allowlist.yaml'), 'utf8'));
if (pack.version !== 1 || authorization.version !== 1 || snapshotDocument.version !== 1 || sourceConfig.version !== 1 || sourceConfig.policy !== 'public-authority-or-authorized-url') throw new Error('内容包、来源快照或授权元数据版本无效');
if (!Array.isArray(pack.sources) || !Array.isArray(pack.rules) || !Array.isArray(pack.templates)) throw new Error('知识包集合结构无效');

const sources = new Map(pack.sources.map((source) => [source.id, source]));
if (sources.size !== pack.sources.length) throw new Error('知识包来源 id 重复');
for (const rule of pack.rules) if (!sources.has(rule.sourceId)) throw new Error(`规则引用未知来源：${rule.id}`);
for (const template of pack.templates) if (!sources.has(template.sourceId)) throw new Error(`模板引用未知来源：${template.id}`);

const authorizationById = new Map(authorization.records.map((record) => [record.id, record]));
for (const source of pack.sources.filter((item) => item.kind === 'licensed-material')) {
  const record = authorizationById.get(source.id);
  if (!record || record.authorizationStatus !== 'user-confirmed') throw new Error(`授权资料缺少用户确认记录：${source.id}`);
  if (!Array.isArray(record.authorizationScope) || !record.authorizationScope.length || !record.copyrightOwner) throw new Error(`授权资料范围或版权归属不完整：${source.id}`);
  for (const file of record.sourceFiles || []) await access(path.join(root, 'content', 'licensed', file));
  if (source.authorizationRef !== `content/licensed/authorization.json#${source.id}`) throw new Error(`知识包授权引用不一致：${source.id}`);
}

const configuredHosts = validateConfiguredHosts(sourceConfig.hosts);
const allAuthorizationRecords = new Map(authorization.records.map((record) => [record.id, record]));
if (!Array.isArray(sourceConfig.sources) || !Array.isArray(snapshotDocument.snapshots)) throw new Error('来源允许清单或快照集合无效');
const configuredSources = new Map(sourceConfig.sources.map((source) => [source.id, source]));
if (configuredSources.size !== sourceConfig.sources.length) throw new Error('来源允许清单 id 重复');
const snapshots = new Map(snapshotDocument.snapshots.map((snapshot) => [snapshot.id, snapshot]));
if (snapshots.size !== snapshotDocument.snapshots.length) throw new Error('来源快照 id 重复');
if (snapshots.size !== configuredSources.size) throw new Error('来源快照与允许清单数量不一致');
for (const [id, source] of configuredSources) {
  const snapshot = snapshots.get(id);
  if (!snapshot) throw new Error(`来源缺少快照：${id}`);
  const authorizedUrls = authorizedUrlsForSource(source, allAuthorizationRecords);
  validateSourceUrl(source.url, configuredHosts, authorizedUrls);
  validateSourceUrl(snapshot.url, configuredHosts, authorizedUrls);
  if (snapshot.title !== source.title || snapshot.kind !== source.kind || snapshot.mode !== source.mode) throw new Error(`来源快照元数据不一致：${id}`);
  if (!/^[a-f0-9]{64}$/.test(snapshot.sha256)) throw new Error(`来源快照哈希无效：${id}`);
  if (!Number.isInteger(snapshot.bytes) || snapshot.bytes <= 0 || snapshot.bytes > MAX_SOURCE_BYTES) throw new Error(`来源快照体积无效：${id}`);
  if (!/^text\/html(?:;|$)/i.test(snapshot.contentType)) throw new Error(`来源快照类型无效：${id}`);
  if (Number.isNaN(Date.parse(snapshot.retrievedAt))) throw new Error(`来源快照时间无效：${id}`);
}
const expectedPackSnapshots = snapshotDocument.snapshots.map(({ id, url, sha256, retrievedAt, contentType, bytes }) => ({ id, url, sha256, retrievedAt, contentType, bytes }));
if (JSON.stringify(pack.sourceSnapshots) !== JSON.stringify(expectedPackSnapshots)) throw new Error('知识包的来源快照引用未同步');

process.stdout.write(`Verified ${pack.rules.length} rules, ${pack.templates.length} templates and ${authorization.records.length} authorization record(s).\n`);
