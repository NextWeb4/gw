import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');

test('interface uses Lucide components without emoji or custom functional image icons', async () => {
  const [app, agendaView, recycleBin, index] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/src/AgendaView.tsx'),
    read('apps/web/src/RecycleBinView.tsx'),
    read('apps/web/index.html'),
  ]);
  const interfaceSource = `${app}\n${agendaView}\n${recycleBin}\n${index}`;

  assert.match(app, /from 'lucide-react'/, 'interface must import Lucide components');
  assert.match(agendaView, /from 'lucide-react'/, 'agenda interface must use the same Lucide component source');
  assert.match(recycleBin, /from 'lucide-react'/, 'recycle-bin interface must use the same Lucide component source');
  assert.doesNotMatch(interfaceSource, /[\u2600-\u27BF\u{1F300}-\u{1FAFF}]/u, 'interface must not contain emoji');
  assert.doesNotMatch(interfaceSource, /<(?:img|svg)\b/i, 'functional interface icons must not use image or inline SVG elements');
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

test('six ledgers share local-only filter and sort controls without changing stock scope', async () => {
  const [app, ledgerView, css] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/src/ledger-view.ts'),
    read('apps/web/src/styles.css'),
  ]);

  assert.match(app, /function LedgerViewControls\(/, 'all business ledgers must reuse one view-control component');
  assert.ok((app.match(/<LedgerViewControls/g) || []).length >= 6, 'all six ledger views must render the shared control');
  assert.match(app, /createInitialLedgerViewStates/, 'ledger view state must be separated per module for the current session');
  assert.match(app, /allMaterials=\{materials\}/, 'material stock must continue receiving every material record');
  assert.match(ledgerView, /\.map\(\(record, index\) => \(\{ record, index \}\)\)/, 'view derivation must copy and index source records before sorting');
  assert.doesNotMatch(ledgerView, /\bfetch\b|listRecords|IndexedDB|localStorage|Electron|putRecord|removeRecord/i, 'ledger filtering and sorting must remain a pure local view transformation');
  assert.match(css, /\.ledger-view-controls[^}]*flex-wrap:\s*wrap/, 'ledger controls must wrap instead of widening the page');
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.ledger-select[^}]*min-height:\s*44px/, 'narrow ledger selects must retain a 44px touch target');
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.ledger-clear[^}]*min-height:\s*44px/, 'narrow clear action must retain a 44px touch target');
});

test('unified agenda stays local-only and reuses the existing record detail path', async () => {
  const [app, agenda, agendaView, css] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/src/agenda.ts'),
    read('apps/web/src/AgendaView.tsx'),
    read('apps/web/src/styles.css'),
  ]);

  assert.match(app, /\{ id: 'agenda', label: '事务日历', icon: CalendarRange \}/, 'agenda must be a discoverable primary navigation module');
  assert.match(app, /resetLedgerView\(businessTab\);\s*navigate\(businessTab\);\s*selectBusinessRecord\(businessTab, id\)/, 'agenda records must reuse ledger reset, navigation and detail selection');
  assert.match(agenda, /Array\.from\(\{ length: 42 \}/, 'month derivation must always create a stable six-week grid');
  assert.match(agenda, /isValidIsoDateTime/, 'meeting date-times must use the shared strict domain validator');
  assert.doesNotMatch(`${agenda}\n${agendaView}`, /\bfetch\b|listRecords|IndexedDB|localStorage|Electron|putRecord|removeRecord|ipc/i, 'agenda derivation and UI must stay within already loaded local arrays');
  assert.match(agendaView, /aria-current=\{day\.date === today \? 'date' : undefined\}/, 'the current day must expose semantic state');
  assert.match(agendaView, /aria-pressed=\{selectedDate === day\.date\}/, 'the selected day must expose semantic state');
  assert.match(css, /\.agenda-layout[^}]*grid-template-columns:/, 'desktop agenda must separate the month grid and selected-day list');
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.agenda-layout[^}]*grid-template-columns:\s*1fr/, 'narrow agenda must stack without horizontal overflow');
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.agenda-day-button[^}]*min-height:\s*44px/, 'narrow date cells must keep a 44px touch target');
});

