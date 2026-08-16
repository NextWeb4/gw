import path from 'node:path';
import { readFileSync } from 'node:fs';
import { expect, test, type Locator } from '@playwright/test';
import { exportDraftDocx } from '../packages/documents/src/index';

const fixture = (name: string) => path.resolve('packages', 'migration', 'test', 'fixtures', name);
const appVersion = (JSON.parse(readFileSync(path.resolve('package.json'), 'utf8')) as { version: string }).version;

test.beforeEach(async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(consoleErrors).toEqual([]);
});

test('loads the offline demo without third-party or private API traffic', async ({ page }, testInfo) => {
  const unexpectedRequests: string[] = [];
  const pageOrigin = new URL(page.url()).origin;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== pageOrigin) unexpectedRequests.push(request.url());
  });

  await page.reload();
  await expect(page.getByText('推进全省基层治理年度工作总结')).toBeVisible();
  await expect(page.getByText('整理省政府办公厅来文并建立关联')).toBeVisible();
  if (testInfo.project.name === 'chromium') await expect(page.getByText('用户 Key 仅保留在当前会话')).toBeVisible();
  await expect(page.getByText('Rays688888@Gmail.com').last()).toBeVisible();
  await page.getByRole('button', { name: '文件收发' }).click();
  const demoDocument = page.locator('.table-row').filter({ hasText: '关于做好2026年全省重点工作的通知' });
  await expect(demoDocument).toContainText('闽政〔2026〕1号');
  await expect(demoDocument).toContainText('福建省人民政府办公厅');
  expect(unexpectedRequests).toEqual([]);
});

test('workbench exposes local cross-module action scopes without extra traffic', async ({ page }, testInfo) => {
  const unexpectedRequests: string[] = [];
  const pageOrigin = new URL(page.url()).origin;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== pageOrigin) unexpectedRequests.push(request.url());
  });

  const board = page.getByRole('region', { name: '工作焦点概览' });
  await expect(board).toBeVisible();
  await expect(board.getByRole('tab', { name: /今日与逾期/ })).toBeVisible();
  await expect(board.getByRole('tab', { name: /未来 7 天/ })).toBeVisible();
  await expect(board.getByRole('tab', { name: /未排期/ })).toBeVisible();
  await board.getByRole('tab', { name: /未来 7 天/ }).click();
  await expect(board.getByRole('tab', { name: /未来 7 天/ })).toHaveAttribute('aria-selected', 'true');
  await board.getByRole('tab', { name: /未排期/ }).click();
  await expect(board.getByRole('tab', { name: /未排期/ })).toHaveAttribute('aria-selected', 'true');
  if (testInfo.project.name === 'mobile') {
    for (const control of [board.getByRole('tab', { name: /今日与逾期/ }), board.getByRole('tab', { name: /未来 7 天/ }), board.getByRole('tab', { name: /未排期/ })]) {
      const box = await control.boundingBox();
      expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await board.getByRole('button', { name: '查看完整日历' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '事务日历' })).toBeVisible();
  expect(unexpectedRequests).toEqual([]);
});

test('collapses the desktop navigation and keeps record details linked to the existing editor', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop three-column behavior is checked once.');
  const sidebar = page.locator('.sidebar');
  const expandedWidth = (await sidebar.boundingBox())?.width || 0;
  expect(expandedWidth).toBeGreaterThan(200);

  await page.getByRole('button', { name: '收起左侧导航，仅显示图标' }).click();
  await expect(page.locator('.shell')).toHaveClass(/sidebar-collapsed/);
  const collapsedWidth = (await sidebar.boundingBox())?.width || 0;
  expect(collapsedWidth).toBeLessThan(100);
  await expect(page.getByRole('button', { name: '任务管理' })).toBeVisible();

  await page.getByRole('button', { name: '任务管理' }).click();
  const detailPanel = page.locator('.business-detail-panel');
  await expect(detailPanel).toBeVisible();
  await expect(detailPanel.getByRole('heading', { level: 2 })).toContainText('推进全省基层治理年度工作总结');
  const targetRow = page.locator('.selectable-row').filter({ hasText: '整理省政府办公厅来文并建立关联' });
  await targetRow.click();
  await expect(targetRow).toHaveClass(/selected/);
  await expect(detailPanel.getByRole('heading', { level: 2 })).toContainText('整理省政府办公厅来文并建立关联');
  await expect(detailPanel.getByRole('button', { name: '返回记录列表' })).toBeHidden();
  await detailPanel.getByRole('button', { name: '编辑此记录' }).click();
  await expect(page.getByRole('dialog', { name: '编辑任务' })).toBeVisible();
  await page.getByRole('dialog', { name: '编辑任务' }).getByRole('button', { name: '关闭' }).click();

  await page.getByRole('button', { name: '展开左侧导航' }).click();
  await expect(page.locator('.shell')).not.toHaveClass(/sidebar-collapsed/);
});

test('copies all six business kinds into guarded drafts without auto-saving or external traffic', async ({ page }, testInfo) => {
  const unexpectedRequests: string[] = [];
  const pageOrigin = new URL(page.url()).origin;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== pageOrigin) unexpectedRequests.push(request.url());
  });

  const cases = [
    { nav: '任务管理', dialog: '复制任务为新记录', field: '任务名称', value: '推进全省基层治理年度工作总结' },
    { nav: '会议管理', dialog: '复制会议为新记录', field: '会议主题', value: '全省重点工作协调推进会' },
    { nav: '文件收发', dialog: '复制文件为新记录', field: '文件标题', value: '关于做好2026年全省重点工作的通知' },
    { nav: '外出活动', dialog: '复制外出活动为新记录', field: '活动主题', value: '基层服务阵地运行情况调研' },
    { nav: '用章管理', dialog: '复制用章记录为新记录', field: '所盖文件名称', value: '省直单位工作联系函' },
    { nav: '物资收发', dialog: '复制物资记录为新记录', field: '物资名称', value: 'A4 打印纸' },
  ];

  for (const item of cases) {
    await page.getByRole('button', { name: item.nav, exact: true }).click();
    const rowCountBefore = await page.locator('.selectable-row').count();
    const copyButton = page.locator('.business-detail-panel').getByRole('button', { name: '复制相似记录' });
    await expect(copyButton).toBeVisible();
    if (testInfo.project.name === 'mobile') {
      const box = await copyButton.boundingBox();
      expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }
    await copyButton.click();
    const dialog = page.getByRole('dialog', { name: item.dialog });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('这是未保存的新记录')).toBeVisible();
    if (item.nav === '文件收发') await expect(dialog.getByText('0 个可用关联')).toBeVisible();
    await expect(dialog.getByLabel(item.field)).toHaveValue(item.value);
    page.once('dialog', (confirmation) => confirmation.accept());
    await dialog.getByRole('button', { name: '关闭' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.selectable-row')).toHaveCount(rowCountBefore);
  }

  await page.getByRole('button', { name: '任务管理', exact: true }).click();
  await page.locator('.business-detail-panel').getByRole('button', { name: '复制相似记录' }).click();
  const taskDialog = page.getByRole('dialog', { name: '复制任务为新记录' });
  await expect(taskDialog.getByRole('combobox').first()).toHaveValue('pending');
  await expect(taskDialog.getByLabel('工作小结')).toHaveValue('');
  await taskDialog.getByLabel('任务名称').fill('复制相似记录回归任务');
  await taskDialog.getByRole('button', { name: '保存任务' }).click();
  await expect(page.locator('.selectable-row').filter({ hasText: '复制相似记录回归任务' })).toBeVisible();
  await expect(page.locator('.selectable-row').filter({ hasText: '推进全省基层治理年度工作总结' })).toBeVisible();
  await expect(page.locator('.business-detail-panel').getByRole('heading', { level: 2 })).toContainText('复制相似记录回归任务');
  expect(unexpectedRequests).toEqual([]);
});

test('moves business records through trash, restore and permanent-delete lifecycle without network traffic', async ({ page }, testInfo) => {
  const unexpectedRequests: string[] = [];
  const pageOrigin = new URL(page.url()).origin;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== pageOrigin) unexpectedRequests.push(request.url());
  });

  await page.getByRole('button', { name: '任务管理' }).click();
  const title = '整理省政府办公厅来文并建立关联';
  const row = page.locator('.selectable-row').filter({ hasText: title });
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByTitle('删除任务').click();
  await expect(row).toHaveCount(0);
  await page.getByRole('button', { name: '打开全局查找' }).click();
  await page.getByRole('dialog', { name: '全局查找' }).getByRole('combobox', { name: '全局查找' }).fill(title);
  await expect(page.getByText('没有找到匹配项')).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: '回收站' }).click();
  const recycleRegion = page.getByRole('region', { name: '已删除业务记录' });
  await expect(recycleRegion.getByText(title)).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await recycleRegion.getByRole('button', { name: `恢复任务：${title}` }).click();
  await expect(recycleRegion.getByText(title)).toHaveCount(0);

  await page.getByRole('button', { name: '任务管理' }).click();
  const restoredRow = page.locator('.selectable-row').filter({ hasText: title });
  await expect(restoredRow).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await restoredRow.getByTitle('删除任务').click();
  await page.getByRole('button', { name: '回收站' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: `永久删除任务：${title}` }).click();
  await expect(page.getByText(title)).toHaveCount(0);

  if (testInfo.project.name === 'mobile') {
    for (const control of [page.getByLabel('搜索回收站'), page.getByLabel('按类型筛选')]) {
      const box = await control.boundingBox();
      expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }
    const recycleNav = await page.getByRole('button', { name: '回收站', exact: true }).boundingBox();
    const navViewport = await page.locator('.nav-list').boundingBox();
    expect(recycleNav).not.toBeNull();
    expect(navViewport).not.toBeNull();
    expect(recycleNav!.x).toBeGreaterThanOrEqual(navViewport!.x);
    expect(recycleNav!.x + recycleNav!.width).toBeLessThanOrEqual(navViewport!.x + navViewport!.width + 1);
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(unexpectedRequests).toEqual([]);
});

test('moves narrow-screen record selection to the detail and provides a return path to the list', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Narrow-screen detail flow is checked in the mobile project.');
  await page.getByRole('button', { name: '任务管理' }).click();
  const mainArea = page.locator('.main-area');
  const tablePanel = page.locator('.table-panel');
  const detailPanel = page.locator('.business-detail-panel');
  const targetRow = page.locator('.selectable-row').filter({ hasText: '整理省政府办公厅来文并建立关联' });

  await targetRow.click();
  await expect(targetRow).toHaveClass(/selected/);
  await expect(detailPanel.getByRole('heading', { level: 2 })).toContainText('整理省政府办公厅来文并建立关联');
  await expect.poll(() => mainArea.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect.poll(() => detailPanel.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewport = element.closest('.main-area')!.getBoundingClientRect();
    return rect.top >= viewport.top && rect.top < viewport.bottom;
  })).toBe(true);

  const backButton = detailPanel.getByRole('button', { name: '返回记录列表' });
  await expect(backButton).toBeVisible();
  await backButton.click();
  await expect.poll(() => tablePanel.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewport = element.closest('.main-area')!.getBoundingClientRect();
    return rect.bottom > viewport.top && rect.top < viewport.bottom;
  })).toBe(true);
});

