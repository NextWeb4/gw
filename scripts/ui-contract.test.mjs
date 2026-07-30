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
  assert.match(app, /返回记录列表/, 'narrow business detail must provide an explicit route back to the ledger');
  assert.match(css, /\.content-wrap\.has-detail-panel[^}]*grid-template-columns:[^;}]*minmax\(300px,360px\)/s, 'wide business pages must reserve a right detail column');
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.content-wrap, \.content-wrap\.has-detail-panel[^}]*width:\s*calc\(100% - 24px\)/, 'narrow layout must return the detail lane to the mobile content width');
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.row-actions \.icon-button[^}]*44px/, 'narrow ledger actions must keep a 44px touch target');
});

test('AI compact mode keeps consent controls while history and downloads remain explicit', async () => {
  const [app, css] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/src/styles.css'),
  ]);

  assert.match(app, /compact && prefill \? <p className="ai-ready-summary"/, 'compact AI must summarize the current-page material');
  assert.match(app, /脱敏预览（可继续修改）/, 'compact AI must retain the editable redaction preview');
  assert.match(app, /我确认本次材料已脱敏、非涉密且允许发送到所选服务商/, 'Internet AI must retain per-request confirmation');
  assert.match(app, /我确认本次材料已脱敏且允许发送到内部模型/, 'intranet AI must retain per-request confirmation');
  assert.match(app, /中转站密码（仅当前会话）/, 'relay password must be explicitly session-only');
  assert.match(app, /解锁并刷新站点/, 'relay providers must require an explicit unlock action');
  assert.match(app, /刷新站点/, 'relay provider metadata refresh must remain user-triggered');
  assert.match(app, /Chrome 会询问是否允许“本地网络访问”/, 'the relay UI must explain Chrome local-network permission before unlock');
  assert.match(app, /打开本机管理页/, 'the relay admin must remain reachable before unlock');
  assert.match(app, /测试已保存配置/, 'the relay flow must direct operators to explicit saved-configuration diagnostics');
  assert.doesNotMatch(app, /localStorage[^\n]*relay|relay[^\n]*localStorage/i, 'relay passwords and sessions must remain in component memory');
  assert.match(app, /!compact && <AiHistoryPanel/, 'full AI workspace must expose local history without crowding the compact panel');
  assert.match(app, /<AiSectionNav \/>/, 'full AI workspace must expose section navigation for the long page');
  assert.match(app, /<AiWorkflowProgress connectionReady=/, 'full AI workbench must expose the four-step request state');
  assert.match(app, /className=\{`panel ai-advanced-config \$\{compact \? '' : 'full-ai-connection'\}`\}/, 'full AI connection settings must reuse the collapsible configuration control');
  assert.match(css, /\.ai-section-nav[^}]*position:\s*sticky/, 'AI section navigation must remain reachable while the workspace scrolls');
  assert.match(app, /HxHwang-Gw-\$\{__APP_VERSION__\}-\$\{edition\}-arm64-setup\.exe/, 'download center must expose versioned Windows ARM64 assets');
  assert.match(app, /HxHwang-Gw-\$\{__APP_VERSION__\}-\$\{edition\}-x86_64\.AppImage/, 'download center must expose versioned Linux x86_64 assets');
});

test('AI model discovery and generation share guarded, cancelable request lifecycles', async () => {
  const [app, css, syncClient] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/src/styles.css'),
    read('packages/sync-client/src/index.ts'),
  ]);

  assert.match(app, /function useLatestRequest\(\)/, 'AI requests must share one latest-request guard');
  assert.ok((app.match(/const generationRequest = useLatestRequest\(\)/g) || []).length >= 2, 'Internet and intranet generation must each use the shared latest-request guard');
  assert.ok((app.match(/<ModelCatalogField/g) || []).length >= 3, 'Internet, relay and intranet model lists must reuse the searchable catalog field');
  assert.match(app, /aria-label="筛选模型"/, 'large model catalogs must expose a keyboard-accessible filter');
  assert.match(app, /className="model-current-selection"/, 'long selected model IDs must remain readable outside the native select');
  assert.match(app, /modelRequest\.isCurrent\(runId\)/, 'late responses must be checked against the current request generation');
  assert.match(app, /正在获取模型/, 'model retrieval must expose an explicit busy state');
  assert.match(app, /停止等待/, 'model retrieval must expose an explicit stop-waiting action');
  assert.match(app, /已保留上次模型目录/, 'refresh failures must retain the last successful model catalog');
  assert.match(app, /function AiGenerationControl/, 'generation must reuse one busy and stop-waiting control');
  assert.match(app, /正在生成结果/, 'generation must expose an explicit busy state');
  assert.match(app, /停止等待生成结果/, 'generation must expose an explicit stop-waiting action');
  assert.match(app, /onSaveHistory\([\s\S]*generationRequest\.isCurrent\(runId\)/, 'history persistence must be guarded by the current generation identity');
  assert.ok((syncClient.match(/async generate\([^)]*signal\?: AbortSignal\)/g) || []).length >= 2, 'direct and intranet generation must accept caller cancellation');
  assert.match(syncClient, /async generate\(providerId: string,[\s\S]*signal\?: AbortSignal\)/, 'relay generation must accept caller cancellation');
  assert.match(syncClient, /AbortSignal\.any\(\[signal, timeout\]\)/, 'browser model discovery must combine caller cancellation with the bounded timeout');
  assert.match(css, /\.model-filter-field:focus-within/, 'the model filter must retain a visible keyboard focus state');
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.model-filter-field input[^}]*font-size:\s*16px/, 'the narrow model filter must avoid browser zoom and remain readable');
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.model-filter-field \.icon-button[^}]*44px/, 'the narrow model filter clear action must keep a 44px touch target');
  assert.match(css, /\.model-current-selection code[^}]*overflow-wrap:\s*anywhere/, 'long selected model IDs must wrap without widening the page');
  assert.match(css, /\.toast[^}]*pointer-events:\s*none/s, 'transient status messages must not block model controls beneath them');
  assert.match(css, /\.model-request-control[^}]*flex-wrap:\s*wrap/, 'refresh controls must wrap without widening narrow layouts');
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.ai-generation-control \.primary-button[^}]*44px/, 'narrow generation controls must keep a 44px touch target');
});