test('work overview stays a local read-only cross-module action board', async () => {
  const [app, overview, view, styles] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/src/work-overview.ts'),
    read('apps/web/src/WorkOverview.tsx'),
    read('apps/web/src/styles.css'),
  ]);

  assert.match(app, /<WorkOverview[^>]+onOpenRecord=\{onOpenRecord\}/, 'dashboard must pass the existing business-record opener into the action board');
  assert.match(overview, /buildAgendaEvents\(sources\)/, 'overview must reuse the agenda date normalization instead of duplicating date mappings');
  assert.match(overview, /event\.kind === 'tasks' && event\.date < today/, 'only task deadlines may enter the overdue bucket');
  assert.match(overview, /event\.date > today && event\.date <= daySeven/, 'upcoming must have an explicit seven-day boundary');
  assert.match(overview, /record as Task\)\.status === 'done'/, 'completed tasks must not enter the unscheduled bucket');
  assert.doesNotMatch(`${overview}\n${view}`, /\bfetch\b|listRecords|IndexedDB|localStorage|Electron|putRecord|removeRecord|ipc/i, 'overview derivation and UI must stay within loaded local arrays');
  assert.match(overview, /unscheduledItems\.sort\(compareUnscheduled\)/, 'unscheduled records must have deterministic ordering');
  assert.match(view, /onOpenRecord\(item\.kind, item\.recordId\)/, 'overview items must reuse existing record navigation');
  assert.match(styles, /\.work-overview-tabs[^}]*grid-template-columns:\s*repeat\(3/, 'overview scopes must remain visible as three explicit actions');
  assert.match(styles, /@media \(max-width: 800px\)[\s\S]*\.work-overview-item[^}]*min-height:\s*68px/, 'narrow overview records must retain a touch-sized row');
  assert.match(styles, /\.dashboard-hero[^}]*min-height:\s*320px/, 'dashboard hero must be compact enough to expose the action board earlier');
});

test('quick task capture reuses deterministic extraction and the existing guarded editor', async () => {
  const [app, capture, domain, css] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/src/QuickTaskCapture.tsx'),
    read('packages/domain/src/index.ts'),
    read('apps/web/src/styles.css'),
  ]);

  assert.match(domain, /export function applyTaskTextExtraction\(/, 'quick capture and the task drawer must share one field-application function');
  assert.match(capture, /extractTaskFromText/, 'quick capture preview must use the existing deterministic extractor');
  assert.match(capture, /\.showModal\(\)/, 'quick capture must use the native modal dialog focus boundary');
  assert.doesNotMatch(capture, /\bfetch\b|listRecords|IndexedDB|localStorage|Electron|putRecord|removeRecord|ipc/i, 'quick capture must remain session-only and local');
  assert.match(app, /event\.shiftKey[^\n]+event\.key\.toLowerCase\(\) !== 'a'/, 'the global shortcut must be limited to Shift+A');
  assert.match(app, /input, textarea, select, \[contenteditable="true"\]/, 'the shortcut must not intercept editable controls');
  assert.match(app, /<TaskEditor[^>]+initialImportText=\{taskEditorImportText\}/, 'captured source text must continue into the existing task editor');
  assert.match(app, /applyTaskTextExtraction\(emptyTask\(\), extraction\)/, 'capture must prefill the original task model instead of saving directly');
  assert.match(app, /useUnsavedChangesGuard\([^\n]+Boolean\(initialImportText\)\)/, 'a prefilled capture must be protected as unsaved from first render');
  assert.match(css, /\.quick-capture-dialog/, 'the native dialog must have a dedicated responsive treatment');
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.quick-capture-action[^}]*min-height:\s*44px/, 'narrow quick-capture actions must keep 44px touch targets');
});