test('filters and sorts all six ledgers while preserving session views and full material stock', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: '任务管理' }).click();
  const taskFilter = page.getByLabel('任务管理筛选');
  const taskSort = page.getByLabel('任务管理排序');
  await expect(taskFilter).toBeVisible();
  await taskFilter.selectOption('status:progress');
  await expect(page.getByText('显示 1 / 2 条任务')).toBeVisible();
  await expect(page.locator('.table-row').filter({ hasText: '推进全省基层治理年度工作总结' })).toBeVisible();
  await expect(page.locator('.table-row').filter({ hasText: '整理省政府办公厅来文并建立关联' })).toHaveCount(0);

  await taskFilter.selectOption('all');
  await taskSort.selectOption('deadline:asc');
  await expect(page.locator('.table-row').nth(0)).toContainText('整理省政府办公厅来文并建立关联');
  await page.getByPlaceholder('搜索任务、类目或交办人').fill('省政府办公厅');
  await page.getByRole('button', { name: '会议管理' }).click();
  await page.getByRole('button', { name: '任务管理' }).click();
  await expect(page.getByPlaceholder('搜索任务、类目或交办人')).toHaveValue('省政府办公厅');
  await expect(taskSort).toHaveValue('deadline:asc');
  await expect(page.getByText('显示 1 / 2 条任务')).toBeVisible();
  await page.getByRole('button', { name: '清除当前台账筛选和排序' }).click();
  await expect(page.getByText('显示 2 / 2 条任务')).toBeVisible();

  const moduleFilters: Array<[string, string, string]> = [
    ['会议管理', '会议管理筛选', 'time:scheduled'],
    ['文件收发', '文件收发筛选', 'type:收文'],
    ['外出活动', '外出活动筛选', 'direction:外出调研'],
    ['用章管理', '用章管理筛选', 'type:函'],
  ];
  for (const [moduleName, filterName, option] of moduleFilters) {
    await page.getByRole('button', { name: moduleName }).click();
    await page.getByLabel(filterName).selectOption(option);
    await expect(page.locator('.table-row')).toHaveCount(1);
  }

  await page.getByRole('button', { name: '物资收发' }).click();
  await page.getByRole('button', { name: '新建物资记录' }).click();
  await page.getByLabel('物资名称').fill('A4 打印纸');
  await page.getByLabel('规格').fill('70g / 500 张');
  await page.getByLabel('收发类型').selectOption('out');
  await page.getByLabel('数量').fill('2');
  await page.getByRole('button', { name: '保存物资' }).click();
  await page.getByLabel('物资收发筛选').selectOption('movement:out');
  await expect(page.getByText('显示 1 / 2 笔收发')).toBeVisible();
  await expect(page.locator('.table-row').filter({ hasText: '领用 2' }).locator('.stock-balance')).toHaveText('3');

  if (testInfo.project.name === 'mobile') {
    for (const control of [page.getByLabel('物资收发筛选'), page.getByLabel('物资收发排序'), page.getByRole('button', { name: '清除当前台账筛选和排序' })]) {
      const box = await control.boundingBox();
      expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('exports the six current ledger views as secure local CSV without changing their session state', async ({ page }, testInfo) => {
  const downloadCurrentCsv = async (label: string) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出当前台账结果' }).click();
    const download = await downloadPromise;
    const filePath = await download.path();
    if (!filePath) throw new Error(`${label} CSV 下载路径不可用`);
    return { fileName: download.suggestedFilename(), content: readFileSync(filePath, 'utf8') };
  };

  await page.getByRole('button', { name: '任务管理', exact: true }).click();
  await page.getByLabel('任务管理排序').selectOption('deadline:asc');
  const selectedTitle = await page.locator('.business-detail-panel h2').textContent();
  const taskCsv = await downloadCurrentCsv('任务管理');
  expect(taskCsv.fileName).toMatch(/^hxhwang-gw-任务管理-当前结果-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(taskCsv.content.startsWith('\uFEFF')).toBe(true);
  expect(taskCsv.content.split('\r\n')[0]).toBe('\uFEFF"任务名称","工作类目","任务来源","交办人","交办日期","截止日期","状态","关联文件","配合单位","任务阶段","备注","工作小结","附件数量","创建时间","更新时间"');
  expect(taskCsv.content.indexOf('整理省政府办公厅来文并建立关联')).toBeLessThan(taskCsv.content.indexOf('推进全省基层治理年度工作总结'));
  await expect(page.getByLabel('任务管理排序')).toHaveValue('deadline:asc');
  expect(await page.locator('.business-detail-panel h2').textContent()).toBe(selectedTitle);

  await page.getByRole('button', { name: '新建任务' }).click();
  await page.getByLabel('任务名称').fill('=HYPERLINK("https://invalid.local")');
  await page.getByRole('button', { name: '保存任务' }).click();
  await page.getByLabel('任务管理关键词').fill('HYPERLINK');
  await expect(page.getByText('显示 1 / 3 条任务')).toBeVisible();

  await page.evaluate(() => {
    const target = window as Window & { __csvIdbWrites?: number };
    target.__csvIdbWrites = 0;
    const prototype = IDBObjectStore.prototype as IDBObjectStore & Record<string, unknown>;
    for (const method of ['add', 'clear', 'delete', 'put'] as const) {
      const original = prototype[method] as (...args: unknown[]) => IDBRequest;
      prototype[method] = function patchedIdbWrite(this: IDBObjectStore, ...args: unknown[]) {
        target.__csvIdbWrites = (target.__csvIdbWrites || 0) + 1;
        return original.apply(this, args);
      };
    }
  });
  const actionRequests: string[] = [];
  const recordActionRequest = (request: { url: () => string }) => actionRequests.push(request.url());
  page.on('request', recordActionRequest);

  const formulaCsv = await downloadCurrentCsv('任务管理');
  expect(formulaCsv.content.replace(/^\uFEFF/, '').trimEnd().split('\r\n')).toHaveLength(2);
  expect(formulaCsv.content).toContain('"\'=HYPERLINK(""https://invalid.local"")"');
  expect(formulaCsv.content).not.toMatch(/task_demo_|legacyPayload|sourceVersion|deletedAt|purgedAt/);
  await expect(page.getByLabel('任务管理关键词')).toHaveValue('HYPERLINK');
  await page.getByLabel('任务管理关键词').fill('不存在的当前结果');
  const emptyExport = page.getByRole('button', { name: '导出当前台账结果' });
  await expect(emptyExport).toBeDisabled();
  await expect(page.getByText('显示 0 / 3 条任务')).toBeVisible();

  const moduleCases = [
    ['会议管理', '会议主题', '全省重点工作协调推进会'],
    ['文件收发', '文件标题', '关于做好2026年全省重点工作的通知'],
    ['外出活动', '活动日期', '基层服务阵地运行情况调研'],
    ['用章管理', '用章日期', '省直单位工作联系函'],
    ['物资收发', '物资名称', 'A4 打印纸'],
  ] as const;
  for (const [label, firstHeader, value] of moduleCases) {
    await page.getByRole('button', { name: label, exact: true }).click();
    const csv = await downloadCurrentCsv(label);
    expect(csv.fileName).toMatch(new RegExp(`^hxhwang-gw-${label}-当前结果-\\d{4}-\\d{2}-\\d{2}\\.csv$`));
    expect(csv.content.split('\r\n')[0]).toContain(`"${firstHeader}"`);
    expect(csv.content).toContain(`"${value}"`);
  }

  expect(actionRequests).toEqual([]);
  expect(await page.evaluate(() => (window as Window & { __csvIdbWrites?: number }).__csvIdbWrites)).toBe(0);
  page.off('request', recordActionRequest);
  if (testInfo.project.name === 'mobile') {
    const exportButton = page.getByRole('button', { name: '导出当前台账结果' });
    const box = await exportButton.boundingBox();
    expect(box?.width || 0).toBeGreaterThanOrEqual(44);
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('links documents to active tasks through the existing guarded editor and reuses bidirectional detail navigation', async ({ page }, testInfo) => {
  const unexpectedRequests: string[] = [];
  const pageOrigin = new URL(page.url()).origin;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== pageOrigin) unexpectedRequests.push(request.url());
  });

  await page.getByRole('button', { name: '文件收发', exact: true }).click();
  const detail = page.locator('.business-detail-panel');
  const linkedTask = detail.getByRole('button', { name: /打开关联任务：整理省政府办公厅来文并建立关联/ });
  await expect(linkedTask).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    const box = await linkedTask.boundingBox();
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);
  }
  await linkedTask.click();
  await expect(page.getByRole('heading', { level: 1, name: '任务管理' })).toBeVisible();
  await expect(detail.getByRole('heading', { level: 2 })).toContainText('整理省政府办公厅来文并建立关联');
  await detail.getByRole('button', { name: /打开关联文件：关于做好2026年全省重点工作的通知/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: '文件收发' })).toBeVisible();

  await detail.getByRole('button', { name: '编辑此记录' }).click();
  const editor = page.getByRole('dialog', { name: '编辑文件' });
  await editor.getByLabel('筛选可关联任务').fill('基层治理');
  const additionalTask = editor.getByRole('checkbox', { name: /推进全省基层治理年度工作总结/ });
  await additionalTask.check();
  await expect(editor.getByText('未保存修改')).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    const optionBox = await additionalTask.locator('..').boundingBox();
    expect(optionBox?.height || 0).toBeGreaterThanOrEqual(44);
  }
  await editor.getByRole('button', { name: '保存文件' }).click();
  await expect(detail.getByRole('button', { name: /打开关联任务：推进全省基层治理年度工作总结/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '文件收发', exact: true }).click();
  const restoredDetail = page.locator('.business-detail-panel');
  const persistedRelation = restoredDetail.getByRole('button', { name: /打开关联任务：推进全省基层治理年度工作总结/ });
  await expect(persistedRelation).toBeVisible();
  await persistedRelation.click();
  const relatedTaskRow = page.locator('.selectable-row').filter({ hasText: '推进全省基层治理年度工作总结' });
  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await relatedTaskRow.getByTitle('删除任务').click();
  await page.getByRole('button', { name: '文件收发', exact: true }).click();
  await expect(page.locator('.business-detail-panel').getByRole('button', { name: /打开关联任务：推进全省基层治理年度工作总结/ })).toHaveCount(0);
  await page.getByRole('button', { name: '回收站', exact: true }).click();
  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await page.getByRole('button', { name: '恢复任务：推进全省基层治理年度工作总结' }).click();
  await page.getByRole('button', { name: '文件收发', exact: true }).click();
  await expect(page.locator('.business-detail-panel').getByRole('button', { name: /打开关联任务：推进全省基层治理年度工作总结/ })).toBeVisible();
  expect(unexpectedRequests).toEqual([]);
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('opens active weekly source records through the original detail path and keeps the detail rail session-only', async ({ page }, testInfo) => {
  const unexpectedRequests: string[] = [];
  const pageOrigin = new URL(page.url()).origin;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== pageOrigin) unexpectedRequests.push(request.url());
  });

  await page.getByRole('button', { name: '周报生成' }).click();
  await page.getByLabel('开始日期').fill('2026-07-20');
  await page.getByLabel('结束日期').fill('2026-07-28');
  await page.getByRole('button', { name: '重新汇总' }).click();
  const sourceTask = page.getByRole('button', { name: /打开周报来源任务：整理省政府办公厅来文并建立关联/ });
  await expect(sourceTask).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    const sourceBox = await sourceTask.boundingBox();
    expect(sourceBox?.height || 0).toBeGreaterThanOrEqual(44);
  }
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('当前周报有未保存修改');
    await dialog.dismiss();
  });
  await sourceTask.click();
  await expect(page.getByRole('heading', { level: 1, name: '周报生成' })).toBeVisible();
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('打开来源记录会丢失这些修改');
    await dialog.accept();
  });
  await sourceTask.click();
  await expect(page.getByRole('heading', { level: 1, name: '任务管理' })).toBeVisible();
  const detail = page.locator('.business-detail-panel');
  await expect(detail.getByRole('heading', { level: 2 })).toContainText('整理省政府办公厅来文并建立关联');
  await expect(page.locator('.table-row').filter({ hasText: '整理省政府办公厅来文并建立关联' })).toContainText('关联文件 1');

  if (testInfo.project.name === 'mobile') {
    await expect(detail.getByRole('button', { name: '收起右侧记录详情' })).toBeHidden();
  } else {
    const collapse = detail.getByRole('button', { name: '收起右侧记录详情' });
    await collapse.click();
    await expect(page.getByRole('complementary', { name: '记录详情（已收起）' })).toBeVisible();
    await page.getByRole('button', { name: '展开右侧记录详情' }).click();
    await expect(detail.getByRole('heading', { level: 2 })).toContainText('整理省政府办公厅来文并建立关联');
  }

  await page.getByRole('button', { name: '文件收发', exact: true }).click();
  await expect(page.locator('.table-row').filter({ hasText: '关于做好2026年全省重点工作的通知' })).toContainText('关联任务 1');
  expect(unexpectedRequests).toEqual([]);
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('browses the unified local agenda and opens the original business detail', async ({ page }, testInfo) => {
  const unexpectedRequests: string[] = [];
  const pageOrigin = new URL(page.url()).origin;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== pageOrigin) unexpectedRequests.push(request.url());
  });

  await page.getByRole('button', { name: '事务日历' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '事务日历' })).toBeVisible();
  await expect(page.locator('.agenda-day-button')).toHaveCount(42);
  await expect(page.getByRole('button', { name: '上一个月' })).toBeVisible();
  await expect(page.getByRole('button', { name: '下一个月' })).toBeVisible();
  await expect(page.getByRole('button', { name: '回到今天' })).toBeVisible();

  const openJuly2026 = async () => {
    const monthLabel = page.locator('.agenda-month-control strong');
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const label = (await monthLabel.innerText()).replace(/\s+/g, '');
      const match = label.match(/^(\d{4})年(\d{1,2})月$/);
      if (!match) throw new Error(`无法识别日历月份：${label}`);
      const current = Number(match[1]) * 12 + Number(match[2]);
      const target = 2026 * 12 + 7;
      if (current === target) return;
      await page.getByRole('button', { name: current > target ? '上一个月' : '下一个月' }).click();
    }
    throw new Error('无法在 24 次切换内打开 2026 年 7 月');
  };
  await openJuly2026();

  const july24 = page.getByRole('button', { name: /2026年7月24日，3 条事项/ });
  await july24.click();
  await expect(july24).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('全省重点工作协调推进会', { exact: true })).toBeVisible();
  await expect(page.getByText('省直单位工作联系函', { exact: true })).toBeVisible();
  await expect(page.getByText('A4 打印纸', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '只看会议' }).click();
  await expect(page.getByText('显示 1 / 7 条事项')).toBeVisible();
  await expect(page.getByText('省直单位工作联系函', { exact: true })).toHaveCount(0);
  const meetingAgendaItem = page.getByRole('button', { name: /打开会议记录：全省重点工作协调推进会/ });
  await meetingAgendaItem.click();
  await expect(page.getByRole('heading', { level: 1, name: '会议管理' })).toBeVisible();
  await expect(page.locator('.business-detail-panel').getByRole('heading', { level: 2 })).toContainText('全省重点工作协调推进会');

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: '事务日历' }).click();
    await openJuly2026();
    const dayBox = await page.locator('.agenda-day-button').first().boundingBox();
    expect(dayBox?.height || 0).toBeGreaterThanOrEqual(44);
    await page.getByRole('button', { name: /2026年7月24日，3 条事项/ }).click();
    const itemBox = await page.getByRole('button', { name: /打开会议记录：全省重点工作协调推进会/ }).boundingBox();
    expect(itemBox?.height || 0).toBeGreaterThanOrEqual(44);
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  }

  expect(unexpectedRequests).toEqual([]);
});

