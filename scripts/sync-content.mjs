import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parse } from 'yaml';

const root = path.resolve(import.meta.dirname, '..');
const allowedHosts = new Set(['gov.cn', 'www.gov.cn', 'openstd.samr.gov.cn', 'std.samr.gov.cn']);
const sourceConfig = await readFile(path.join(root, 'content', 'sources', 'allowlist.yaml'), 'utf8');
const parsedConfig = parse(sourceConfig);
const sources = Array.isArray(parsedConfig?.sources) ? parsedConfig.sources : [];

if (parsedConfig?.version !== 1 || parsedConfig?.policy !== 'public-authority-only' || !sources.length) throw new Error('来源清单结构或策略无效');

const snapshots = [];
for (const source of sources) {
  if (!source || typeof source.id !== 'string' || typeof source.url !== 'string' || typeof source.kind !== 'string') throw new Error('来源清单中的 id、url 或 kind 不完整');
  const sourceUrl = new URL(source.url);
  if (!allowedHosts.has(sourceUrl.hostname)) throw new Error(`来源域名不在允许清单：${sourceUrl.hostname}`);
  const response = await fetch(sourceUrl, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'HxHwang-Gw-ContentSync/0.1 (+https://nextweb4.github.io/)' } });
  if (!response.ok) throw new Error(`来源请求失败：${response.status} ${sourceUrl}`);
  const finalUrl = new URL(response.url);
  if (!allowedHosts.has(finalUrl.hostname)) throw new Error(`来源重定向到未授权域名：${finalUrl.hostname}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) throw new Error(`不支持的来源类型：${contentType}`);
  const body = await response.text();
  if (body.length > 2_000_000) throw new Error(`来源响应超过 2 MB：${sourceUrl}`);
  const bodyBytes = Buffer.byteLength(body);
  if (typeof source.minBytes === 'number' && bodyBytes < source.minBytes) throw new Error(`来源响应小于结构阈值：${sourceUrl}`);
  if (typeof source.requiredText === 'string' && !body.includes(source.requiredText)) throw new Error(`来源响应缺少必含文本：${source.requiredText}`);
  snapshots.push({ id: source.id, url: finalUrl.toString(), retrievedAt: new Date().toISOString(), sha256: createHash('sha256').update(body).digest('hex'), contentType, bytes: bodyBytes });
}

const snapshotPath = path.join(root, 'content', 'generated', 'source-snapshots.json');
await writeFile(snapshotPath, `${JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), snapshots }, null, 2)}\n`, 'utf8');

const packPath = path.join(root, 'content', 'generated', 'knowledge-pack.json');
const pack = JSON.parse(await readFile(packPath, 'utf8'));
pack.generatedAt = new Date().toISOString();
pack.sourceSnapshots = snapshots.map(({ id, sha256, retrievedAt }) => ({ id, sha256, retrievedAt }));
await writeFile(packPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
process.stdout.write(`Updated ${snapshots.length} source snapshot(s).\n`);