test('recycle bin stays local-only and exposes explicit restore and permanent-delete actions', async () => {
  const [app, recycleBin, css] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/src/RecycleBinView.tsx'),
    read('apps/web/src/styles.css'),
  ]);

  assert.match(app, /\{ id: 'recycle', label: '回收站', icon: Trash2 \}/, 'recycle bin must be a discoverable navigation module');
  assert.match(app, /partitionBusinessRecords/, 'all business consumers must receive active records derived from the shared lifecycle partition');
  assert.match(app, /<RecycleBinView/, 'the application must use a dedicated recycle-bin view');
  assert.doesNotMatch(recycleBin, /\bfetch\b|listRecords|IndexedDB|localStorage|Electron|putRecord|removeRecord|ipc/i, 'recycle-bin presentation must only use records already loaded by App');
  assert.match(recycleBin, /aria-label="搜索回收站"/, 'trash search must have an accessible name');
  assert.match(recycleBin, /永久删除/, 'permanent deletion must remain an explicit action');
  assert.match(recycleBin, /恢复/, 'restore must remain an explicit action');
  assert.match(css, /\.recycle-toolbar[^}]*flex-wrap:\s*wrap/, 'trash controls must wrap instead of widening narrow layouts');
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.recycle-action[^}]*min-height:\s*44px/, 'narrow trash actions must keep a 44px touch target');
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

test('business drawers share one unsaved-change guard without persisting staged attachments', async () => {
  const [app, css] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/src/styles.css'),
  ]);

  assert.match(app, /function useUnsavedChangesGuard\(/, 'all business editors must reuse one dirty-state and unload guard');
  assert.ok((app.match(/useUnsavedChangesGuard\(/g) || []).length >= 7, 'the guard definition and all six business editors must be present');
  assert.match(app, /window\.addEventListener\('beforeunload'/, 'dirty editors must protect browser refresh and window close');
  assert.match(app, /event\.key !== 'Escape'/, 'drawers must support Escape through the same guarded close path');
  assert.match(app, /未保存修改/, 'dirty drawers must expose visible state and confirmation copy');
  assert.match(app, /clearPendingAttachments\(\); setTaskEditor\(null\)/, 'discarding a guarded task editor must continue clearing staged attachments');
  assert.match(app, /pendingAttachmentSessionRef\.current \+= 1/, 'discarding an editor must invalidate attachment reads still in flight');
  assert.match(app, /session !== pendingAttachmentSessionRef\.current/, 'late attachment reads must not update a closed or replaced editor');
  assert.ok((app.match(/attachmentBusy=\{pendingAttachmentJobs > 0\}/g) || []).length >= 6, 'all six editors must treat attachment processing as unsaved work');
  assert.ok((app.match(/disabled=\{attachmentBusy\}/g) || []).length >= 6, 'all six save actions must wait until attachment processing finishes');
  assert.match(css, /\.drawer-unsaved-status/, 'dirty state must have a dedicated drawer status treatment');
});

test('global search stays local-only and reuses accessible navigation paths', async () => {
  const [app, globalSearch, css] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/src/GlobalSearch.tsx'),
    read('apps/web/src/styles.css'),
  ]);

  assert.match(globalSearch, /from 'cmdk'/, 'the command palette must reuse the audited accessible cmdk primitive');
  assert.match(globalSearch, /<Command\.Dialog[^>]*label="全局查找"/, 'cmdk must give the dialog and its combobox a stable accessible label');
  assert.match(globalSearch, /<Command\.Input/, 'the palette must use cmdk input semantics rather than a custom keyboard field');
  assert.match(globalSearch, /<Command\.Group heading=\{group\.label\}/, 'navigation and each business ledger must remain visibly grouped');
  assert.doesNotMatch(globalSearch, /\bfetch\b|listRecords|IndexedDB|localStorage|Electron|apiKey|password|session/i, 'the palette component must not read data, network state or secrets directly');
  assert.match(app, /event\.key\.toLowerCase\(\) !== 'k'/, 'the palette shortcut must be limited to the K key');
  assert.match(app, /!event\.metaKey && !event\.ctrlKey/, 'the palette shortcut must support Ctrl and Command without intercepting plain typing');
  assert.match(app, /globalSearchBlocked/, 'editors and the AI overlay must block command-palette modal stacking');
  assert.match(app, /navigate\(businessTab\);\s*selectBusinessRecord\(businessTab, id\)/, 'record results must reuse the existing navigation and record-selection paths');
  assert.match(css, /\.global-search-trigger/, 'the topbar must provide a styled visible global-search trigger');
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.global-search-trigger[^}]*44px/, 'the narrow global-search trigger must retain a 44px touch target');
});