test('opens local global search from the keyboard and finds navigation and business records', async ({ page }, testInfo) => {
  const unexpectedRequests: string[] = [];
  const pageOrigin = new URL(page.url()).origin;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== pageOrigin) unexpectedRequests.push(request.url());
  });

  const trigger = page.getByRole('button', { name: '打开全局查找' });
  await expect(trigger).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    const box = await trigger.boundingBox();
    expect(box?.width || 0).toBeGreaterThanOrEqual(44);
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);
  }

  await trigger.focus();
  await page.keyboard.press('Control+K');
  let dialog = page.getByRole('dialog', { name: '全局查找' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.global-search-group').filter({ hasText: '导航模块' }).locator('.global-search-item')).toHaveCount(17);
  let searchInput = dialog.getByRole('combobox', { name: '全局查找' });
  await searchInput.fill('事务日历');
  await expect(dialog.getByText('导航模块', { exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: '事务日历' })).toBeVisible();

  await trigger.click();
  dialog = page.getByRole('dialog', { name: '全局查找' });
  searchInput = dialog.getByRole('combobox', { name: '全局查找' });
  await searchInput.fill('整理省政府办公厅来文并建立关联');
  await expect(dialog.getByText('任务记录')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.locator('.business-detail-panel').getByRole('heading', { level: 2 })).toContainText('整理省政府办公厅来文并建立关联');

  await trigger.click();
  dialog = page.getByRole('dialog', { name: '全局查找' });
  searchInput = dialog.getByRole('combobox', { name: '全局查找' });
  await searchInput.fill('完全不存在的导航与业务记录');
  await expect(dialog.getByText('没有找到匹配项')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.getByRole('button', { name: '任务管理' }).click();
  await page.getByRole('button', { name: '新建任务' }).click();
  const taskDialog = page.getByRole('dialog', { name: '新建任务' });
  await expect(taskDialog).toBeVisible();
  await expect(trigger).toBeDisabled();
  await page.keyboard.press('Control+K');
  await expect(page.getByRole('dialog', { name: '全局查找' })).toBeHidden();
  await taskDialog.getByLabel('任务名称').fill('全局查找索引边界任务');
  await taskDialog.getByLabel('备注').fill('SEARCH_SECRET_MARKER 不应进入全局查找');
  await taskDialog.getByRole('button', { name: '保存任务' }).click();
  await expect(taskDialog).toBeHidden();

  await trigger.click();
  dialog = page.getByRole('dialog', { name: '全局查找' });
  searchInput = dialog.getByRole('combobox', { name: '全局查找' });
  await searchInput.fill('SEARCH_SECRET_MARKER');
  await expect(dialog.getByText('没有找到匹配项')).toBeVisible();
  await page.keyboard.press('Escape');

  expect(unexpectedRequests).toEqual([]);
});

test('opens all six original guarded editors from quick-create commands without saving records', async ({ page }, testInfo) => {
  test.slow();
  const actionRequests: string[] = [];
  const recordActionRequest = (request: { url: () => string }) => actionRequests.push(request.url());
  page.on('request', recordActionRequest);

  const trigger = page.getByRole('button', { name: '打开全局查找' });
  const groupLabels = ['任务记录', '会议记录', '文件记录', '外出记录', '用章记录', '物资记录'];
  const commands = [
    { query: '新建任务', dialog: '新建任务', tab: 'tasks', focusLabel: '任务名称' },
    { query: '新建会议', dialog: '新建会议', tab: 'meetings', focusLabel: '会议主题' },
    { query: '登记文件', dialog: '登记文件', tab: 'documents', focusLabel: '文件标题' },
    { query: '新建外出活动', dialog: '新建外出活动', tab: 'researches', focusLabel: '活动日期' },
    { query: '新建用章记录', dialog: '新建用章记录', tab: 'seals', focusLabel: '用章日期' },
    { query: '新建物资记录', dialog: '新建物资记录', tab: 'materials', focusLabel: '物资名称' }
  ];
  const countSearchGroups = async () => {
    await trigger.click();
    const search = page.getByRole('dialog', { name: '全局查找' });
    await expect(search).toBeVisible();
    const counts: number[] = [];
    for (const label of groupLabels) counts.push(await search.locator('.global-search-group').filter({ hasText: label }).locator('.global-search-item').count());
    await page.keyboard.press('Escape');
    await expect(search).toBeHidden();
    await expect(trigger).toBeFocused();
    return counts;
  };
  const countsBefore = await countSearchGroups();

  await trigger.click();
  const keyboardSearch = page.getByRole('dialog', { name: '全局查找' });
  await keyboardSearch.getByRole('combobox', { name: '全局查找' }).fill('快速新建');
  const taskAction = keyboardSearch.locator('.global-search-item').filter({ hasText: '新建任务' });
  const meetingAction = keyboardSearch.locator('.global-search-item').filter({ hasText: '新建会议' });
  await expect(taskAction).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(meetingAction).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('Enter');
  const keyboardMeetingEditor = page.getByRole('dialog', { name: '新建会议' });
  await expect(keyboardMeetingEditor.getByLabel('会议主题', { exact: true })).toBeFocused();
  await keyboardMeetingEditor.getByTitle('关闭').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(keyboardMeetingEditor.getByRole('button', { name: '保存会议' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(keyboardMeetingEditor.getByTitle('关闭')).toBeFocused();
  await keyboardMeetingEditor.getByTitle('关闭').click();
  await expect(keyboardMeetingEditor).toBeHidden();
  await expect(trigger).toBeFocused();

  for (const [index, command] of commands.entries()) {
    await trigger.click();
    const search = page.getByRole('dialog', { name: '全局查找' });
    await search.getByRole('combobox', { name: '全局查找' }).fill(command.query);
    await expect(search.getByText('快速新建', { exact: true })).toBeVisible();
    const action = search.locator('.global-search-item').filter({ hasText: command.query });
    await expect(action).toHaveCount(1);
    if (testInfo.project.name === 'mobile') {
      const actionBox = await action.boundingBox();
      expect(actionBox?.height || 0).toBeGreaterThanOrEqual(44);
      if (index === 0) {
        const searchBox = await search.boundingBox();
        const navigationBox = await page.locator('.sidebar').boundingBox();
        expect((searchBox?.y || 0) + (searchBox?.height || 0)).toBeLessThanOrEqual(navigationBox?.y || 0);
      }
    }
    await page.keyboard.press('Enter');
    await expect(search).toBeHidden();

    const editor = page.getByRole('dialog', { name: command.dialog });
    await expect(editor).toBeVisible();
    await expect(page.locator('.shell')).toHaveAttribute('data-tab', command.tab);
    await expect(editor.getByLabel(command.focusLabel, { exact: true })).toBeFocused();
    await expect(trigger).toBeDisabled();
    await page.keyboard.press('Control+K');
    await expect(page.getByRole('dialog', { name: '全局查找' })).toBeHidden();

    if (index === 0) {
      await editor.getByLabel('任务名称').fill('命令面板未保存守卫验证');
      page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('未保存修改'); await dialog.dismiss(); });
      await editor.getByTitle('关闭').click();
      await expect(editor).toBeVisible();
      page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('未保存修改'); await dialog.accept(); });
    }
    await editor.getByTitle('关闭').click();
    await expect(editor).toBeHidden();
    await expect(trigger).toBeEnabled();
    await expect(trigger).toBeFocused();
  }

  expect(actionRequests).toEqual([]);
  page.off('request', recordActionRequest);
  await page.reload();
  await page.waitForLoadState('networkidle');
  expect(await countSearchGroups()).toEqual(countsBefore);
  if (testInfo.project.name === 'mobile') expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('keeps recent business records ordered, active-only and session-local in the command palette', async ({ page }, testInfo) => {
  const actionRequests: string[] = [];
  const recordActionRequest = (request: { url: () => string }) => actionRequests.push(request.url());
  page.on('request', recordActionRequest);

  const trigger = page.getByRole('button', { name: '打开全局查找' });
  const recentGroupFor = (dialog: Locator) => dialog.locator('.global-search-group').filter({ hasText: '最近访问' });
  const taskTitle = '整理省政府办公厅来文并建立关联';
  const meetingTitle = '全省重点工作协调推进会';

  await trigger.click();
  let dialog = page.getByRole('dialog', { name: '全局查找' });
  await expect(recentGroupFor(dialog)).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: '会议管理', exact: true }).click();
  await page.locator('.selectable-row').filter({ hasText: meetingTitle }).click();
  await page.getByRole('button', { name: '任务管理', exact: true }).click();
  await page.locator('.selectable-row').filter({ hasText: taskTitle }).click();
  await page.getByRole('button', { name: '会议管理', exact: true }).click();
  await page.locator('.selectable-row').filter({ hasText: meetingTitle }).click();

  await trigger.click();
  dialog = page.getByRole('dialog', { name: '全局查找' });
  let recentGroup = recentGroupFor(dialog);
  await expect(recentGroup.locator('.global-search-item')).toHaveCount(2);
  await expect(recentGroup.locator('.global-search-item').nth(0)).toContainText(meetingTitle);
  await expect(recentGroup.locator('.global-search-item').nth(1)).toContainText(taskTitle);
  if (testInfo.project.name === 'mobile') {
    for (const item of await recentGroup.locator('.global-search-item').all()) {
      const box = await item.boundingBox();
      expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }
    const dialogBox = await dialog.boundingBox();
    const navigationBox = await page.locator('.sidebar').boundingBox();
    expect((dialogBox?.y || 0) + (dialogBox?.height || 0)).toBeLessThanOrEqual(navigationBox?.y || 0);
  }

  const input = dialog.getByRole('combobox', { name: '全局查找' });
  await input.fill(taskTitle);
  await expect(recentGroupFor(dialog)).toHaveCount(0);
  await expect(dialog.locator('.global-search-group').filter({ hasText: '任务记录' }).locator('.global-search-item').filter({ hasText: taskTitle })).toHaveCount(1);
  await input.fill('');
  recentGroup = recentGroupFor(dialog);
  await recentGroup.locator('.global-search-item').filter({ hasText: taskTitle }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.business-detail-panel').getByRole('heading', { level: 2 })).toContainText(taskTitle);

  const taskRow = page.locator('.selectable-row').filter({ hasText: taskTitle });
  page.once('dialog', (confirmation) => confirmation.accept());
  await taskRow.getByTitle('删除任务').click();
  await expect(taskRow).toHaveCount(0);
  await trigger.click();
  dialog = page.getByRole('dialog', { name: '全局查找' });
  await expect(recentGroupFor(dialog).getByText(taskTitle, { exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: '回收站', exact: true }).click();
  page.once('dialog', (confirmation) => confirmation.accept());
  await page.getByRole('button', { name: `恢复任务：${taskTitle}` }).click();
  await trigger.click();
  dialog = page.getByRole('dialog', { name: '全局查找' });
  await expect(recentGroupFor(dialog).getByText(taskTitle, { exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: '任务管理', exact: true }).click();
  await page.locator('.selectable-row').filter({ hasText: taskTitle }).click();
  await trigger.click();
  dialog = page.getByRole('dialog', { name: '全局查找' });
  await expect(recentGroupFor(dialog).locator('.global-search-item').nth(0)).toContainText(taskTitle);
  await page.keyboard.press('Escape');

  expect(actionRequests).toEqual([]);
  page.off('request', recordActionRequest);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await trigger.click();
  dialog = page.getByRole('dialog', { name: '全局查找' });
  await expect(recentGroupFor(dialog)).toHaveCount(0);
  if (testInfo.project.name === 'mobile') expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('persists explicit starred records locally while respecting trash and purge lifecycle', async ({ page }, testInfo) => {
  const actionRequests: string[] = [];
  const pageOrigin = new URL(page.url()).origin;
  const recordActionRequest = (request: { url: () => string }) => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== pageOrigin) actionRequests.push(request.url());
  };
  page.on('request', recordActionRequest);
  const taskTitle = '整理省政府办公厅来文并建立关联';
  const meetingTitle = '全省重点工作协调推进会';
  const starButton = page.getByRole('button', { name: '将此记录加入星标' });

  await page.getByRole('button', { name: '任务管理', exact: true }).click();
  await page.locator('.selectable-row').filter({ hasText: taskTitle }).click();
  await expect(starButton).toHaveAttribute('aria-pressed', 'false');
  await starButton.click();
  await expect(page.getByRole('button', { name: '取消此记录星标' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '会议管理', exact: true }).click();
  await page.locator('.selectable-row').filter({ hasText: meetingTitle }).click();
  await starButton.click();

  await page.getByRole('button', { name: '工作台', exact: true }).click();
  let starredPanel = page.getByRole('region', { name: '星标记录' });
  await expect(starredPanel.getByRole('button')).toHaveCount(2);
  await expect(starredPanel.getByRole('button').nth(0)).toContainText(meetingTitle);
  await expect(starredPanel.getByRole('button').nth(1)).toContainText(taskTitle);
  if (testInfo.project.name === 'mobile') {
    for (const item of await starredPanel.getByRole('button').all()) {
      const box = await item.boundingBox();
      expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }
  }

  await page.getByRole('button', { name: '打开全局查找' }).click();
  let dialog = page.getByRole('dialog', { name: '全局查找' });
  const starredGroupFor = (target: Locator) => target.locator('.global-search-group').filter({ hasText: '星标记录' });
  await expect(starredGroupFor(dialog).locator('.global-search-item')).toHaveCount(2);
  await dialog.getByRole('combobox', { name: '全局查找' }).fill(taskTitle);
  await expect(starredGroupFor(dialog)).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.reload();
  await page.waitForLoadState('networkidle');
  starredPanel = page.getByRole('region', { name: '星标记录' });
  await expect(starredPanel.getByRole('button')).toHaveCount(2);
  await starredPanel.getByRole('button', { name: `打开星标任务：${taskTitle}` }).click();
  await expect(page.getByRole('button', { name: '取消此记录星标' })).toHaveAttribute('aria-pressed', 'true');

  const taskRow = page.locator('.selectable-row').filter({ hasText: taskTitle });
  page.once('dialog', (confirmation) => confirmation.accept());
  await taskRow.getByTitle('删除任务').click();
  await page.getByRole('button', { name: '工作台', exact: true }).click();
  starredPanel = page.getByRole('region', { name: '星标记录' });
  await expect(starredPanel.getByText(taskTitle, { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '回收站', exact: true }).click();
  page.once('dialog', (confirmation) => confirmation.accept());
  await page.getByRole('button', { name: `恢复任务：${taskTitle}` }).click();
  await page.getByRole('button', { name: '工作台', exact: true }).click();
  await expect(page.getByRole('region', { name: '星标记录' }).getByText(taskTitle, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '任务管理', exact: true }).click();
  page.once('dialog', (confirmation) => confirmation.accept());
  await page.locator('.selectable-row').filter({ hasText: taskTitle }).getByTitle('删除任务').click();
  await page.getByRole('button', { name: '回收站', exact: true }).click();
  page.once('dialog', (confirmation) => confirmation.accept());
  await page.getByRole('button', { name: `永久删除任务：${taskTitle}` }).click();
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('region', { name: '星标记录' }).getByText(taskTitle, { exact: true })).toHaveCount(0);

  expect(actionRequests).toEqual([]);
  page.off('request', recordActionRequest);
  if (testInfo.project.name === 'mobile') expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('navigates a bounded session-only business visit history across modules and prunes deleted targets', async ({ page }, testInfo) => {
  const actionRequests: string[] = [];
  const recordActionRequest = (request: { url: () => string }) => actionRequests.push(request.url());
  page.on('request', recordActionRequest);
  const taskTitle = '整理省政府办公厅来文并建立关联';
  const documentTitle = '关于做好2026年全省重点工作的通知';
  const meetingTitle = '全省重点工作协调推进会';

  await page.getByRole('button', { name: '任务管理', exact: true }).click();
  await page.locator('.selectable-row').filter({ hasText: taskTitle }).click();
  const visitHistory = page.getByRole('group', { name: '跨模块访问历史' });
  await expect(visitHistory.getByRole('button', { name: '没有可返回的访问记录' })).toBeDisabled();
  await expect(visitHistory.getByRole('button', { name: '没有可前进的访问记录' })).toBeDisabled();

  await page.getByRole('button', { name: `打开关联文件：${documentTitle}` }).click();
  const detailHeading = page.locator('.business-detail-panel').getByRole('heading', { level: 2 });
  await expect(detailHeading).toContainText(documentTitle);
  await visitHistory.getByRole('button', { name: `返回上一条访问记录：${taskTitle}（任务管理）` }).click();
  await expect(detailHeading).toContainText(taskTitle);
  await visitHistory.getByRole('button', { name: `前进到下一条访问记录：${documentTitle}（文件收发）` }).click();
  await expect(detailHeading).toContainText(documentTitle);

  await visitHistory.getByRole('button', { name: `返回上一条访问记录：${taskTitle}（任务管理）` }).click();
  await page.getByRole('button', { name: '会议管理', exact: true }).click();
  await page.locator('.selectable-row').filter({ hasText: meetingTitle }).click();
  await expect(visitHistory.getByRole('button', { name: '没有可前进的访问记录' })).toBeDisabled();
  await expect(visitHistory.getByRole('button', { name: `返回上一条访问记录：${taskTitle}（任务管理）` })).toBeEnabled();

  await page.getByRole('button', { name: '任务管理', exact: true }).click();
  const taskRow = page.locator('.selectable-row').filter({ hasText: taskTitle });
  const deleteDialog = page.waitForEvent('dialog');
  const deleteAction = taskRow.getByTitle('删除任务').click();
  await (await deleteDialog).accept();
  await deleteAction;
  await page.getByRole('button', { name: '会议管理', exact: true }).click();
  await expect(visitHistory.getByRole('button', { name: '没有可返回的访问记录' })).toBeDisabled();

  await page.getByRole('button', { name: '回收站', exact: true }).click();
  const restoreDialog = page.waitForEvent('dialog');
  const restoreAction = page.getByRole('button', { name: `恢复任务：${taskTitle}` }).click();
  await (await restoreDialog).accept();
  await restoreAction;
  await page.getByRole('button', { name: '会议管理', exact: true }).click();
  await expect(visitHistory.getByRole('button', { name: '没有可返回的访问记录' })).toBeDisabled();

  if (testInfo.project.name === 'mobile') {
    for (const button of await visitHistory.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box?.width || 0).toBeGreaterThanOrEqual(44);
      expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  }

  page.off('request', recordActionRequest);
  expect(actionRequests).toEqual([]);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: '会议管理', exact: true }).click();
  await expect(page.getByRole('group', { name: '跨模块访问历史' }).getByRole('button', { name: '没有可返回的访问记录' })).toBeDisabled();
});

test('opens the nearest surviving record when the current visit target is deleted', async ({ page }, testInfo) => {
  const actionRequests: string[] = [];
  page.on('request', (request) => actionRequests.push(request.url()));
  const taskTitle = '整理省政府办公厅来文并建立关联';
  const documentTitle = '关于做好2026年全省重点工作的通知';
  const meetingTitle = '全省重点工作协调推进会';

  await page.getByRole('button', { name: '任务管理', exact: true }).click();
  await page.locator('.selectable-row').filter({ hasText: taskTitle }).click();
  await page.getByRole('button', { name: `打开关联文件：${documentTitle}` }).click();
  const detailHeading = page.locator('.business-detail-panel').getByRole('heading', { level: 2 });
  await page.getByRole('group', { name: '跨模块访问历史' }).getByRole('button', { name: `返回上一条访问记录：${taskTitle}（任务管理）` }).click();
  await page.getByRole('button', { name: '会议管理', exact: true }).click();
  await page.locator('.selectable-row').filter({ hasText: meetingTitle }).click();

  const meetingRow = page.locator('.selectable-row').filter({ hasText: meetingTitle });
  const deleteDialog = page.waitForEvent('dialog');
  const deleteAction = meetingRow.getByTitle('删除会议').click();
  await (await deleteDialog).accept();
  await deleteAction;

  await expect(detailHeading).toContainText(taskTitle);
  const visitHistory = page.getByRole('group', { name: '跨模块访问历史' });
  await expect(visitHistory.getByRole('button', { name: '没有可返回的访问记录' })).toBeDisabled();
  await expect(visitHistory.getByRole('button', { name: '没有可前进的访问记录' })).toBeDisabled();
  if (testInfo.project.name === 'mobile') {
    for (const button of await visitHistory.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box?.width || 0).toBeGreaterThanOrEqual(44);
      expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(actionRequests).toEqual([]);
});

test('jumps directly to a session visit entry with keyboard-accessible menu controls', async ({ page }, testInfo) => {
  const actionRequests: string[] = [];
  page.on('request', (request) => actionRequests.push(request.url()));
  const taskTitle = '整理省政府办公厅来文并建立关联';
  const documentTitle = '关于做好2026年全省重点工作的通知';
  const meetingTitle = '全省重点工作协调推进会';

  await page.getByRole('button', { name: '任务管理', exact: true }).click();
  await page.locator('.selectable-row').filter({ hasText: taskTitle }).click();
  await page.getByRole('button', { name: `打开关联文件：${documentTitle}` }).click();
  await page.getByRole('button', { name: '会议管理', exact: true }).click();
  await page.locator('.selectable-row').filter({ hasText: meetingTitle }).click();

  const detailHeading = page.locator('.business-detail-panel').getByRole('heading', { level: 2 });
  const visitHistory = page.getByRole('group', { name: '跨模块访问历史' });
  const menuToggle = visitHistory.getByRole('button', { name: '打开访问轨迹列表' });
  await menuToggle.click();
  const menu = page.getByRole('listbox', { name: '访问轨迹列表' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('option')).toHaveCount(3);
  await expect(menu.locator('.detail-visit-menu-option').filter({ hasText: taskTitle })).toHaveAttribute('aria-selected', 'false');
  await expect(menu.getByRole('option').nth(2)).toBeFocused();

  await menuToggle.press('Escape');
  await expect(menu).toBeHidden();
  await expect(menuToggle).toBeFocused();
  await menuToggle.click();
  await expect(menu.getByRole('option').nth(2)).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(detailHeading).toContainText(documentTitle);
  await expect(menu).toBeHidden();
  await expect(visitHistory.getByRole('button', { name: '打开访问轨迹列表' })).toBeFocused();

  if (testInfo.project.name === 'mobile') {
    const box = await visitHistory.getByRole('button', { name: '打开访问轨迹列表' }).boundingBox();
    expect(box?.width || 0).toBeGreaterThanOrEqual(44);
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(actionRequests).toEqual([]);
});

test('steps through the current filtered and sorted task order from the shared detail navigator', async ({ page }, testInfo) => {
  const actionRequests: string[] = [];
  const recordActionRequest = (request: { url: () => string }) => actionRequests.push(request.url());
  page.on('request', recordActionRequest);

  await page.getByRole('button', { name: '任务管理', exact: true }).click();
  await page.getByLabel('任务管理排序').selectOption('deadline:desc');
  const rows = page.locator('.selectable-row');
  await expect(rows).toHaveCount(2);
  const orderedTitles = await rows.locator('.row-title strong').allInnerTexts();
  const detail = page.locator('.business-detail-panel');
  const position = detail.locator('.detail-record-position');
  const previous = detail.locator('.detail-record-step-previous');
  const next = detail.locator('.detail-record-step-next');

  await expect(detail.getByRole('heading', { level: 2 })).toContainText(orderedTitles[0]);
  await expect(position).toContainText('1 / 2');
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  await expect(next).toHaveAttribute('aria-label', `查看下一条可见记录：${orderedTitles[1]}`);
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(detail.getByRole('heading', { level: 2 })).toContainText(orderedTitles[1]);
  await expect(position).toContainText('2 / 2');
  await expect(rows.nth(1)).toHaveClass(/selected/);
  await expect(previous).toBeEnabled();
  await expect(next).toBeDisabled();

  await page.getByRole('button', { name: '打开全局查找' }).click();
  let dialog = page.getByRole('dialog', { name: '全局查找' });
  const recentGroup = dialog.locator('.global-search-group').filter({ hasText: '最近访问' });
  await expect(recentGroup.locator('.global-search-item').nth(0)).toContainText(orderedTitles[1]);
  await page.keyboard.press('Escape');

  await previous.click();
  await expect(detail.getByRole('heading', { level: 2 })).toContainText(orderedTitles[0]);
  await expect(position).toContainText('1 / 2');
  await expect(previous).toBeDisabled();

  await page.getByLabel('任务管理筛选').selectOption('status:progress');
  await expect(rows).toHaveCount(1);
  await expect(position).toContainText('1 / 1');
  await expect(previous).toBeDisabled();
  await expect(next).toBeDisabled();

  for (const ledger of ['会议管理', '文件收发', '外出活动', '用章管理', '物资收发']) {
    await page.getByRole('button', { name: ledger, exact: true }).click();
    await expect(detail).toBeVisible();
    await expect(position).toContainText('1 / 1');
    await expect(previous).toBeDisabled();
    await expect(next).toBeDisabled();
  }

  if (testInfo.project.name === 'mobile') {
    for (const button of [previous, next]) {
      const box = await button.boundingBox();
      expect(box?.width || 0).toBeGreaterThanOrEqual(44);
      expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }
    const mainBox = await page.locator('.main-area').boundingBox();
    const navigationBox = await page.locator('.sidebar').boundingBox();
    expect((mainBox?.y || 0) + (mainBox?.height || 0)).toBeLessThanOrEqual(navigationBox?.y || 0);
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  }

  expect(actionRequests).toEqual([]);
  page.off('request', recordActionRequest);
});

test('captures a task globally with deterministic preview and the original guarded editor', async ({ page }, testInfo) => {
  const actionRequests: string[] = [];
  page.on('request', (request) => actionRequests.push(request.url()));
  const trigger = page.locator('.quick-capture-trigger');

  await expect(trigger).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    const triggerBox = await trigger.boundingBox();
    expect(triggerBox?.width || 0).toBeGreaterThanOrEqual(44);
    expect(triggerBox?.height || 0).toBeGreaterThanOrEqual(44);
  }

  await trigger.focus();
  await trigger.click();
  let capture = page.getByRole('dialog', { name: '快速记录任务' });
  await expect(capture).toBeVisible();
  await expect(capture.getByLabel('快速记录文字')).toBeFocused();
  await capture.getByLabel('快速记录文字').fill('任务：完成年度物资盘点\n交办人：综合科\n微信通知，截止 2026-08-05');
  await expect(capture.getByText('完成年度物资盘点', { exact: true })).toBeVisible();
  await expect(capture.getByText('综合科', { exact: true })).toBeVisible();
  await expect(capture.getByText('2026-08-05', { exact: true })).toBeVisible();
  await expect(capture.getByText('微信', { exact: true })).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    for (const action of await capture.locator('.quick-capture-action').all()) {
      const box = await action.boundingBox();
      expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }
    const captureBox = await capture.boundingBox();
    const navigationBox = await page.locator('.sidebar').boundingBox();
    expect((captureBox?.y || 0) + (captureBox?.height || 0)).toBeLessThanOrEqual(navigationBox?.y || 0);
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(capture).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.getByRole('button', { name: '任务管理' }).click();
  const ledgerSearch = page.getByPlaceholder('搜索任务、类目或交办人');
  await ledgerSearch.focus();
  await page.keyboard.press('Shift+A');
  await expect(page.getByRole('dialog', { name: '快速记录任务' })).toBeHidden();
  await ledgerSearch.fill('');

  await page.keyboard.press('Control+K');
  const globalSearch = page.getByRole('dialog', { name: '全局查找' });
  await expect(globalSearch).toBeVisible();
  await expect(trigger).toBeDisabled();
  await page.keyboard.press('Shift+A');
  await expect(page.getByRole('dialog', { name: '快速记录任务' })).toBeHidden();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: '工作台' }).click();
  await page.locator('.hero-action').click();
  capture = page.getByRole('dialog', { name: '快速记录任务' });
  await capture.getByLabel('快速记录文字').fill('abc');
  await expect(capture.getByText('暂未识别出结构化字段')).toBeVisible();
  await capture.getByRole('button', { name: '继续核对' }).click();
  let taskEditor = page.getByRole('dialog', { name: '新建任务' });
  await expect(taskEditor).toBeVisible();
  await expect(taskEditor.getByLabel('待识别文字')).toHaveValue('abc');
  await expect(taskEditor.getByLabel('任务名称')).toHaveValue('');
  await expect(taskEditor.getByText('未保存修改')).toBeVisible();
  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('未保存修改'); await dialog.dismiss(); });
  await taskEditor.getByTitle('关闭').click();
  await expect(taskEditor).toBeVisible();
  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('未保存修改'); await dialog.accept(); });
  await taskEditor.getByTitle('关闭').click();
  await expect(taskEditor).toBeHidden();

  await page.keyboard.press('Shift+A');
  capture = page.getByRole('dialog', { name: '快速记录任务' });
  const sourceText = '任务：完成年度物资盘点\n交办人：综合科\n微信通知，截止 2026-08-05';
  await capture.getByLabel('快速记录文字').fill(sourceText);
  await capture.getByRole('button', { name: '继续核对' }).click();
  taskEditor = page.getByRole('dialog', { name: '新建任务' });
  await expect(taskEditor.getByLabel('待识别文字')).toHaveValue(sourceText);
  await expect(taskEditor.getByLabel('任务名称')).toHaveValue('完成年度物资盘点');
  await expect(taskEditor.getByLabel('交办人', { exact: true })).toHaveValue('综合科');
  await expect(taskEditor.getByLabel('截止日期')).toHaveValue('2026-08-05');
  await expect(taskEditor.getByLabel('任务来源')).toHaveValue('微信');
  await expect(taskEditor.getByRole('button', { name: '保存任务' })).toBeVisible();
  await expect(trigger).toBeDisabled();
  await taskEditor.getByRole('button', { name: '保存任务' }).click();
  await expect(taskEditor).toBeHidden();
  await page.getByRole('button', { name: '任务管理' }).click();
  await expect(page.locator('.table-row').filter({ hasText: '完成年度物资盘点' })).toBeVisible();
  expect(actionRequests).toEqual([]);
});

