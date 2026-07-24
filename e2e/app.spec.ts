import path from 'node:path';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const fixture = (name: string) => path.resolve('packages', 'migration', 'test', 'fixtures', name);

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
  await expect(page.getByText('推进基层治理年度工作总结')).toBeVisible();
  await expect(page.getByText('整理上级来文并建立关联')).toBeVisible();
  if (testInfo.project.name === 'chromium') await expect(page.getByText('数据仅保存在本机')).toBeVisible();
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
  await page.getByRole('button', { name: '添加配合单位' }).click();
  await page.getByLabel('配合单位名称 1').fill('综合协调单位');
  await page.getByLabel('配合单位状态 1').selectOption('progress');
  await page.getByRole('button', { name: '添加阶段' }).click();
  await page.getByLabel('阶段名称 1').fill('材料汇总');
  await page.getByRole('button', { name: '添加阶段 1 配合单位' }).click();
  await page.getByLabel('阶段 1 配合单位名称 1').fill('数据提供单位');
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
  await expect(page.getByText(updatedName)).toBeVisible();
  await expect(page.locator('.table-row').filter({ hasText: updatedName })).toContainText('附件 0');

  const updatedTaskRow = page.locator('.table-row').filter({ hasText: updatedName });
  await updatedTaskRow.getByTitle('删除任务').click();
  await expect(page.getByText(updatedName)).toHaveCount(0);
});

test('keeps real attachment selection disabled on the public Pages build', async ({ page }) => {
  await page.getByRole('button', { name: '文件收发' }).click();
  await page.getByRole('button', { name: '登记文件' }).click();
  await expect(page.getByText('公开演示版禁用真实附件')).toBeVisible();
  await expect(page.locator('.attachment-picker input[type="file"]')).toBeDisabled();
  await page.getByTitle('关闭').click();
  await page.getByRole('button', { name: '数据迁移' }).click();
  await expect(page.locator('.file-drop input[type="file"]')).toBeDisabled();
  await expect(page.getByText('公开演示版已禁用导入')).toBeVisible();
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
  await expect(page.getByText('本机存储 · 同步需手动触发')).toBeVisible();
  await page.getByRole('button', { name: '关于与设置' }).click();
  await page.getByLabel('私有 API 地址').fill(new URL(page.url()).origin);
  await page.getByLabel('一次性访问码').fill('long-access-code');
  await page.getByRole('button', { name: '建立会话' }).click();
  await expect(page.getByRole('status')).toHaveText(/内网会话已建立/);
  await expect.poll(() => requests.map((request) => `${request.url}:${JSON.stringify(request.body)}`)).toContainEqual(expect.stringContaining('/v1/demo/session'));
  await expect(page.getByRole('button', { name: '同步业务数据' })).toBeEnabled();
  await expect(page.getByLabel('一次性访问码')).toHaveValue('');
  await page.getByRole('button', { name: '同步业务数据' }).click();
  await expect(page.getByRole('status')).toHaveText(/同步完成：/);
  expect(requests.some((request) => request.url.includes('/v1/sync/tasks/pull'))).toBe(true);
  expect(requests.some((request) => request.url.includes('/v1/sync/tasks/push'))).toBe(true);
  expect(requests.some((request) => request.url.includes('/v1/sync/weekly-reports/pull'))).toBe(true);
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
  await page.addInitScript(() => {
    Object.defineProperty(window, 'hxhwang', { configurable: true, value: { printPdf: async () => true } });
  });
  await page.reload();
  await page.getByRole('button', { name: '数据迁移' }).click();
  const importer = page.locator('input[type="file"]');

  await importer.setInputFiles(fixture('upgrade04.json'));
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
  await expect(page.locator('.archive-columns button:not([aria-label^="下载附件"])')).toHaveCount(0);

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
  await expect(page.getByLabel('周报正文')).toHaveValue(/已完成任务清单整理/);
  await expect(page.getByLabel('周报正文')).toHaveValue(/关于做好年度重点工作的通知/);
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
  await page.getByTitle('删除周报 端到端测试周报').click();
  await expect(page.getByRole('button', { name: /端到端测试周报/ })).toHaveCount(0);
});

test('keeps the application shell within the narrow viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Narrow viewport assertion runs only in the mobile project.');
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: '文件收发' }).click();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});
