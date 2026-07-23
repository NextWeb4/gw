import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pack = JSON.parse(await readFile(path.join(root, 'content', 'generated', 'knowledge-pack.json'), 'utf8'));
const authorization = JSON.parse(await readFile(path.join(root, 'content', 'licensed', 'authorization.json'), 'utf8'));
if (pack.version !== 1 || authorization.version !== 1) throw new Error('内容包或授权元数据版本无效');

const sources = new Map(pack.sources.map((source) => [source.id, source]));
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

process.stdout.write(`Verified ${pack.rules.length} rules, ${pack.templates.length} templates and ${authorization.records.length} authorization record(s).\n`);