test('lists every desktop edition and architecture with versioned release links', async ({ page }) => {
  await page.getByRole('button', { name: '关于与设置' }).click();
  await expect(page.getByText(`HxHwang Gw · v${appVersion}`)).toBeVisible();
  const downloadLinks = page.locator('.download-grid a');
  const releaseBase = `https://github.com/NextWeb4/gw/releases/download/v${appVersion}`;
  const expectedFiles = (edition: 'internet' | 'intranet') => [
    `HxHwang-Gw-${appVersion}-${edition}-x64-setup.exe`,
    `HxHwang-Gw-${appVersion}-${edition}-arm64-setup.exe`,
    `HxHwang-Gw-${appVersion}-${edition}-amd64.deb`,
    `HxHwang-Gw-${appVersion}-${edition}-arm64.deb`,
    `HxHwang-Gw-${appVersion}-${edition}-x86_64.AppImage`,
    `HxHwang-Gw-${appVersion}-${edition}-arm64.AppImage`,
  ];
  const expectEdition = async (edition: 'internet' | 'intranet') => {
    await expect(downloadLinks).toHaveCount(6);
    await expect.poll(() => downloadLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))))
      .toEqual(expectedFiles(edition).map((file) => `${releaseBase}/${file}`));
  };

  await expectEdition('internet');
  await page.getByRole('button', { name: '内网版', exact: true }).click();
  await expectEdition('intranet');
  await expect(page.getByRole('link', { name: '校验文件' })).toHaveAttribute('href', `${releaseBase}/SHA256SUMS.txt`);
  await expect(page.getByText(/安装包从空业务库启动/)).toBeVisible();
});

test('reopens the cached demonstration while the browser is offline', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One production service-worker check is sufficient.');
  await page.evaluate(async () => { if (navigator.serviceWorker) await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByText('推进全省基层治理年度工作总结')).toBeVisible();
    await expect(page.getByText('用户 Key 仅保留在当前会话')).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test('creates, persists, edits and deletes an editable task', async ({ page }) => {
  const originalName = '端到端测试任务';
  const updatedName = '端到端测试任务（已更新）';

  await page.addInitScript(() => {
    Object.defineProperty(window, 'hxhwang', { configurable: true, value: { printPdf: async () => true } });
  });
  await page.reload();

  await page.getByRole('button', { name: '任务管理' }).click();
  await page.getByRole('button', { name: '新建任务' }).click();
  await page.getByLabel('任务名称').fill(originalName);
  await expect(page.getByLabel('状态').locator('option')).toHaveText(['未启动', '进行中', '已完成', '已超期']);
  await page.getByLabel('交办人', { exact: true }).fill('测试交办人');
  await page.getByLabel('截止日期').fill('2026-07-31');
  await page.getByRole('button', { name: '添加配合单位' }).click();
  await page.getByLabel('配合单位名称 1').fill('综合协调单位');
  await page.getByLabel('配合单位状态 1').selectOption('progress');
  await page.getByRole('button', { name: '添加阶段' }).click();
  await page.getByLabel('阶段名称 1').fill('材料汇总');
  await page.getByRole('button', { name: '添加阶段 1 配合单位' }).click();
  await page.getByLabel('阶段 1 配合单位名称 1').fill('数据提供单位');
  await page.getByRole('button', { name: '一键生成小结' }).click();
  await expect(page.getByLabel('工作小结')).toHaveValue(/当前状态为未启动/);
  await expect(page.getByLabel('工作小结')).toHaveValue(/综合协调单位/);
  await page.locator('.attachment-picker input[type="file"]').setInputFiles({ name: '测试佐证.txt', mimeType: 'text/plain', buffer: Buffer.from('local evidence') });
  await expect(page.getByText('测试佐证.txt')).toBeVisible();
  await page.getByRole('button', { name: '保存任务' }).click();
  await expect(page.getByText(originalName, { exact: true })).toBeVisible();
  await expect(page.locator('.table-row').filter({ hasText: originalName })).toContainText('附件 1');
  await page.getByPlaceholder('搜索任务、类目或交办人').fill('测试交办人');
  await expect(page.locator('.table-row').filter({ hasText: originalName })).toBeVisible();
  await page.getByPlaceholder('搜索任务、类目或交办人').fill('');

  await page.getByRole('button', { name: '新建任务' }).click();
  const assignerList = await page.getByLabel('交办人', { exact: true }).getAttribute('list');
  expect(assignerList).toBeTruthy();
  await expect(page.locator(`#${assignerList} option[value="测试交办人"]`)).toHaveCount(1);
  await page.getByRole('button', { name: '添加配合单位' }).click();
  const unitList = await page.getByLabel('配合单位名称 1').getAttribute('list');
  expect(unitList).toBeTruthy();
  await expect(page.locator(`#${unitList} option[value="综合协调单位"]`)).toHaveCount(1);
  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('未保存修改'); await dialog.accept(); });
  await page.getByTitle('关闭').click();

  await page.getByRole('button', { name: '文件收发' }).click();
  await page.getByRole('button', { name: '登记文件' }).click();
  const handlerList = await page.getByLabel('承办人', { exact: true }).getAttribute('list');
  expect(handlerList).toBeTruthy();
  await expect(page.locator(`#${handlerList} option[value="测试交办人"]`)).toHaveCount(1);
  await page.getByTitle('关闭').click();

  await page.reload();
  await page.getByRole('button', { name: '任务管理' }).click();
  const taskRow = page.locator('.table-row').filter({ hasText: originalName });
  await expect(taskRow).toBeVisible();
  await taskRow.getByTitle('编辑任务').click();
  await expect(page.getByLabel('配合单位名称 1', { exact: true })).toHaveValue('综合协调单位');
  await expect(page.getByLabel('配合单位状态 1', { exact: true })).toHaveValue('progress');
  await expect(page.getByLabel('阶段名称 1')).toHaveValue('材料汇总');
  await expect(page.getByLabel('阶段 1 配合单位名称 1')).toHaveValue('数据提供单位');
  const attachmentDownload = page.waitForEvent('download');
  await page.getByTitle('下载附件 测试佐证.txt').click();
  expect((await attachmentDownload).suggestedFilename()).toBe('测试佐证.txt');
  await page.getByTitle('解除关联 测试佐证.txt').click();
  await page.getByLabel('任务名称').fill(updatedName);
  await page.getByRole('button', { name: '保存任务' }).click();
  await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
  await expect(page.locator('.table-row').filter({ hasText: updatedName })).toContainText('附件 0');

  await page.getByRole('button', { name: '数据迁移' }).click();
  const detachedSnapshot = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出快照' }).click();
  const detachedSnapshotPath = await (await detachedSnapshot).path();
  if (!detachedSnapshotPath) throw new Error('解除附件后的快照路径不可用');
  expect(readFileSync(detachedSnapshotPath, 'utf8')).not.toContain('测试佐证.txt');

  await page.getByRole('button', { name: '任务管理' }).click();
  let updatedTaskRow = page.locator('.table-row').filter({ hasText: updatedName });
  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('移入回收站'); await dialog.dismiss(); });
  await updatedTaskRow.getByTitle('删除任务').click();
  await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('移入回收站'); await dialog.accept(); });
  updatedTaskRow = page.locator('.table-row').filter({ hasText: updatedName });
  await updatedTaskRow.getByTitle('删除任务').click();
  await expect(page.getByText(updatedName, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '回收站' }).click();
  await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('永久删除'); await dialog.accept(); });
  await page.getByRole('button', { name: `永久删除任务：${updatedName}` }).click();
  await expect(page.getByText(updatedName, { exact: true })).toHaveCount(0);
});

test('guards unsaved business drawer changes before closing or unloading', async ({ page }) => {
  const unsavedName = '尚未保存的抽屉任务';
  const closeFromBackdrop = async () => {
    const backdrop = page.locator('.drawer-backdrop');
    if ((page.viewportSize()?.width ?? 0) > 800) await backdrop.click({ position: { x: 6, y: 6 } });
    else await backdrop.dispatchEvent('mousedown');
  };
  await page.getByRole('button', { name: '任务管理' }).click();

  await page.getByRole('button', { name: '新建任务' }).click();
  await page.getByTitle('关闭').click();
  await expect(page.getByRole('dialog', { name: '新建任务' })).toHaveCount(0);

  await page.getByRole('button', { name: '新建任务' }).click();
  await page.evaluate(() => {
    const subtle = crypto.subtle;
    const originalDigest = subtle.digest.bind(subtle);
    let releaseDigest = () => undefined;
    const gate = new Promise<void>((resolve) => { releaseDigest = resolve; });
    (window as Window & { __releaseAttachmentDigest?: () => void }).__releaseAttachmentDigest = releaseDigest;
    Object.defineProperty(subtle, 'digest', {
      configurable: true,
      value: async (...args: Parameters<SubtleCrypto['digest']>) => {
        await gate;
        Object.defineProperty(subtle, 'digest', { configurable: true, value: originalDigest });
        return originalDigest(...args);
      }
    });
  });
  await page.locator('.attachment-picker input[type="file"]').setInputFiles({ name: '处理中附件.txt', mimeType: 'text/plain', buffer: Buffer.from('pending digest') });
  await expect(page.getByText('未保存修改')).toBeVisible();
  await expect(page.getByRole('button', { name: '正在处理附件' })).toBeDisabled();
  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('暂存附件'); await dialog.accept(); });
  await closeFromBackdrop();
  await expect(page.getByRole('dialog', { name: '新建任务' })).toHaveCount(0);
  await page.evaluate(() => (window as Window & { __releaseAttachmentDigest?: () => void }).__releaseAttachmentDigest?.());
  await page.waitForTimeout(100);
  await expect(page.getByRole('dialog', { name: '新建任务' })).toHaveCount(0);

  await page.getByRole('button', { name: '新建任务' }).click();
  await expect(page.getByText('处理中附件.txt')).toHaveCount(0);
  await page.getByLabel('任务名称').fill(unsavedName);
  await page.locator('.attachment-picker input[type="file"]').setInputFiles({ name: '未保存附件.txt', mimeType: 'text/plain', buffer: Buffer.from('pending attachment') });
  await expect(page.getByText('未保存修改')).toBeVisible();
  const beforeUnload = await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    return { dispatchResult: window.dispatchEvent(event), defaultPrevented: event.defaultPrevented };
  });
  expect(beforeUnload).toEqual({ dispatchResult: false, defaultPrevented: true });

  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('未保存修改'); await dialog.dismiss(); });
  await page.getByTitle('关闭').click();
  await expect(page.getByRole('dialog', { name: '新建任务' })).toBeVisible();
  await expect(page.getByLabel('任务名称')).toHaveValue(unsavedName);

  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('未保存修改'); await dialog.dismiss(); });
  await closeFromBackdrop();
  await expect(page.getByRole('dialog', { name: '新建任务' })).toBeVisible();
  await expect(page.getByLabel('任务名称')).toHaveValue(unsavedName);

  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('暂存附件'); await dialog.accept(); });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '新建任务' })).toHaveCount(0);
  await expect(page.getByText(unsavedName, { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '新建任务' }).click();
  await expect(page.getByText('未保存附件.txt')).toHaveCount(0);
  await page.getByTitle('关闭').click();
});

test('creates, searches, edits and deletes a file record', async ({ page }) => {
  const title = '端到端测试来文';
  await page.getByRole('button', { name: '文件收发' }).click();
  await page.getByRole('button', { name: '登记文件' }).click();
  await page.getByLabel('文件标题').fill(title);
  await page.getByLabel('发文字号').fill('端测〔2026〕1号');
  await page.getByLabel('来源单位', { exact: true }).fill('端到端来源单位');
  await page.getByLabel('承办人', { exact: true }).fill('端到端承办人');
  await page.getByRole('button', { name: '保存文件' }).click();
  await page.getByPlaceholder('搜索标题、文号或来源单位').fill('端测〔2026〕1号');
  let fileRow = page.locator('.table-row').filter({ hasText: title });
  await expect(fileRow).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: '文件收发' }).click();
  fileRow = page.locator('.table-row').filter({ hasText: title });
  await fileRow.getByTitle('编辑文件').click();
  await page.getByLabel('登记状态').selectOption('已登记');
  await page.getByLabel('发送范围').fill('端到端测试范围');
  await page.getByRole('button', { name: '保存文件' }).click();
  fileRow = page.locator('.table-row').filter({ hasText: title });
  await expect(fileRow).toContainText('已登记');
  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await fileRow.getByTitle('删除文件').click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
});

