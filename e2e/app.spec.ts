import path from 'node:path';
import { expect, test } from '@playwright/test';

const fixture = (name: string) => path.resolve('packages', 'migration', 'test', 'fixtures', name);

test.beforeEach(async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(consoleErrors).toEqual([]);
});

test('loads the offline demo without third-party or private API traffic', async ({ page }) => {
  const unexpectedRequests: string[] = [];
  const pageOrigin = new URL(page.url()).origin;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== pageOrigin) unexpectedRequests.push(request.url());
  });

  await page.reload();
  await expect(page.getByText('推进基层治理年度工作总结')).toBeVisible();
  await expect(page.getByText('整理上级来文并建立关联')).toBeVisible();
  await expect(page.getByText('Rays688888@Gmail.com').last()).toBeVisible();
  expect(unexpectedRequests).toEqual([]);
});

test('reopens the cached demonstration while the browser is offline', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One production service-worker check is sufficient.');
  await page.evaluate(async () => { if (navigator.serviceWorker) await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByText('推进基层治理年度工作总结')).toBeVisible();
    await expect(page.getByText('数据仅保存在本机')).toBeVisible();
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
  await page.getByLabel('截止日期').fill('2026-07-31');
  await page.locator('.attachment-picker input[type="file"]').setInputFiles({ name: '测试佐证.txt', mimeType: 'text/plain', buffer: Buffer.from('local evidence') });
  await expect(page.getByText('测试佐证.txt')).toBeVisible();
  await page.getByRole('button', { name: '保存任务' }).click();
  await expect(page.getByText(originalName)).toBeVisible();
  await expect(page.locator('.table-row').filter({ hasText: originalName })).toContainText('附件 1');

  await page.reload();
  await page.getByRole('button', { name: '任务管理' }).click();
  const taskRow = page.locator('.table-row').filter({ hasText: originalName });
  await expect(taskRow).toBeVisible();
  await taskRow.getByTitle('编辑任务').click();
  await page.getByLabel('任务名称').fill(updatedName);
  await page.getByRole('button', { name: '保存任务' }).click();
  await expect(page.getByText(updatedName)).toBeVisible();

  const updatedTaskRow = page.locator('.table-row').filter({ hasText: updatedName });
  await updatedTaskRow.getByTitle('删除任务').click();
  await expect(page.getByText(updatedName)).toHaveCount(0);
});

test('keeps real attachment selection disabled on the public Pages build', async ({ page }) => {
  await page.getByRole('button', { name: '文件收发' }).click();
  await page.getByRole('button', { name: '登记文件' }).click();
  await expect(page.getByText('公开演示版禁用真实附件')).toBeVisible();
  await expect(page.locator('.attachment-picker input[type="file"]')).toBeDisabled();
});

test('keeps private sync and AI controls absent from the public Pages view', async ({ page }) => {
  await page.getByRole('button', { name: '关于与设置' }).click();
  await expect(page.getByRole('heading', { name: '同步连接' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '脱敏 AI 网关' })).toHaveCount(0);
});

