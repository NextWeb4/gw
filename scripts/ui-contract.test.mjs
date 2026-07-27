import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');

test('interface uses Lucide components without emoji or custom functional image icons', async () => {
  const [app, index] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/index.html'),
  ]);
  const interfaceSource = `${app}\n${index}`;

  assert.match(app, /from 'lucide-react'/, 'interface must import Lucide components');
  assert.doesNotMatch(interfaceSource, /[\u2600-\u27BF\u{1F300}-\u{1FAFF}]/u, 'interface must not contain emoji');
  assert.doesNotMatch(app, /<(?:img|svg)\b/i, 'functional interface icons must not use image or inline SVG elements');
  assert.doesNotMatch(interfaceSource, /icon-font|fontawesome|material-icons/i, 'interface must not use icon fonts');
});

test('visual system stays local and honors reduced motion', async () => {
  const [app, css] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/src/styles.css'),
  ]);

  assert.doesNotMatch(css, /@import|url\(["']?https?:\/\//i, 'visual CSS must not load remote assets');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'visual CSS must support reduced motion');
  assert.match(app, /className="kinetic-field" aria-hidden="true"/, 'kinetic background must stay out of the accessibility tree');
  assert.match(css, /\.kinetic-field[^}]*pointer-events:\s*none/s, 'kinetic background must not intercept input');
});

test('desktop ledger layout keeps accessible navigation collapse and a read-only detail lane', async () => {
  const [app, css] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/src/styles.css'),
  ]);

  assert.match(app, /aria-label=\{sidebarCollapsed \? '展开左侧导航' : '收起左侧导航，仅显示图标'\}/, 'sidebar collapse must keep an accessible name');
  assert.match(app, /<BusinessDetailPanel detail=\{businessDetail\}/, 'business records must share one detail component');
  assert.match(app, /编辑此记录/, 'detail lane must route editing through the existing editor');
  assert.match(css, /\.content-wrap\.has-detail-panel[^}]*grid-template-columns:[^;}]*minmax\(300px,360px\)/s, 'wide business pages must reserve a right detail column');
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.content-wrap, \.content-wrap\.has-detail-panel[^}]*width:\s*calc\(100% - 24px\)/, 'narrow layout must return the detail lane to the mobile content width');
});

test('AI compact mode keeps consent controls while history and downloads remain explicit', async () => {
  const app = await read('apps/web/src/App.tsx');

  assert.match(app, /compact && prefill \? <p className="ai-ready-summary"/, 'compact AI must summarize the current-page material');
  assert.match(app, /脱敏预览（可继续修改）/, 'compact AI must retain the editable redaction preview');
  assert.match(app, /我确认本次材料已脱敏、非涉密且允许发送到所选服务商/, 'Internet AI must retain per-request confirmation');
  assert.match(app, /我确认本次材料已脱敏且允许发送到内部模型/, 'intranet AI must retain per-request confirmation');
  assert.match(app, /!compact && <AiHistoryPanel/, 'full AI workspace must expose local history without crowding the compact panel');
  assert.match(app, /HxHwang-Gw-\$\{__APP_VERSION__\}-\$\{edition\}-arm64-setup\.exe/, 'download center must expose versioned Windows ARM64 assets');
  assert.match(app, /HxHwang-Gw-\$\{__APP_VERSION__\}-\$\{edition\}-x86_64\.AppImage/, 'download center must expose versioned Linux x86_64 assets');
});