test('creates and persists meeting, research, seal and material records', async ({ page }) => {
  test.setTimeout(60_000);
  await page.getByRole('button', { name: '会议管理' }).click();
  await page.getByRole('button', { name: '新建会议' }).click();
  await page.getByLabel('会议主题').fill('端到端业务调度会');
  await page.getByLabel('会议时间').fill('2026-07-25T09:30');
  await page.getByLabel('会议地点').fill('第一会议室');
  await page.locator('.attachment-picker input[type="file"]').setInputFiles({ name: '会议议程.txt', mimeType: 'text/plain', buffer: Buffer.from('agenda') });
  await page.getByRole('button', { name: '保存会议' }).click();
  await expect(page.getByText('端到端业务调度会', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '外出活动' }).click();
  await page.getByRole('button', { name: '新建外出活动' }).click();
  await page.getByLabel('活动主题').fill('端到端基层调研');
  await page.getByLabel('活动类型').selectOption('外出调研');
  await page.getByLabel('参与人员', { exact: true }).fill('甲同志、乙同志');
  await page.getByLabel('成果记录').fill('形成测试问题清单');
  await page.getByRole('button', { name: '保存活动' }).click();
  await expect(page.getByText('端到端基层调研', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '用章管理' }).click();
  await page.getByRole('button', { name: '新建用章记录' }).click();
  await page.getByLabel('用章人', { exact: true }).fill('测试经办人');
  await page.getByLabel('审批人', { exact: true }).fill('测试审批人');
  await page.getByLabel('所盖文件名称').fill('端到端测试函');
  await page.getByLabel('文件类型').selectOption('函');
  await page.getByRole('button', { name: '保存用章' }).click();
  await expect(page.getByText('端到端测试函', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '物资收发' }).click();
  await page.getByRole('button', { name: '新建物资记录' }).click();
  await page.getByLabel('物资名称').fill('A4 打印纸');
  await page.getByLabel('规格').fill('70g / 500 张');
  await page.getByLabel('数量').fill('2');
  await page.getByLabel('收发类型').selectOption('out');
  await page.getByLabel('经手人', { exact: true }).fill('测试经办人');
  await page.getByRole('button', { name: '保存物资' }).click();
  const materialRow = page.locator('.table-row').filter({ hasText: 'A4 打印纸' }).filter({ hasText: '领用 2' });
  await expect(materialRow).toBeVisible();
  await expect(materialRow.locator('.stock-balance')).toHaveText('3');

  await page.reload();
  await page.getByRole('button', { name: '会议管理' }).click();
  await page.getByPlaceholder('搜索主题、对象、人员或地点').fill('端到端业务调度会');
  let persistedMeeting = page.locator('.table-row').filter({ hasText: '端到端业务调度会' });
  await expect(persistedMeeting).toBeVisible();
  await persistedMeeting.getByTitle('编辑会议').click();
  await page.getByLabel('会议地点').fill('第二会议室');
  await page.getByRole('button', { name: '保存会议' }).click();
  persistedMeeting = page.locator('.table-row').filter({ hasText: '端到端业务调度会' });
  await expect(persistedMeeting).toContainText('第二会议室');

  await page.getByRole('button', { name: '外出活动' }).click();
  await page.getByPlaceholder('搜索主题、类型、人员、地点或摘要').fill('甲同志');
  let persistedResearch = page.locator('.table-row').filter({ hasText: '端到端基层调研' });
  await expect(persistedResearch).toBeVisible();
  await persistedResearch.getByTitle('编辑外出活动').click();
  await page.getByLabel('成果记录').fill('形成测试问题清单（更新）');
  await page.getByRole('button', { name: '保存活动' }).click();
  persistedResearch = page.locator('.table-row').filter({ hasText: '端到端基层调研' });
  await expect(persistedResearch).toContainText('形成测试问题清单（更新）');

  await page.getByRole('button', { name: '用章管理' }).click();
  await page.getByPlaceholder('搜索文件、用章人、审批人或类型').fill('测试审批人');
  let persistedSeal = page.locator('.table-row').filter({ hasText: '端到端测试函' });
  await expect(persistedSeal).toBeVisible();
  await persistedSeal.getByTitle('编辑用章记录').click();
  await page.getByLabel('备注说明').fill('已完成端到端复核');
  await page.getByRole('button', { name: '保存用章' }).click();
  persistedSeal = page.locator('.table-row').filter({ hasText: '端到端测试函' });
  await expect(persistedSeal).toContainText('已完成端到端复核');

  await page.getByRole('button', { name: '物资收发' }).click();
  await page.getByPlaceholder('搜索物资、规格、经手人或单位').fill('70g / 500 张');
  let persistedMaterial = page.locator('.table-row').filter({ hasText: 'A4 打印纸' }).filter({ hasText: '领用 2' });
  await expect(persistedMaterial).toBeVisible();
  await persistedMaterial.getByTitle('编辑物资记录').click();
  await page.getByLabel('数量').fill('1');
  await page.getByRole('button', { name: '保存物资' }).click();
  persistedMaterial = page.locator('.table-row').filter({ hasText: 'A4 打印纸' }).filter({ hasText: '领用 1' });
  await expect(persistedMaterial.locator('.stock-balance')).toHaveText('4');
  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await persistedMaterial.getByTitle('删除物资记录').click();
  await expect(page.locator('.table-row').filter({ hasText: '领用 1' })).toHaveCount(0);

  await page.getByRole('button', { name: '用章管理' }).click();
  persistedSeal = page.locator('.table-row').filter({ hasText: '端到端测试函' });
  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await persistedSeal.getByTitle('删除用章记录').click();
  await expect(page.getByText('端到端测试函', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '外出活动' }).click();
  persistedResearch = page.locator('.table-row').filter({ hasText: '端到端基层调研' });
  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await persistedResearch.getByTitle('删除外出活动').click();
  await expect(page.getByText('端到端基层调研', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '会议管理' }).click();
  persistedMeeting = page.locator('.table-row').filter({ hasText: '端到端业务调度会' });
  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await persistedMeeting.getByTitle('删除会议').click();
  await expect(page.getByText('端到端业务调度会', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '回收站' }).click();
  await expect(page.getByText('端到端业务调度会', { exact: true })).toBeVisible();
  const trashedAttachmentDownload = page.waitForEvent('download');
  await page.getByTitle('下载附件 会议议程.txt').click();
  expect((await trashedAttachmentDownload).suggestedFilename()).toBe('会议议程.txt');
  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('恢复'); await dialog.accept(); });
  await page.getByRole('button', { name: '恢复会议：端到端业务调度会' }).click();
  await page.getByRole('button', { name: '会议管理' }).click();
  persistedMeeting = page.locator('.table-row').filter({ hasText: '端到端业务调度会' });
  await expect(persistedMeeting).toBeVisible();
  await persistedMeeting.getByTitle('编辑会议').click();
  const restoredAttachmentDownload = page.waitForEvent('download');
  await page.getByRole('dialog', { name: '编辑会议' }).getByTitle('下载附件 会议议程.txt').click();
  expect((await restoredAttachmentDownload).suggestedFilename()).toBe('会议议程.txt');
  await page.getByTitle('关闭').click();
  persistedMeeting = page.locator('.table-row').filter({ hasText: '端到端业务调度会' });
  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await persistedMeeting.getByTitle('删除会议').click();
  await page.getByRole('button', { name: '回收站' }).click();
  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('永久删除回收站'); await dialog.accept(); });
  await page.getByRole('button', { name: '清空回收站' }).click();
  await expect(page.getByText('回收站为空')).toBeVisible();
  await page.getByRole('button', { name: '数据迁移' }).click();
  const afterMeetingDelete = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出快照' }).click();
  const afterMeetingDeletePath = await (await afterMeetingDelete).path();
  if (!afterMeetingDeletePath) throw new Error('删除会议后的快照路径不可用');
  const afterMeetingDeleteText = readFileSync(afterMeetingDeletePath, 'utf8');
  expect(afterMeetingDeleteText).not.toContain('端到端业务调度会');
  expect(afterMeetingDeleteText).not.toContain('端到端基层调研');
  expect(afterMeetingDeleteText).not.toContain('端到端测试函');
  expect(afterMeetingDeleteText).not.toContain('会议议程.txt');
});

test('keeps public Pages business data local while enabling attachments and migration', async ({ page }) => {
  await page.getByRole('button', { name: '文件收发' }).click();
  await page.getByRole('button', { name: '登记文件' }).click();
  await expect(page.getByText(/单个文件不超过 8 MB，仅保存在本机/)).toBeVisible();
  await expect(page.locator('.attachment-picker input[type="file"]')).toBeEnabled();
  await page.locator('.attachment-picker input[type="file"]').setInputFiles({ name: '取消编辑附件.txt', mimeType: 'text/plain', buffer: Buffer.from('discard me') });
  await expect(page.getByText('取消编辑附件.txt')).toBeVisible();
  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('暂存附件'); await dialog.accept(); });
  await page.getByTitle('关闭').click();
  await page.getByRole('button', { name: '数据迁移' }).click();
  await expect(page.locator('.file-drop input[type="file"]')).toBeEnabled();
  await expect(page.getByText(/只在本机解析，不会上传/)).toBeVisible();
  const snapshot = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出快照' }).click();
  const snapshotPath = await (await snapshot).path();
  if (!snapshotPath) throw new Error('取消编辑后的快照路径不可用');
  expect(readFileSync(snapshotPath, 'utf8')).not.toContain('取消编辑附件.txt');
});

test('keeps private sync absent while exposing session-only AI controls on public Pages', async ({ page }) => {
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.getByRole('heading', { name: '同步连接' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '兼容 API 配置' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '总结、提纲与润色' })).toBeVisible();
  await expect(page.getByLabel('服务商预设').locator('option')).toHaveText(['OpenAI', 'DeepSeek', 'Moonshot / Kimi', '智谱 GLM', '阿里云百炼 / DashScope', 'SiliconFlow', '本机 Ollama', '自定义兼容接口', '神秘站点（本机中转 · 需密码）']);
  await expect(page.getByLabel('API Key（仅当前会话）')).toHaveValue('');
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("connect-src 'self' https: http://127.0.0.1:* http://localhost:*");
});

test('keeps the session AI key while navigating between modules', async ({ page }) => {
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await page.getByLabel('服务商预设').selectOption('zhipu');
  await expect(page.getByLabel('请求地址')).toHaveValue('https://open.bigmodel.cn/api/paas/v4');
  await page.getByLabel('API Key（仅当前会话）').fill('session-scope-key');
  await page.getByRole('button', { name: '任务管理' }).click();
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.getByLabel('API Key（仅当前会话）')).toHaveValue('session-scope-key');
  await expect(page.getByLabel('请求地址')).toHaveValue('https://open.bigmodel.cn/api/paas/v4');
});

test('keeps writing and weekly AI work on the current page and returns a result there', async ({ page }) => {
  const origin = new URL(page.url()).origin;
  await page.route('**/context-provider/v1/**', async (route) => {
    const pathName = new URL(route.request().url()).pathname;
    if (pathName === '/context-provider/v1/models') return route.fulfill({ json: { data: [{ id: 'context-model' }] } });
    if (pathName === '/context-provider/v1/chat/completions') return route.fulfill({ json: { choices: [{ message: { content: 'AI 助手入口验证文稿（润色）\n当前页面润色结果' } }] } });
    return route.abort();
  });
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await page.getByLabel('服务商预设').selectOption('custom');
  await page.getByLabel('请求地址').fill(`${origin}/context-provider/v1`);
  await page.getByLabel('API Key（仅当前会话）').fill('context-session-key');
  await page.getByRole('button', { name: '获取 AI 模型' }).click();

  await page.getByRole('button', { name: '公文写作' }).click();
  await page.getByLabel('文稿标题').fill('AI 助手入口验证文稿');
  await page.getByRole('button', { name: 'AI 润色' }).click();
  await expect(page.locator('.shell')).toHaveAttribute('data-tab', 'writing');
  const writingPanel = page.getByRole('dialog', { name: '当前页面 AI 协作面板' });
  await expect(writingPanel).toBeVisible();
  await expect(page.getByRole('button', { name: '打开全局查找' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '快速记录任务' })).toBeDisabled();
  await page.keyboard.press('Control+K');
  await expect(page.getByRole('dialog', { name: '全局查找' })).toBeHidden();
  await expect(writingPanel.getByLabel('处理用途')).toHaveValue('公文润色');
  await expect(writingPanel.getByText('已载入：当前公文草稿')).toBeVisible();
  await expect(writingPanel.getByLabel('待处理材料')).toHaveValue(/AI 助手入口验证文稿/);
  await writingPanel.getByRole('button', { name: '生成脱敏预览' }).click();
  await writingPanel.getByLabel('我确认本次材料已脱敏、非涉密且允许发送到所选服务商').check();
  await writingPanel.getByRole('button', { name: '确认本次 AI 请求' }).click();
  await expect(writingPanel.locator('.ai-readable-result')).toContainText('当前页面润色结果');
  await expect(writingPanel.locator('.ai-change-heading strong')).toHaveText('2');
  await expect(writingPanel.locator('.ai-change-list')).toContainText('标题');
  await expect(writingPanel.locator('.ai-change-list')).toContainText('正文');
  await expect(page.locator('.shell')).toHaveAttribute('data-tab', 'writing');
  await writingPanel.getByTitle('关闭当前页 AI 面板').click();

  await page.getByRole('button', { name: '周报生成' }).click();
  await page.getByRole('button', { name: 'AI 润色' }).click();
  await expect(page.locator('.shell')).toHaveAttribute('data-tab', 'weekly');
  const weeklyPanel = page.getByRole('dialog', { name: '当前页面 AI 协作面板' });
  await expect(weeklyPanel.getByLabel('处理用途')).toHaveValue('周报润色');
  await expect(weeklyPanel.getByText('已载入：当前周报')).toBeVisible();
  await expect(weeklyPanel.getByLabel('待处理材料')).toHaveValue(/工作周报/);
  await weeklyPanel.getByTitle('关闭当前页 AI 面板').click();

  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.getByRole('heading', { name: '历史生成与回答查询' })).toBeVisible();
  await expect(page.locator('.ai-history-detail > section:last-child pre')).toContainText('当前页面润色结果');
  await page.getByLabel('搜索 AI 历史').fill('入口验证文稿');
  await expect(page.locator('.ai-history-row')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.locator('.ai-history-detail > section:last-child pre')).toContainText('当前页面润色结果');

  await page.getByRole('button', { name: '数据迁移' }).click();
  const historySnapshot = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出快照' }).click();
  const historySnapshotPath = await (await historySnapshot).path();
  if (!historySnapshotPath) throw new Error('AI 历史快照路径不可用');
  const historySnapshotText = readFileSync(historySnapshotPath, 'utf8');
  expect(historySnapshotText).toContain('当前页面润色结果');
  expect(historySnapshotText).not.toContain('context-session-key');

  await page.getByRole('button', { name: 'AI 助手' }).click();
  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await page.getByTitle('删除本条 AI 历史').click();
  await expect(page.getByText('暂无 AI 生成历史')).toBeVisible();
});

test('manages units and people separately and persists edits to business pickers', async ({ page }) => {
  await page.getByRole('button', { name: '常用项管理' }).click();
  await page.getByLabel('新增单位与处室').fill('福建省测试工作专班');
  await page.getByLabel('新增单位与处室').press('Enter');
  await page.getByLabel('新增人员').fill('测试人员');
  await page.getByRole('button', { name: '添加' }).last().click();
  await page.locator('.directory-panel').filter({ hasText: '人员' }).locator('.directory-row input').last().fill('测试人员甲');
  await page.getByTitle('删除单位与处室常用项 福建省人民政府办公厅', { exact: true }).click();
  await page.getByRole('button', { name: '保存全部修改' }).click();
  await expect(page.getByText(/常用项已保存/)).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: '常用项管理' }).click();
  const persistedValues = page.locator('.directory-row input');
  await expect.poll(() => persistedValues.evaluateAll((nodes) => nodes.map((node) => (node as HTMLInputElement).value))).toEqual(expect.arrayContaining(['福建省测试工作专班', '测试人员甲']));
  await expect.poll(() => persistedValues.evaluateAll((nodes) => nodes.map((node) => (node as HTMLInputElement).value))).not.toContain('福建省人民政府办公厅');

  await page.getByRole('button', { name: '任务管理' }).click();
  await page.getByRole('button', { name: '新建任务' }).click();
  await expect.poll(() => page.getByLabel('选择常用交办人').locator('option').allTextContents()).toEqual(expect.arrayContaining(['从全部常用项选择', '测试人员甲']));
  await page.getByTitle('关闭').click();
  await page.getByRole('button', { name: '文件收发' }).click();
  await page.getByRole('button', { name: '登记文件' }).click();
  await expect.poll(() => page.getByLabel('选择常用来源单位').locator('option').allTextContents()).toEqual(expect.arrayContaining(['从全部常用项选择', '福建省测试工作专班']));
});

