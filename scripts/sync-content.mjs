import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parse } from 'yaml';
import {
  authorizedUrlsForSource,
  fetchWithPolicy,
  MAX_SOURCE_BYTES,
  readBoundedBody,
  snapshotContentChanged,
  validateConfiguredHosts
} from './content-sync-policy.mjs';

const root = path.resolve(import.meta.dirname, '..');
const sourceConfig = await readFile(path.join(root, 'content', 'sources', 'allowlist.yaml'), 'utf8');
const parsedConfig = parse(sourceConfig);
const sources = Array.isArray(parsedConfig?.sources) ? parsedConfig.sources : [];

if (parsedConfig?.version !== 1 || parsedConfig?.policy !== 'public-authority-or-authorized-url' || !sources.length) throw new Error('来源清单结构或策略无效');
const configuredHosts = validateConfiguredHosts(parsedConfig.hosts);
const authorization = JSON.parse(await readFile(path.join(root, 'content', 'licensed', 'authorization.json'), 'utf8'));
const authorizationRecords = new Map((authorization.records || []).map((record) => [record.id, record]));
const snapshotPath = path.join(root, 'content', 'generated', 'source-snapshots.json');
const packPath = path.join(root, 'content', 'generated', 'knowledge-pack.json');
const previousSnapshotDocument = JSON.parse(await readFile(snapshotPath, 'utf8'));
const previousSnapshots = new Map((previousSnapshotDocument.snapshots || []).map((snapshot) => [snapshot.id, snapshot]));
const retrievedAt = new Date().toISOString();

const snapshots = [];
const sourceIds = new Set();
for (const source of sources) {
  if (!source || typeof source.id !== 'string' || typeof source.url !== 'string' || typeof source.kind !== 'string') throw new Error('来源清单中的 id、url 或 kind 不完整');
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(source.id)) throw new Error(`来源 id 无效：${source.id}`);
  if (sourceIds.has(source.id)) throw new Error(`来源 id 重复：${source.id}`);
  sourceIds.add(source.id);
  if (typeof source.title !== 'string' || typeof source.mode !== 'string') throw new Error(`来源标题或同步模式不完整：${source.id}`);
  const authorizedUrls = authorizedUrlsForSource(source, authorizationRecords);
  const { response, finalUrl } = await fetchWithPolicy(source.url, { configuredHosts, authorizedUrls });
  if (!response.ok) throw new Error(`来源请求失败：${response.status} ${source.url}`);
  const contentType = response.headers.get('content-type') || '';
  if (!/^text\/html(?:;|$)/i.test(contentType)) throw new Error(`不支持的来源类型：${contentType}`);
  const body = await readBoundedBody(response, MAX_SOURCE_BYTES);
  const text = body.toString('utf8');
  if (typeof source.minBytes === 'number' && body.byteLength < source.minBytes) throw new Error(`来源响应小于结构阈值：${source.url}`);
  if (typeof source.requiredText === 'string' && !text.includes(source.requiredText)) throw new Error(`来源响应缺少必含文本：${source.requiredText}`);
  const candidate = {
    id: source.id,
    title: source.title,
    kind: source.kind,
    mode: source.mode,
    url: finalUrl.toString(),
    retrievedAt,
    sha256: createHash('sha256').update(body).digest('hex'),
    contentType,
    bytes: body.byteLength
  };
  const previous = previousSnapshots.get(source.id);
  snapshots.push(snapshotContentChanged(previous, candidate) ? candidate : { ...candidate, retrievedAt: previous.retrievedAt });
}

const pack = JSON.parse(await readFile(packPath, 'utf8'));
const nextPackSnapshots = snapshots.map(({ id, url, sha256, retrievedAt, contentType, bytes }) => ({ id, url, sha256, retrievedAt, contentType, bytes }));
const snapshotsChanged = JSON.stringify(previousSnapshotDocument.snapshots || []) !== JSON.stringify(snapshots);
const packSnapshotsChanged = JSON.stringify(pack.sourceSnapshots || []) !== JSON.stringify(nextPackSnapshots);
const changed = snapshotsChanged || packSnapshotsChanged;
const snapshotDocument = {
  version: 1,
  updatedAt: changed ? retrievedAt : previousSnapshotDocument.updatedAt,
  snapshots
};
if (changed) pack.generatedAt = retrievedAt;
pack.sourceSnapshots = nextPackSnapshots;
await Promise.all([
  writeFile(snapshotPath, `${JSON.stringify(snapshotDocument, null, 2)}\n`, 'utf8'),
  writeFile(packPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8')
]);
process.stdout.write(`Checked ${snapshots.length} source snapshot(s); ${changed ? 'metadata updated' : 'no change'}.\n`);