test('requires a desktop bridge, local redaction preview and explicit AI confirmation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop service contract is verified once.');
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  await page.addInitScript(() => {
    Object.defineProperty(window, 'hxhwang', { configurable: true, value: { printPdf: async () => true } });
  });
  await page.route('**/v1/**', async (route) => {
    const body = (route.request().postDataJSON() || {}) as Record<string, unknown>;
    requests.push({ url: route.request().url(), body });
    const path = new URL(route.request().url()).pathname;
    if (path === '/v1/demo/session') return route.fulfill({ json: { token: 'session-token', expiresIn: 3600 } });
    if (path.endsWith('/push')) return route.fulfill({ json: { conflicts: [] } });
    if (path.endsWith('/pull')) return route.fulfill({ json: { documents: [], checkpoint: null } });
    if (path === '/v1/ai/generate') return route.fulfill({ json: { result: { text: '已生成提纲' }, audit: { purpose: '起草提纲', provider: 'localhost', model: 'qwen', contentHash: 'hash', createdAt: 'now' } } });
    return route.abort();
  });
  await page.reload();
  await page.getByRole('button', { name: '关于与设置' }).click();
  await page.getByLabel('私有 API 地址').fill(new URL(page.url()).origin);
  await page.getByLabel('一次性访问码').fill('long-access-code');
  await page.getByRole('button', { name: '建立会话' }).click();
  await expect(page.getByRole('status')).toHaveText(/内网会话已建立/);
  await expect.poll(() => requests.map((request) => `${request.url}:${JSON.stringify(request.body)}`)).toContainEqual(expect.stringContaining('/v1/demo/session'));
  await expect(page.getByRole('button', { name: '同步任务与文件' })).toBeEnabled();
  await expect(page.getByLabel('一次性访问码')).toHaveValue('');
  await page.getByRole('button', { name: '同步任务与文件' }).click();
  await expect(page.getByRole('status')).toHaveText(/同步完成：/);
  expect(requests.some((request) => request.url.includes('/v1/sync/tasks/pull'))).toBe(true);
  expect(requests.some((request) => request.url.includes('/v1/sync/tasks/push'))).toBe(true);
  await page.getByLabel('待处理材料').fill('联系人：张三，手机13812345678，邮箱a.b@example.com');
  await page.getByRole('button', { name: '生成脱敏预览' }).click();
  await expect(page.getByLabel('脱敏预览（可继续修改）')).toHaveValue('联系人：[姓名]，手机[手机号]，邮箱[邮箱]');
  expect(requests.some((request) => request.url.endsWith('/v1/ai/generate'))).toBe(false);
  await page.getByRole('button', { name: '确认本次发送' }).click();
  await expect(page.getByText(/已生成提纲/)).toBeVisible();
  const aiRequest = requests.find((request) => request.url.endsWith('/v1/ai/generate'));
  expect(aiRequest?.body).toEqual({ redactedContent: '联系人：[姓名]，手机[手机号]，邮箱[邮箱]', redacted: true, confirmed: true, purpose: '起草提纲' });
});

test('imports both legacy fixture formats and keeps archive records read-only', async ({ page }) => {
  await page.getByRole('button', { name: '数据迁移' }).click();
  const importer = page.locator('input[type="file"]');

  await importer.setInputFiles(fixture('upgrade04.json'));
  await expect(page.getByText('任务管理系统LV08')).toBeVisible();
  await page.getByRole('button', { name: '历史档案' }).click();
  await expect(page.getByText('旧版会议')).toBeVisible();
  await expect(page.getByText('旧版用章')).toBeVisible();
  await expect(page.locator('.archive-columns [title]')).toHaveCount(0);

  await page.getByRole('button', { name: '数据迁移' }).click();
  await importer.setInputFiles(fixture('wenxibuddy0722.json'));
  await expect(page.getByRole('heading', { name: /导出格式未区分/ })).toBeVisible();
  await expect(page.getByText(/无法仅凭导出包可靠区分/)).toBeVisible();
  await page.getByRole('button', { name: '历史档案' }).click();
  await expect(page.getByText('周报', { exact: true })).toBeVisible();
});

test('exports and restores a local snapshot', async ({ page }) => {
  const restoredTask = '推进基层治理年度工作总结';
  await page.getByRole('button', { name: '数据迁移' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出快照' }).click();
  const snapshotPath = await (await downloadPromise).path();
  if (!snapshotPath) throw new Error('本地快照下载路径不可用');

  await page.getByRole('button', { name: '任务管理' }).click();
  const taskRow = page.locator('.table-row').filter({ hasText: restoredTask });
  await taskRow.getByTitle('删除任务').click();
  await expect(page.getByText(restoredTask)).toHaveCount(0);

  await page.getByRole('button', { name: '数据迁移' }).click();
  await page.locator('input[type="file"]').setInputFiles(snapshotPath);
  await expect(page.getByText('本地快照恢复完成')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'HxHwang Gw 本地快照' })).toBeVisible();
  await page.getByRole('button', { name: '任务管理' }).click();
  await expect(page.getByText(restoredTask)).toBeVisible();
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
  await expect(page.locator('.ProseMirror')).toContainText('审议通过事项');
  await expect(page.getByText('授权教材建议').first()).toBeVisible();
  await page.getByRole('button', { name: '保存版本' }).click();
  await expect(page.getByText('文稿版本已保存')).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 DOCX' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.docx$/);
  await page.getByRole('button', { name: '导出 PDF' }).click();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('e2e-pdf'))).toContain(':true');
});

test('keeps the application shell within the narrow viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Narrow viewport assertion runs only in the mobile project.');
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: '文件收发' }).click();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});