test('uses public Pages AI only after model discovery, redaction and per-request confirmation', async ({ page }) => {
  const requests: Array<{ method: string; url: string; authorization?: string; body?: Record<string, unknown> }> = [];
  await page.route('**/public-provider/v1/**', async (route) => {
    const request = route.request();
    requests.push({ method: request.method(), url: request.url(), authorization: request.headers().authorization, body: request.method() === 'POST' ? request.postDataJSON() as Record<string, unknown> : undefined });
    const pathName = new URL(request.url()).pathname;
    if (pathName === '/public-provider/v1/models') return route.fulfill({ json: { data: [{ id: 'summary-model' }] } });
    if (pathName === '/public-provider/v1/chat/completions') return route.fulfill({ json: { choices: [{ message: { content: '公开版总结结果' } }] } });
    return route.abort();
  });

  await page.getByRole('button', { name: 'AI 助手' }).click();
  await page.getByLabel('服务商预设').selectOption('deepseek');
  await expect(page.getByLabel('请求地址')).toHaveValue('https://api.deepseek.com');
  expect(requests).toEqual([]);

  const origin = new URL(page.url()).origin;
  await page.getByLabel('请求地址').fill(`${origin}/public-provider/v1`);
  await page.getByLabel('API Key（仅当前会话）').fill('public-memory-only-key');
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: '获取 AI 模型' }).click();
  await expect(page.getByLabel('选择模型')).toHaveValue('summary-model');
  expect(requests).toHaveLength(1);

  await page.getByLabel('本机素材').selectOption('workspace');
  await page.getByRole('button', { name: '载入素材' }).click();
  await expect(page.getByLabel('待处理材料')).toHaveValue(/【会议】/);
  await page.getByLabel('待处理材料').fill('x'.repeat(120_001));
  await page.getByRole('button', { name: '生成脱敏预览' }).click();
  await expect(page.getByRole('status')).toHaveText(/不能超过 120000 个字符/);
  await expect(page.getByLabel('脱敏预览（可继续修改）')).toHaveCount(0);
  expect(requests).toHaveLength(1);
  await page.getByLabel('待处理材料').fill('联系人：张三，手机13812345678，需要总结本周工作。');
  await page.getByRole('button', { name: '生成脱敏预览' }).click();
  await expect(page.getByLabel('脱敏预览（可继续修改）')).toHaveValue('联系人：[姓名]，手机[手机号]，需要总结本周工作。');
  expect(requests).toHaveLength(1);
  await page.getByLabel('我确认本次材料已脱敏、非涉密且允许发送到所选服务商').check();
  await page.getByRole('button', { name: '确认本次 AI 请求' }).click();
  await expect(page.locator('.ai-readable-result')).toHaveText('公开版总结结果');
  expect(requests[1]).toMatchObject({ method: 'POST', authorization: 'Bearer public-memory-only-key', body: { model: 'summary-model' } });

  await page.getByRole('button', { name: '数据迁移' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出快照' }).click();
  const snapshotPath = await (await download).path();
  if (!snapshotPath) throw new Error('快照下载路径不可用');
  expect(readFileSync(snapshotPath, 'utf8')).not.toContain('public-memory-only-key');
  await page.reload();
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.getByLabel('API Key（仅当前会话）')).toHaveValue('');
});

test('rejects years longer than four digits in every editable date field', async ({ page }) => {
  await page.getByRole('button', { name: '任务管理' }).click();
  await page.getByRole('button', { name: '新建任务' }).click();
  await rejectLongYear(page.getByLabel('截止日期'), '');
  const assignDate = await page.getByLabel('交办日期').inputValue();
  await rejectLongYear(page.getByLabel('交办日期'), assignDate);
  await page.getByTitle('关闭').click();

  await page.getByRole('button', { name: '会议管理' }).click();
  await page.getByRole('button', { name: '新建会议' }).click();
  const notifyDate = await page.getByLabel('通知日期').inputValue();
  await rejectLongYear(page.getByLabel('通知日期'), notifyDate);
  await rejectLongDateTime(page.getByLabel('会议时间'), '');
  await page.getByTitle('关闭').click();

  await page.getByRole('button', { name: '文件收发' }).click();
  await page.getByRole('button', { name: '登记文件' }).click();
  const documentDate = await page.getByLabel('成文日期').inputValue();
  await rejectLongYear(page.getByLabel('成文日期'), documentDate);
  await page.getByTitle('关闭').click();

  await page.getByRole('button', { name: '外出活动' }).click();
  await page.getByRole('button', { name: '新建外出活动' }).click();
  const researchDate = await page.getByLabel('活动日期').inputValue();
  await rejectLongYear(page.getByLabel('活动日期'), researchDate);
  await page.getByTitle('关闭').click();

  await page.getByRole('button', { name: '用章管理' }).click();
  await page.getByRole('button', { name: '新建用章记录' }).click();
  const sealDate = await page.getByLabel('用章日期').inputValue();
  await rejectLongYear(page.getByLabel('用章日期'), sealDate);
  await page.getByTitle('关闭').click();

  await page.getByRole('button', { name: '物资收发' }).click();
  await page.getByRole('button', { name: '新建物资记录' }).click();
  const handlerDate = await page.getByLabel('经手日期').inputValue();
  await rejectLongYear(page.getByLabel('经手日期'), handlerDate);
  await page.getByTitle('关闭').click();

  await page.getByRole('button', { name: '周报生成' }).click();
  const startDate = await page.getByLabel('开始日期').inputValue();
  const endDate = await page.getByLabel('结束日期').inputValue();
  await rejectLongYear(page.getByLabel('开始日期'), startDate);
  await rejectLongYear(page.getByLabel('结束日期'), endDate);
});

test('allows replacing an existing required date through an intermediate edit state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '任务管理' }).click();
  await page.getByRole('button', { name: '新建任务' }).click();
  const assignDate = page.getByLabel('交办日期');
  await expect(assignDate).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
  await assignDate.fill('');
  await expect(assignDate).toHaveValue('');
  await assignDate.fill('2027-08-16');
  await expect(assignDate).toHaveValue('2027-08-16');
  await page.getByLabel('任务名称').fill('交办日期年份持久化验证');
  await page.getByRole('button', { name: '保存任务' }).click();
  const savedRow = page.locator('.table-row').filter({ hasText: '交办日期年份持久化验证' });
  await expect(savedRow).toBeVisible();
  await savedRow.getByTitle('编辑任务').click();
  await expect(page.getByLabel('交办日期')).toHaveValue('2027-08-16');
});

test('saves partner unit groups and appends them without overwriting', async ({ page }) => {
  await page.getByRole('button', { name: '任务管理' }).click();
  await page.getByRole('button', { name: '新建任务' }).click();
  await page.getByRole('button', { name: '添加配合单位' }).click();
  await page.getByLabel('配合单位名称 1').fill('甲单位');
  await page.getByRole('button', { name: '添加配合单位' }).click();
  await page.getByLabel('配合单位名称 2').fill('乙单位');
  page.once('dialog', (dialog) => { void dialog.accept('端到端协同组'); });
  await page.getByRole('button', { name: '存为分组' }).click();
  await expect(page.getByRole('status')).toHaveText(/分组「端到端协同组」已保存（2 个单位）/);
  await page.getByTitle('删除配合单位 2').click();
  await expect(page.getByLabel('配合单位名称 2')).toHaveCount(0);
  await page.getByLabel('按分组添加配合单位').selectOption({ label: '端到端协同组（2 个单位）' });
  await expect(page.getByRole('status')).toHaveText(/已从分组「端到端协同组」加入 1 个单位，跳过已存在 1 个/);
  await expect(page.getByLabel('配合单位名称 1')).toHaveValue('甲单位');
  await expect(page.getByLabel('配合单位名称 2')).toHaveValue('乙单位');
  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('未保存修改'); await dialog.accept(); });
  await page.getByTitle('关闭').click();

  await page.reload();
  await page.getByRole('button', { name: '任务管理' }).click();
  await page.getByRole('button', { name: '新建任务' }).click();
  await expect(page.getByLabel('按分组添加配合单位').locator('option')).toContainText(['端到端协同组（2 个单位）']);
});

test('applies category tint overrides across the task list and statistics', async ({ page }) => {
  await page.getByRole('button', { name: '统计分析' }).click();
  await page.getByLabel('统计月份').selectOption('');
  await page.getByText(/类目配色（\d+ 个类目）/).click();
  await page.getByLabel('重点项目 使用紫色').click();
  await expect(page.getByRole('status')).toHaveText(/「重点项目」类目颜色已更新/);
  await expect(page.locator('.stat-bar-row').filter({ hasText: '重点项目' }).locator('.stat-bar-fill')).toHaveClass(/tint-violet/);

  await page.getByRole('button', { name: '任务管理' }).click();
  await expect(page.locator('.table-row').filter({ hasText: '推进全省基层治理年度工作总结' }).locator('.category-dot')).toHaveClass(/tint-violet/);

  await page.reload();
  await page.getByRole('button', { name: '统计分析' }).click();
  await page.getByLabel('统计月份').selectOption('');
  await expect(page.locator('.stat-bar-row').filter({ hasText: '重点项目' }).locator('.stat-bar-fill')).toHaveClass(/tint-violet/);
  await page.getByText(/类目配色（\d+ 个类目）/).click();
  await page.getByLabel('重点项目 恢复自动配色').click();
  await expect(page.getByRole('status')).toHaveText(/「重点项目」已恢复自动配色/);
});

test('builds weekly reports from a saved custom template', async ({ page }) => {
  await page.getByRole('button', { name: '周报生成' }).click();
  await page.getByLabel('模板名称').fill('端到端周报模板');
  await page.getByRole('button', { name: '添加章节' }).click();
  await page.getByLabel('章节标题 7').fill('亮点工作');
  await page.getByLabel('章节占位 7').fill('写两条亮点。');
  await page.getByRole('button', { name: '保存模板' }).click();
  await expect(page.getByRole('status')).toHaveText(/周报模板「端到端周报模板」已保存/);
  await page.getByLabel('周报模板').selectOption({ label: '端到端周报模板' });
  await page.getByRole('button', { name: '重新汇总' }).click();
  await expect(page.getByRole('status')).toHaveText(/已按模板「端到端周报模板」重新汇总/);
  const body = page.getByLabel('周报正文');
  await expect(body).toHaveValue(/七、亮点工作/);
  await expect(body).toHaveValue(/写两条亮点。/);
  await expect(body).toHaveValue(/一、总体情况/);

  await page.reload();
  await page.getByRole('button', { name: '周报生成' }).click();
  await expect(page.locator('.weekly-template-row').filter({ hasText: '端到端周报模板' })).toBeVisible();
  await expect(page.getByLabel('周报模板').locator('option')).toContainText(['默认周报结构', '端到端周报模板']);
});

test('extracts a weekly template structure from a pasted sample article', async ({ page }) => {
  await page.getByRole('button', { name: '周报生成' }).click();
  await page.getByText('从范文提取结构（本机识别，不联网）').click();
  await page.getByLabel('范文内容').fill('关于近期工作情况的报告\n一、总体情况\n本周整体推进有序。\n二、经验做法\n坚持一线工作法。');
  await page.getByRole('button', { name: '提取结构' }).click();
  await expect(page.getByRole('status')).toHaveText(/已从范文提取 2 个章节/);
  await expect(page.getByLabel('模板名称')).toHaveValue('范文结构：关于近期工作情况的报告');
  await expect(page.getByLabel('章节标题 1')).toHaveValue('总体情况');
  await expect(page.getByLabel('章节来源 2')).toHaveValue('manual');
  await expect(page.getByLabel('章节占位 2')).toHaveValue(/坚持一线工作法/);
});

test('saves a local polishing skill and sends it as the AI system guidance', async ({ page }) => {
  const requests: Array<{ pathname: string; body?: { messages?: Array<{ role: string; content: string }> } }> = [];
  await page.route('**/skill-provider/v1/**', async (route) => {
    const request = route.request();
    requests.push({ pathname: new URL(request.url()).pathname, body: request.method() === 'POST' ? request.postDataJSON() as { messages?: Array<{ role: string; content: string }> } : undefined });
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/skill-provider/v1/models') return route.fulfill({ json: { data: [{ id: 'skill-model' }] } });
    if (pathname === '/skill-provider/v1/chat/completions') return route.fulfill({ json: { choices: [{ message: { content: '按指引润色结果' } }] } });
    return route.abort();
  });

  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.getByLabel('润色指引')).toHaveValue('');
  await expect(page.getByLabel('润色指引').locator('option')).toHaveText([
    '无（默认）',
    '预制 · 精简润色版',
    '预制 · 结构校核版',
    '预制 · 总结成稿版',
  ]);
  await expect(page.locator('.preset-skill-card')).toHaveCount(3);
  await page.getByLabel('指引名称').fill('端到端公文指引');
  await page.getByLabel('指引内容').fill('标题使用四号黑体，正文多用动宾结构。');
  await page.getByRole('button', { name: '保存指引' }).click();
  await expect(page.getByRole('status')).toHaveText(/已保存到本机/);
  await expect(page.locator('.skill-row').filter({ hasText: '端到端公文指引' })).toBeVisible();
  expect(requests).toEqual([]);

  await page.getByLabel('润色指引').selectOption({ label: '本机 · 端到端公文指引' });
  await expect(page.getByText(/将附加「端到端公文指引」/)).toBeVisible();
  const origin = new URL(page.url()).origin;
  await page.getByLabel('请求地址').fill(`${origin}/skill-provider/v1`);
  await page.getByLabel('API Key（仅当前会话）').fill('skill-session-key');
  await page.getByRole('button', { name: '获取 AI 模型' }).click();
  await expect(page.getByLabel('选择模型')).toHaveValue('skill-model');
  await page.getByLabel('待处理材料').fill('请润色：本周完成台账整理。');
  await page.getByRole('button', { name: '生成脱敏预览' }).click();
  await page.getByLabel('我确认本次材料已脱敏、非涉密且允许发送到所选服务商').check();
  await page.getByRole('button', { name: '确认本次 AI 请求' }).click();
  await expect(page.locator('.ai-readable-result')).toHaveText('按指引润色结果');
  const completion = requests.find((request) => request.pathname.endsWith('/chat/completions'));
  expect(completion?.body?.messages?.[0]?.content).toContain('写作指引（用户提供，须遵循且不得虚构事实）');
  expect(completion?.body?.messages?.[0]?.content).toContain('标题使用四号黑体，正文多用动宾结构。');

  await page.getByLabel('润色指引').selectOption('preset:concise-polish');
  await expect(page.getByText(/将附加「精简润色版」/)).toBeVisible();
  await page.getByLabel('我确认本次材料已脱敏、非涉密且允许发送到所选服务商').check();
  await page.getByRole('button', { name: '确认本次 AI 请求' }).click();
  await expect.poll(() => requests.filter((request) => request.pathname.endsWith('/chat/completions')).length).toBe(2);
  const completions = requests.filter((request) => request.pathname.endsWith('/chat/completions'));
  expect(completions[1]?.body?.messages?.[0]?.content).toContain('在不新增事实、不改变原意和数据的前提下润色材料');

  await page.reload();
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.locator('.skill-row').filter({ hasText: '端到端公文指引' })).toBeVisible();
  await expect(page.getByLabel('润色指引')).toHaveValue('');
});

test('summarizes ledgers deterministically in the statistics module', async ({ page }) => {
  await page.getByRole('button', { name: '统计分析' }).click();
  await expect(page.getByRole('heading', { name: '统计分析' })).toBeVisible();
  await page.getByLabel('统计月份').selectOption('');
  const metric = (label: string) => page.locator('.metric').filter({ hasText: label }).locator('strong');
  await expect(metric('本期任务')).toHaveText('2');
  await expect(metric('已完成')).toHaveText('0');
  await expect(page.locator('.stat-bar-row').filter({ hasText: '重点项目' }).locator('.stat-bar-value')).toHaveText('1');
  await expect(page.locator('.stat-bar-row').filter({ hasText: '日常工作' }).locator('.stat-bar-value')).toHaveText('1');
  await expect(page.locator('.stat-legend-item').filter({ hasText: '进行中' }).locator('strong')).toHaveText('1');
  await expect(page.locator('.stat-legend-item').filter({ hasText: '未启动' }).locator('strong')).toHaveText('1');
  const ledger = page.locator('.stats-ledger-grid');
  await expect(ledger).toContainText('会议');
  await expect(ledger).toContainText('物资入库');
  await page.getByLabel('任务类目').selectOption('重点项目');
  await expect(metric('本期任务')).toHaveText('1');
  await page.getByLabel('任务类目').selectOption('');
  await expect(metric('本期任务')).toHaveText('2');
});

