import { readFile } from 'node:fs/promises';
import path from 'node:path';

const indexPath = path.resolve(import.meta.dirname, '..', 'apps', 'web', 'dist', 'index.html');
const html = await readFile(indexPath, 'utf8');
const resourcePaths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
const bundledResources = resourcePaths.filter((value) => !value.startsWith('data:'));

if (!bundledResources.length) throw new Error('桌面 Web 入口未引用任何构建资源');

const invalid = bundledResources.filter((value) => !value.startsWith('./'));
if (invalid.length) throw new Error(`桌面资源必须使用相对路径：${invalid.join(', ')}`);

const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] || '';
if (!csp.includes("connect-src https: http://127.0.0.1:* http://localhost:*")) throw new Error('桌面 CSP 未允许显式 HTTPS 或本机 API 连接');
if (csp.includes("connect-src 'self'")) throw new Error('桌面 CSP 仍使用仅同源连接策略');

process.stdout.write(`Verified ${bundledResources.length} relative desktop resource path(s) and desktop CSP.\n`);