test('prefills the task drawer from pasted text with local rules only', async ({ page }) => {
  const pageOrigin = new URL(page.url()).origin;
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== pageOrigin) externalRequests.push(request.url());
  });
  await page.getByRole('button', { name: '任务管理' }).click();
  await page.getByRole('button', { name: '新建任务' }).click();
  await page.getByText('智能识别填单（粘贴通知文字）').click();
  await page.getByLabel('待识别文字').fill('任务：完成年度物资盘点\n交办人：综合科\n微信通知，截止 2026-08-05');
  await page.getByRole('button', { name: '识别并填入' }).click();
  await expect(page.getByRole('status')).toHaveText(/已按本机规则填入/);
  await expect(page.getByLabel('任务名称')).toHaveValue('完成年度物资盘点');
  await expect(page.getByLabel('交办人', { exact: true })).toHaveValue('综合科');
  await expect(page.getByLabel('截止日期')).toHaveValue('2026-08-05');
  await expect(page.getByLabel('任务来源')).toHaveValue('微信');
  expect(externalRequests).toEqual([]);
  await page.getByRole('button', { name: '保存任务' }).click();
  await expect(page.locator('.table-row').filter({ hasText: '完成年度物资盘点' })).toBeVisible();
});

test.describe('segmented keyboard date editing', () => {
  test.use({ locale: 'zh-CN' });

  test('rewrites the assign-date year digit by digit with real keystrokes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Physical-keyboard segment editing is verified once on the desktop project.');
    test.skip(process.platform !== 'win32', 'Native date-input segment focus and keyboard order are platform-specific; this physical-keyboard regression targets Windows.');
    await page.goto('/');
    await page.getByRole('button', { name: '任务管理' }).click();
    await page.getByRole('button', { name: '新建任务' }).click();
    const assignDate = page.getByLabel('交办日期');
    const initial = await assignDate.inputValue();
    expect(initial).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const box = await assignDate.boundingBox();
    if (!box) throw new Error('交办日期输入框不可见');
    await page.mouse.click(box.x + 12, box.y + box.height / 2);
    await page.keyboard.press('Home');
    for (const digit of ['1', '9', '9', '8']) {
      await page.keyboard.press(`Digit${digit}`);
    }
    await expect(assignDate).toHaveValue(`1998${initial.slice(4)}`);
    await page.getByLabel('任务名称').click();
    await expect(assignDate).toHaveValue(`1998${initial.slice(4)}`);
    await page.getByLabel('任务名称').fill('键盘逐位改年份验证');
    await page.getByRole('button', { name: '保存任务' }).click();
    const savedRow = page.locator('.table-row').filter({ hasText: '键盘逐位改年份验证' });
    await expect(savedRow).toBeVisible();
    await savedRow.getByTitle('编辑任务').click();
    await expect(page.getByLabel('交办日期')).toHaveValue(`1998${initial.slice(4)}`);
  });
});

test('preserves all common people during rapid additions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '任务管理' }).click();
  await page.getByRole('button', { name: '新建任务' }).click();
  const assigner = page.getByLabel('交办人', { exact: true });
  const remember = page.getByTitle('将交办人加入常用项');
  for (const person of ['甲同志', '乙同志', '丙同志']) {
    await assigner.fill(person);
    await remember.click();
  }
  const options = page.locator('.reusable-field').filter({ hasText: '交办人' }).locator('datalist option');
  await expect.poll(() => options.count()).toBeGreaterThanOrEqual(5);
  await expect.poll(() => options.evaluateAll((nodes) => nodes.map((node) => (node as HTMLOptionElement).value))).toEqual(expect.arrayContaining(['甲同志', '乙同志', '丙同志', '林晓岚', '陈致远']));
  const picker = page.getByLabel('选择常用交办人');
  await expect.poll(() => picker.locator('option').allTextContents()).toEqual(expect.arrayContaining(['从全部常用项选择', '林晓岚', '丙同志', '甲同志', '乙同志', '陈致远']));
  await picker.selectOption('甲同志');
  await expect(assigner).toHaveValue('甲同志');
  await page.reload();
  await page.getByRole('button', { name: '任务管理' }).click();
  await page.getByRole('button', { name: '新建任务' }).click();
  const persistedPicker = page.getByLabel('选择常用交办人');
  await expect.poll(() => persistedPicker.locator('option').allTextContents()).toEqual(expect.arrayContaining(['丙同志', '甲同志', '乙同志']));
});

test('keeps create-mode drawer titles stable after required fields are entered', async ({ page }) => {
  const cases = [
    ['任务管理', '新建任务', '任务名称', '新建任务', '标题稳定任务'],
    ['会议管理', '新建会议', '会议主题', '新建会议', '标题稳定会议'],
    ['文件收发', '登记文件', '文件标题', '登记文件', '标题稳定文件'],
    ['外出活动', '新建外出活动', '活动主题', '新建外出活动', '标题稳定活动'],
    ['用章管理', '新建用章记录', '所盖文件名称', '新建用章记录', '标题稳定用章'],
    ['物资收发', '新建物资记录', '物资名称', '新建物资记录', '标题稳定物资'],
  ];
  for (const [moduleName, openButton, fieldLabel, expectedTitle, value] of cases) {
    await page.getByRole('button', { name: moduleName }).click();
    await page.getByRole('button', { name: openButton }).click();
    await page.getByLabel(fieldLabel).fill(value);
    await expect(page.getByRole('heading', { name: expectedTitle, exact: true })).toBeVisible();
    const confirmationPromise = page.waitForEvent('dialog');
    const closePromise = page.getByTitle('关闭').click();
    const confirmation = await confirmationPromise;
    expect(confirmation.message()).toContain('未保存修改');
    await confirmation.accept();
    await closePromise;
  }
});

test('imports both legacy fixture formats and keeps archive records read-only', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'hxhwang', { configurable: true, value: { printPdf: async () => true } });
  });
  await page.reload();
  await page.getByRole('button', { name: '数据迁移' }).click();
  const importer = page.locator('.file-drop input[type="file"]');

  const dropZone = page.locator('.file-drop');
  await dropZone.evaluate((element) => {
    const dataTransfer = new DataTransfer();
    element.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }));
  });
  await expect(dropZone).toHaveClass(/drag-active/);
  await expect(dropZone).toContainText('松开即可导入');
  await dropZone.evaluate((element, json) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([json], 'upgrade04.json', { type: 'application/json' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
  }, readFileSync(fixture('upgrade04.json'), 'utf8'));
  await expect(dropZone).not.toHaveClass(/drag-active/);
  await expect(page.getByText('任务管理系统LV08')).toBeVisible();
  await page.getByRole('button', { name: '历史档案' }).click();
  await expect(page.getByText('旧版会议', { exact: true })).toBeVisible();
  await expect(page.getByText('旧版用章', { exact: true })).toBeVisible();
  await expect(page.getByText('旧版物资', { exact: true })).toBeVisible();
  const materialRow = page.locator('.table-row').filter({ hasText: '旧版物资' });
  await materialRow.getByText('查看迁移原始字段').click();
  await expect(materialRow.locator('.legacy-payload pre')).toContainText('"materialName": "旧版物资"');
  await expect(page.getByText('work_categories', { exact: true })).toBeVisible();
  const materialDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载附件 物资清单.txt' }).click();
  expect((await materialDownload).suggestedFilename()).toBe('物资清单.txt');
  await materialRow.getByRole('button', { name: '复制为新记录' }).click();
  await expect(page.getByRole('heading', { name: '复制物资记录为新记录' })).toBeVisible();
  await expect(page.getByLabel('物资名称')).toHaveValue('旧版物资');
  await page.getByLabel('物资名称').fill('旧版物资（复制）');
  await page.getByRole('button', { name: '保存物资' }).click();
  await expect(page.getByText('旧版物资（复制）', { exact: true })).toBeVisible();
  const copiedMaterial = page.locator('.table-row').filter({ hasText: '旧版物资（复制）' });
  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await copiedMaterial.getByTitle('删除物资记录').click();
  await page.getByRole('button', { name: '历史档案' }).click();
  const retainedSharedAttachment = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载附件 物资清单.txt' }).click();
  expect((await retainedSharedAttachment).suggestedFilename()).toBe('物资清单.txt');

  await page.getByRole('button', { name: '数据迁移' }).click();
  await importer.setInputFiles(fixture('wenxibuddy0722.json'));
  await expect(page.getByRole('heading', { name: /导出格式未区分/ })).toBeVisible();
  await expect(page.getByText(/无法仅凭导出包可靠区分/)).toBeVisible();
  await page.getByRole('button', { name: '历史档案' }).click();
  await expect(page.getByText('周报', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '数据迁移' }).click();
  const enriched = JSON.parse(readFileSync(fixture('wenxibuddy0722.json'), 'utf8')) as Record<string, unknown>;
  enriched.wenxiSkills = [{ id: 'skill_e2e', name: '迁移 Skill 示例', content: '# 只读写作规则', legacySkillOnly: 'keep-skill' }];
  await importer.setInputFiles({ name: 'wenxibuddy0722-with-skill.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(enriched)) });
  await page.getByRole('button', { name: '历史档案' }).click();
  const skill = page.locator('.legacy-setting').filter({ hasText: '迁移 Skill 示例' });
  await expect(skill).toBeVisible();
  await skill.locator('summary').click();
  await expect(skill).toContainText('# 只读写作规则');
  await expect(skill).toContainText('keep-skill');
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('exports and restores a local snapshot', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'hxhwang', { configurable: true, value: { printPdf: async () => true } });
  });
  await page.reload();
  const restoredTask = '推进全省基层治理年度工作总结';
  await page.getByRole('button', { name: '数据迁移' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出快照' }).click();
  const snapshotPath = await (await downloadPromise).path();
  if (!snapshotPath) throw new Error('本地快照下载路径不可用');

  await page.getByRole('button', { name: '任务管理' }).click();
  const taskRow = page.locator('.table-row').filter({ hasText: restoredTask });
  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await taskRow.getByTitle('删除任务').click();
  await expect(page.getByText(restoredTask, { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '数据迁移' }).click();
  await page.locator('.file-drop input[type="file"]').setInputFiles(snapshotPath);
  await expect(page.getByText('本地快照恢复完成')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'HxHwang Gw 本地快照' })).toBeVisible();
  await page.getByRole('button', { name: '任务管理' }).click();
  await expect(page.getByText(restoredTask, { exact: true })).toBeVisible();
});

test('saves a draft, exports DOCX and delegates PDF export to the desktop bridge', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'hxhwang', {
      configurable: true,
      value: { printPdf: async (html: string, title: string) => { window.localStorage.setItem('e2e-pdf', `${title}:${html.includes('@page')}`); return true; } }
    });
  });
  await page.reload();
  await page.getByRole('button', { name: '公文写作' }).click();
  await expect(page.getByText('规则包 v1')).toBeVisible();
  await expect(page.getByText('官方规范')).toBeVisible();
  await expect(page.getByText('严重程度：确定性规则')).toBeVisible();
  await page.getByLabel('搜索写作模板').fill('会议纪要');
  await page.getByRole('button', { name: '会议纪要（一事一议）' }).click();
  await expect(page.getByLabel('文稿标题')).toHaveValue('会议纪要');
  await page.getByLabel('文稿标题').fill('测试会议纪要');
  await expect(page.locator('.ProseMirror')).toContainText('审议通过事项');
  await expect(page.getByText('授权教材建议').first()).toBeVisible();
  await page.getByRole('button', { name: '保存版本' }).click();
  await expect(page.getByText('文稿版本已保存')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '公文写作' }).click();
  await expect(page.getByLabel('文稿标题')).toHaveValue('测试会议纪要');
  await expect(page.locator('.ProseMirror')).toContainText('审议通过事项');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 DOCX' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.docx$/);
  await page.getByRole('button', { name: '导出 PDF' }).click();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('e2e-pdf'))).toBe('测试会议纪要:true');
});

test('restores main draft revisions as unsaved copies without replacing the saved head or using the network', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'The full revision lifecycle is verified once in desktop Chromium.');
  await page.getByRole('button', { name: '公文写作' }).click();

  const title = page.getByLabel('文稿标题');
  const editor = page.locator('.ProseMirror');
  const save = page.getByRole('button', { name: '保存版本' });
  const historyTrigger = page.getByRole('button', { name: '版本历史' });
  const historyDialog = page.getByRole('dialog', { name: '查看与恢复保存版本' });
  const revisionRow = (version: number) => historyDialog.getByRole('button', { name: new RegExp(`^v${version}(?:\\s|$)`) });
  const actionRequests: string[] = [];
  const recordActionRequest = (request: { url: () => string }) => actionRequests.push(request.url());
  page.on('request', recordActionRequest);

  await title.fill('草稿历史第一版');
  await editor.fill('第一版正文：保留原始办理意见。');
  await save.click();
  await expect(page.getByRole('status')).toHaveText(/文稿版本已保存，本机历史已记录/);
  await expect(save).toBeEnabled();

  await title.fill('草稿历史第二版');
  await editor.fill('第二版正文：补充复核结论。');
  await save.click();
  await expect(page.getByRole('status')).toHaveText(/文稿版本已保存，本机历史已记录/);
  await expect(save).toBeEnabled();
  await expect(page.locator('.toolbar-hint')).toContainText('当前保存版 v2');

  await historyTrigger.click();
  await expect(historyDialog).toBeVisible();
  await expect(historyDialog.locator('.document-revision-list-meta strong')).toHaveText('2');
  await revisionRow(1).click();
  const comparison = historyDialog.locator('.document-revision-comparison article');
  await expect(comparison.nth(0)).toContainText('草稿历史第二版');
  await expect(comparison.nth(0)).toContainText('第二版正文：补充复核结论。');
  await expect(comparison.nth(1)).toContainText('草稿历史第一版');
  await expect(comparison.nth(1)).toContainText('第一版正文：保留原始办理意见。');
  await expect(title).toHaveValue('草稿历史第二版');
  await expect(editor).toContainText('第二版正文：补充复核结论。');

  page.once('dialog', async (confirmation) => {
    expect(confirmation.message()).toContain('恢复 v1 会替换当前屏幕中的未保存内容');
    await confirmation.dismiss();
  });
  await historyDialog.getByRole('button', { name: '恢复 v1 为未保存工作副本' }).click();
  await expect(historyDialog).toBeVisible();
  await expect(title).toHaveValue('草稿历史第二版');
  await expect(editor).toContainText('第二版正文：补充复核结论。');
  await historyDialog.getByRole('button', { name: '关闭版本历史' }).click();

  await historyTrigger.click();
  await revisionRow(1).click();
  page.once('dialog', async (confirmation) => {
    expect(confirmation.message()).toContain('恢复 v1 会替换当前屏幕中的未保存内容');
    await confirmation.accept();
  });
  await historyDialog.getByRole('button', { name: '恢复 v1 为未保存工作副本' }).click();
  await expect(historyDialog).toBeHidden();
  await expect(page.getByRole('status')).toHaveText(/已载入 v1 为未保存工作副本/);
  await expect(title).toHaveValue('草稿历史第一版');
  await expect(editor).toContainText('第一版正文：保留原始办理意见。');
  await expect(page.locator('.toolbar-hint')).toContainText('当前保存版 v2');

  page.off('request', recordActionRequest);
  expect(actionRequests).toEqual([]);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: '公文写作' }).click();
  await expect(title).toHaveValue('草稿历史第二版');
  await expect(editor).toContainText('第二版正文：补充复核结论。');
  await expect(page.locator('.toolbar-hint')).toContainText('当前保存版 v2');

  actionRequests.length = 0;
  page.on('request', recordActionRequest);
  await historyTrigger.click();
  await revisionRow(1).click();
  page.once('dialog', (confirmation) => confirmation.accept());
  await historyDialog.getByRole('button', { name: '恢复 v1 为未保存工作副本' }).click();
  await expect(historyDialog).toBeHidden();
  await save.click();
  await expect(page.getByRole('status')).toHaveText(/文稿版本已保存，本机历史已记录/);
  await expect(page.locator('.toolbar-hint')).toContainText('当前保存版 v3');
  await historyTrigger.click();
  await expect(historyDialog.locator('.document-revision-list-meta strong')).toHaveText('3');
  await expect(revisionRow(3)).toHaveAttribute('aria-current', 'true');
  await expect(revisionRow(2)).toBeVisible();
  await expect(revisionRow(1)).toBeVisible();
  page.off('request', recordActionRequest);
  expect(actionRequests).toEqual([]);
});

test('imports TXT, sanitized HTML and DOCX, then reuses a saved custom format', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Document conversion and custom-template persistence are verified once.');
  await page.getByRole('button', { name: '公文写作' }).click();
  const importer = page.locator('.document-import-button input[type="file"][accept*="docx"]');

  await importer.setInputFiles({ name: '导入文本.txt', mimeType: 'text/plain', buffer: Buffer.from('导入文本标题\n文本正文') });
  await expect(page.getByLabel('文稿标题')).toHaveValue('导入文本标题');
  await expect(page.locator('.ProseMirror')).toContainText('文本正文');

  await importer.setInputFiles({ name: '导入页面.html', mimeType: 'text/html', buffer: Buffer.from('<h1>导入页面标题</h1><script>window.evil=true</script><p onclick="evil()">安全正文</p>') });
  await expect(page.getByLabel('文稿标题')).toHaveValue('导入页面标题');
  await expect(page.locator('.ProseMirror')).toContainText('安全正文');
  await expect(page.locator('.ProseMirror')).not.toContainText('window.evil');
  await expect(page.locator('.ProseMirror [onclick], .ProseMirror script')).toHaveCount(0);

  const docx = await exportDraftDocx({ id: 'e2e-import', title: '导入 DOCX 标题', documentType: '测试文稿', contentHtml: '', contentText: '导入 DOCX 标题\n一、主要内容\nDOCX 正文', templateId: 'test', version: 1, updatedAt: new Date().toISOString() });
  await importer.setInputFiles({ name: '导入文档.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from(await docx.arrayBuffer()) });
  await expect(page.getByLabel('文稿标题')).toHaveValue('导入 DOCX 标题');
  await expect(page.locator('.ProseMirror')).toContainText('DOCX 正文');
  await page.getByRole('button', { name: '保存版本' }).click();
  await expect(page.getByRole('status')).toHaveText(/文稿版本已保存/);

  await page.getByLabel('文稿标题').fill('端到端自定义格式');
  await page.getByRole('button', { name: '保存自定义格式' }).click();
  await expect(page.getByRole('status')).toHaveText(/已保存为自定义格式/);
  await expect(page.getByLabel('文稿标题')).toHaveValue('端到端自定义格式');
  await expect(page.locator('.ProseMirror')).toContainText('DOCX 正文');
  await page.reload();
  await page.getByRole('button', { name: '公文写作' }).click();
  await page.getByLabel('搜索写作模板').fill('端到端自定义格式');
  let customTemplate = page.locator('.template-option-row').filter({ hasText: '端到端自定义格式' });
  await customTemplate.locator('.template-option').click();
  await expect(page.locator('.ProseMirror')).toContainText('DOCX 正文');
  await expect(page.getByText(/本机自定义/).first()).toBeVisible();

  const actionRequests: string[] = [];
  const recordActionRequest = (request: { url: () => string }) => actionRequests.push(request.url());
  await page.getByLabel('文稿标题').fill('重命名期间未保存标题');
  await page.locator('.ProseMirror').fill('重命名期间未保存正文');
  const titleBeforeRename = await page.getByLabel('文稿标题').inputValue();
  const bodyBeforeRename = await page.locator('.ProseMirror').innerText();
  const versionBeforeRename = await page.locator('.toolbar-hint').innerText();
  page.on('request', recordActionRequest);
  await customTemplate.getByRole('button', { name: '重命名自定义格式：端到端自定义格式' }).click();
  let renameInput = page.getByRole('textbox', { name: '自定义格式新名称', exact: true });
  await renameInput.fill('取消的格式名称');
  await page.getByRole('button', { name: '取消重命名自定义格式：端到端自定义格式' }).click();
  await expect(customTemplate.getByText('端到端自定义格式', { exact: true })).toBeVisible();
  await expect(customTemplate.getByRole('button', { name: '重命名自定义格式：端到端自定义格式' })).toBeFocused();

  await customTemplate.getByRole('button', { name: '重命名自定义格式：端到端自定义格式' }).click();
  renameInput = page.getByRole('textbox', { name: '自定义格式新名称', exact: true });
  await renameInput.fill('Escape 取消的格式名称');
  await page.getByRole('button', { name: '保存自定义格式新名称：端到端自定义格式' }).focus();
  await page.keyboard.press('Escape');
  await expect(customTemplate.getByText('端到端自定义格式', { exact: true })).toBeVisible();
  await expect(customTemplate.getByRole('button', { name: '重命名自定义格式：端到端自定义格式' })).toBeFocused();

  await customTemplate.getByRole('button', { name: '重命名自定义格式：端到端自定义格式' }).click();
  renameInput = page.getByRole('textbox', { name: '自定义格式新名称', exact: true });
  await renameInput.fill('已重命名自定义格式');
  await renameInput.press('Enter');
  await expect(page.getByRole('status')).toHaveText(/已重命名/);
  customTemplate = page.locator('.template-option-row').filter({ hasText: '已重命名自定义格式' });
  await expect(customTemplate).toBeVisible();
  await expect(page.getByLabel('文稿标题')).toHaveValue(titleBeforeRename);
  expect(await page.locator('.ProseMirror').innerText()).toBe(bodyBeforeRename);
  expect(await page.locator('.toolbar-hint').innerText()).toBe(versionBeforeRename);
  page.off('request', recordActionRequest);
  expect(actionRequests).toEqual([]);

  await page.reload();
  await page.getByRole('button', { name: '公文写作' }).click();
  await page.getByLabel('搜索写作模板').fill('已重命名自定义格式');
  customTemplate = page.locator('.template-option-row').filter({ hasText: '已重命名自定义格式' });
  await page.getByRole('button', { name: '数据迁移' }).click();
  const renamedSnapshotDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出快照' }).click();
  const renamedSnapshotPath = await (await renamedSnapshotDownload).path();
  if (!renamedSnapshotPath) throw new Error('重命名格式快照路径不可用');
  const renamedSnapshot = JSON.parse(readFileSync(renamedSnapshotPath, 'utf8')) as { records: Array<{ id: string; kind: string; payload: Record<string, unknown> }> };
  const renamedSetting = renamedSnapshot.records.find((record) => record.kind === 'setting' && record.payload.name === '已重命名自定义格式');
  expect(renamedSetting?.id).toBe(`custom-template:${String(renamedSetting?.payload.id)}`);
  expect(renamedSetting?.payload.contentText).toContain('DOCX 正文');

  await page.getByRole('button', { name: '公文写作' }).click();
  await page.getByLabel('搜索写作模板').fill('已重命名自定义格式');
  customTemplate = page.locator('.template-option-row').filter({ hasText: '已重命名自定义格式' });
  await customTemplate.locator('.template-option').click();
  await expect(page.locator('.ProseMirror')).toContainText('DOCX 正文');
  await page.getByRole('button', { name: '保存版本' }).click();
  await expect(page.getByRole('status')).toHaveText(/文稿版本已保存/);
  await page.getByLabel('文稿标题').fill('删除期间未保存标题');
  await page.locator('.ProseMirror').fill('删除期间未保存正文');
  const titleBeforeDelete = await page.getByLabel('文稿标题').inputValue();
  const bodyBeforeDelete = await page.locator('.ProseMirror').innerText();
  const versionBeforeDelete = await page.locator('.toolbar-hint').innerText();

  actionRequests.length = 0;
  page.on('request', recordActionRequest);
  page.once('dialog', (dialog) => dialog.dismiss());
  await customTemplate.getByRole('button', { name: '删除自定义格式：已重命名自定义格式' }).click();
  await expect(customTemplate).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await customTemplate.getByRole('button', { name: '删除自定义格式：已重命名自定义格式' }).click();
  await expect(customTemplate).toHaveCount(0);
  await expect(page.getByLabel('文稿标题')).toHaveValue(titleBeforeDelete);
  expect(await page.locator('.ProseMirror').innerText()).toBe(bodyBeforeDelete);
  expect(await page.locator('.toolbar-hint').innerText()).toBe(versionBeforeDelete);
  await expect(page.getByLabel('搜索写作模板')).toBeFocused();
  await expect(page.getByLabel('搜索写作模板')).toHaveValue('');
  page.off('request', recordActionRequest);
  expect(actionRequests).toEqual([]);

  await page.getByRole('button', { name: '数据迁移' }).click();
  const deletedSnapshotDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出快照' }).click();
  const deletedSnapshotPath = await (await deletedSnapshotDownload).path();
  if (!deletedSnapshotPath) throw new Error('删除格式后的快照路径不可用');
  const deletedSnapshot = JSON.parse(readFileSync(deletedSnapshotPath, 'utf8')) as { records: Array<{ kind: string; payload: Record<string, unknown> }> };
  expect(deletedSnapshot.records.some((record) => record.kind === 'setting' && record.payload.name === '已重命名自定义格式')).toBe(false);

  await page.reload();
  await page.getByRole('button', { name: '公文写作' }).click();
  await page.getByLabel('搜索写作模板').fill('已重命名自定义格式');
  await expect(page.getByText('未找到匹配模板')).toBeVisible();
  await page.getByLabel('搜索写作模板').fill('会议纪要');
  await expect(page.getByRole('button', { name: /会议纪要（一事一议）/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /重命名自定义格式：会议纪要/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /删除自定义格式：会议纪要/ })).toHaveCount(0);
});

test('keeps custom template actions touch-safe on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Responsive custom-template management is verified on the mobile project.');
  await page.getByRole('button', { name: '公文写作' }).click();
  await page.getByLabel('文稿标题').fill('移动端自定义格式');
  await page.getByRole('button', { name: '保存自定义格式' }).click();
  await page.getByLabel('搜索写作模板').fill('移动端自定义格式');
  const row = page.locator('.template-option-row').filter({ hasText: '移动端自定义格式' });
  const rename = row.getByRole('button', { name: '重命名自定义格式：移动端自定义格式' });
  const remove = row.getByRole('button', { name: '删除自定义格式：移动端自定义格式' });
  for (const action of [rename, remove]) {
    const box = await action.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('generates, edits, persists and exports a weekly report', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Weekly persistence and export are verified once.');
  await page.addInitScript(() => {
    Object.defineProperty(window, 'hxhwang', {
      configurable: true,
      value: { printPdf: async (html: string, title: string) => { window.localStorage.setItem('e2e-weekly-pdf', `${title}:${html.includes('@page')}`); return true; } }
    });
  });
  await page.reload();
  await page.getByRole('button', { name: '周报生成' }).click();
  await page.getByLabel('开始日期').fill('2026-07-20');
  await page.getByLabel('结束日期').fill('2026-07-28');
  await page.getByRole('button', { name: '重新汇总' }).click();
  await expect(page.getByLabel('周报正文')).toHaveValue(/已完成省级任务清单整理/);
  await expect(page.getByLabel('周报正文')).toHaveValue(/关于做好2026年全省重点工作的通知/);
  await expect(page.getByLabel('周报正文')).toHaveValue(/全省重点工作协调推进会/);
  await expect(page.getByLabel('周报正文')).toHaveValue(/基层服务阵地运行情况调研/);
  await expect(page.getByLabel('周报正文')).toHaveValue(/省直单位工作联系函/);
  await expect(page.getByLabel('周报正文')).toHaveValue(/A4 打印纸/);
  await page.getByLabel('周报标题').fill('端到端测试周报');
  await page.getByLabel('周报正文').fill(`${await page.getByLabel('周报正文').inputValue()}\n人工补充：数据均已复核。`);
  await page.getByRole('button', { name: '保存版本' }).click();
  await expect(page.getByRole('status')).toHaveText(/周报已保存/);

  await page.reload();
  await page.getByRole('button', { name: '周报生成' }).click();
  await page.locator('.weekly-history-open').filter({ hasText: '端到端测试周报' }).click();
  await expect(page.getByLabel('周报正文')).toHaveValue(/人工补充：数据均已复核/);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 DOCX' }).click();
  expect((await download).suggestedFilename()).toBe('端到端测试周报.docx');
  await page.getByRole('button', { name: '导出 PDF' }).click();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('e2e-weekly-pdf'))).toBe('端到端测试周报:true');
  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await page.getByTitle('删除周报 端到端测试周报').click();
  await expect(page.getByRole('button', { name: /端到端测试周报/ })).toHaveCount(0);
});

test('isolates weekly revision history by report and preserves editing state when deletion is cancelled', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Weekly revision identity and deletion are verified once in desktop Chromium.');
  await page.getByRole('button', { name: '周报生成' }).click();

  const title = page.getByLabel('周报标题');
  const body = page.getByLabel('周报正文');
  const save = page.getByRole('button', { name: '保存版本' });
  const historyTrigger = page.getByRole('button', { name: '版本历史' });
  const historyDialog = page.getByRole('dialog', { name: '查看与恢复保存版本' });
  const revisionRow = (version: number) => historyDialog.getByRole('button', { name: new RegExp(`^v${version}(?:\\s|$)`) });
  const actionRequests: string[] = [];
  const recordActionRequest = (request: { url: () => string }) => actionRequests.push(request.url());
  page.on('request', recordActionRequest);

  await title.fill('周报历史 A');
  await body.fill('周报 A 第一版正文。');
  await save.click();
  await expect(page.getByRole('status')).toHaveText(/周报已保存，本机历史已记录/);
  await expect(save).toBeEnabled();
  await body.fill('周报 A 第二版正文。');
  await save.click();
  await expect(page.getByRole('status')).toHaveText(/周报已保存，本机历史已记录/);
  await expect(save).toBeEnabled();

  await page.getByRole('button', { name: '新建' }).click();
  await title.fill('周报历史 B');
  await body.fill('周报 B 唯一保存正文。');
  await save.click();
  await expect(page.getByRole('status')).toHaveText(/周报已保存，本机历史已记录/);
  await expect(save).toBeEnabled();

  await historyTrigger.click();
  await expect(historyDialog).toBeVisible();
  await expect(historyDialog.locator('.document-revision-list-meta strong')).toHaveText('1');
  await expect(revisionRow(1)).toContainText('周报历史 B');
  await expect(historyDialog).not.toContainText('周报 A 第一版正文。');
  await expect(historyDialog).not.toContainText('周报 A 第二版正文。');
  await historyDialog.getByRole('button', { name: '关闭版本历史' }).click();

  await page.locator('.weekly-history-open').filter({ hasText: '周报历史 A' }).click();
  await expect(title).toHaveValue('周报历史 A');
  await expect(body).toHaveValue('周报 A 第二版正文。');
  await body.fill('周报 A 第二版正文。\n删除取消后仍需保留的未保存编辑。');
  const unsavedBody = await body.inputValue();
  page.once('dialog', async (confirmation) => {
    expect(confirmation.message()).toContain('确认删除该周报及其本机版本历史');
    await confirmation.dismiss();
  });
  await page.getByTitle('删除周报 周报历史 A').click();
  await expect(title).toHaveValue('周报历史 A');
  await expect(body).toHaveValue(unsavedBody);
  await expect(page.locator('.weekly-history-open').filter({ hasText: '周报历史 A' })).toBeVisible();

  await historyTrigger.click();
  await expect(historyDialog.locator('.document-revision-list-meta strong')).toHaveText('2');
  await expect(historyDialog).not.toContainText('周报 B 唯一保存正文。');
  await revisionRow(1).click();
  page.once('dialog', async (confirmation) => {
    expect(confirmation.message()).toContain('确认删除 v1 的本机历史');
    await confirmation.accept();
  });
  await historyDialog.getByRole('button', { name: '删除该版本' }).click();
  await expect(historyDialog.locator('.document-revision-list-meta strong')).toHaveText('1');
  await expect(revisionRow(1)).toHaveCount(0);
  await expect(revisionRow(2)).toHaveAttribute('aria-current', 'true');
  await historyDialog.getByRole('button', { name: '关闭版本历史' }).click();
  await expect(body).toHaveValue(unsavedBody);

  page.off('request', recordActionRequest);
  expect(actionRequests).toEqual([]);
});

test('keeps the shared revision dialog touch-safe at 390 by 844 and restores focus on Escape', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'The exact 390 by 844 revision-dialog contract is checked once in Chromium.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '公文写作' }).click();
  await page.getByLabel('文稿标题').fill('移动端版本历史');
  await page.locator('.ProseMirror').fill('移动端版本历史正文。');
  await page.getByRole('button', { name: '保存版本' }).click();
  await expect(page.getByRole('status')).toHaveText(/文稿版本已保存，本机历史已记录/);

  const historyTrigger = page.getByRole('button', { name: '版本历史' });
  await historyTrigger.focus();
  await historyTrigger.click();
  const historyDialog = page.getByRole('dialog', { name: '查看与恢复保存版本' });
  await expect(historyDialog).toBeVisible();
  expect(page.viewportSize()).toEqual({ width: 390, height: 844 });
  expect(await page.locator('body').evaluate((element) => element.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await historyDialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

  const dialogBox = await historyDialog.boundingBox();
  const navigationBox = await page.locator('.sidebar').boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(390);
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(navigationBox!.y);

  const actionHeights = await historyDialog.locator('.document-revision-action').evaluateAll((actions) => actions.map((action) => action.getBoundingClientRect().height));
  expect(actionHeights.length).toBeGreaterThanOrEqual(4);
  for (const height of actionHeights) expect(height).toBeGreaterThanOrEqual(44);

  await page.keyboard.press('Escape');
  await expect(historyDialog).toBeHidden();
  await expect(historyTrigger).toBeFocused();
  expect(await page.locator('body').evaluate((element) => element.scrollWidth <= window.innerWidth)).toBe(true);
});

test('keeps the application shell within the narrow viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Narrow viewport assertion runs only in the mobile project.');
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  const mainArea = await page.locator('.main-area').boundingBox();
  const navigation = await page.locator('.sidebar').boundingBox();
  expect(mainArea).not.toBeNull();
  expect(navigation).not.toBeNull();
  expect(mainArea!.y + mainArea!.height).toBeLessThanOrEqual(navigation!.y);
  await page.getByRole('button', { name: '文件收发' }).click();
  await expect(page.locator('.business-detail-panel')).toBeVisible();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: '公文写作' }).click();
  await page.locator('.main-area').evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => page.locator('.main-area').evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await page.getByRole('button', { name: '关于与设置' }).click();
  await expect.poll(() => page.locator('.main-area').evaluate((element) => element.scrollTop)).toBe(0);
  await expect(page.getByRole('heading', { name: '关于 HxHwang Gw' })).toBeVisible();
});

async function rejectLongYear(field: Locator, original: string) {
  await field.fill('123456-07-31');
  await field.blur();
  await expect(field).toHaveValue(original);
}

async function rejectLongDateTime(field: Locator, original: string) {
  await field.fill('123456-07-31T09:30');
  await field.blur();
  await expect(field).toHaveValue(original);
}
