import path from 'node:path';
import { readFileSync } from 'node:fs';
import { expect, test, type Locator } from '@playwright/test';
import { exportDraftDocx } from '../packages/documents/src/index';

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
  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('确认删除该任务'); await dialog.dismiss(); });
  await updatedTaskRow.getByTitle('删除任务').click();
  await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('删除后无法撤销'); await dialog.accept(); });
  updatedTaskRow = page.locator('.table-row').filter({ hasText: updatedName });
  await updatedTaskRow.getByTitle('删除任务').click();
  await expect(page.getByText(updatedName, { exact: true })).toHaveCount(0);
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
  await page.getByTitle('关闭').click();
  await page.getByRole('button', { name: '数据迁移' }).click();
  await expect(page.locator('.file-drop input[type="file"]')).toBeEnabled();
  await expect(page.getByText('数据只在本机解析')).toBeVisible();
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
  await expect(page.getByLabel('服务商预设').locator('option')).toHaveText(['OpenAI', 'DeepSeek', 'Moonshot / Kimi', '智谱 GLM', '阿里云百炼 / DashScope', 'SiliconFlow', '本机 Ollama', '自定义兼容接口']);
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
    if (pathName === '/context-provider/v1/chat/completions') return route.fulfill({ json: { choices: [{ message: { content: '当前页面润色结果' } }] } });
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
  await expect(writingPanel.getByLabel('处理用途')).toHaveValue('公文润色');
  await expect(writingPanel.getByLabel('本机素材')).toHaveValue('custom');
  await expect(writingPanel.getByLabel('待处理材料')).toHaveValue(/AI 助手入口验证文稿/);
  await writingPanel.getByRole('button', { name: '生成脱敏预览' }).click();
  await writingPanel.getByLabel('我确认本次材料已脱敏、非涉密且允许发送到所选服务商').check();
  await writingPanel.getByRole('button', { name: '确认本次 AI 请求' }).click();
  await expect(writingPanel.getByText('当前页面润色结果', { exact: true })).toBeVisible();
  await expect(page.locator('.shell')).toHaveAttribute('data-tab', 'writing');
  await writingPanel.getByTitle('关闭当前页 AI 面板').click();

  await page.getByRole('button', { name: '周报生成' }).click();
  await page.getByRole('button', { name: 'AI 润色' }).click();
  await expect(page.locator('.shell')).toHaveAttribute('data-tab', 'weekly');
  const weeklyPanel = page.getByRole('dialog', { name: '当前页面 AI 协作面板' });
  await expect(weeklyPanel.getByLabel('处理用途')).toHaveValue('周报润色');
  await expect(weeklyPanel.getByLabel('待处理材料')).toHaveValue(/工作周报/);
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
  await expect(page.getByText('公开版总结结果', { exact: true })).toBeVisible();
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
  await page.getByLabel('指引名称').fill('端到端公文指引');
  await page.getByLabel('指引内容').fill('标题使用四号黑体，正文多用动宾结构。');
  await page.getByRole('button', { name: '保存指引' }).click();
  await expect(page.getByRole('status')).toHaveText(/已保存到本机/);
  await expect(page.locator('.skill-row').filter({ hasText: '端到端公文指引' })).toBeVisible();
  expect(requests).toEqual([]);

  await page.getByLabel('润色指引').selectOption({ label: '端到端公文指引' });
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
  await expect(page.getByText('按指引润色结果', { exact: true })).toBeVisible();
  const completion = requests.find((request) => request.pathname.endsWith('/chat/completions'));
  expect(completion?.body?.messages?.[0]?.content).toContain('写作指引（用户提供，须遵循且不得虚构事实）');
  expect(completion?.body?.messages?.[0]?.content).toContain('标题使用四号黑体，正文多用动宾结构。');

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
    await page.getByTitle('关闭').click();
  }
});

test('imports both legacy fixture formats and keeps archive records read-only', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'hxhwang', { configurable: true, value: { printPdf: async () => true } });
  });
  await page.reload();
  await page.getByRole('button', { name: '数据迁移' }).click();
  const importer = page.locator('.file-drop input[type="file"]');

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
  await materialRow.getByRole('button', { name: '复制为新记录' }).click();
  await expect(page.getByRole('heading', { name: '新建物资记录' })).toBeVisible();
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

  await page.getByLabel('文稿标题').fill('端到端自定义格式');
  await page.getByRole('button', { name: '保存自定义格式' }).click();
  await expect(page.getByRole('status')).toHaveText(/已保存为自定义格式/);
  await page.reload();
  await page.getByRole('button', { name: '公文写作' }).click();
  await page.getByLabel('搜索写作模板').fill('端到端自定义格式');
  await page.getByRole('button', { name: /端到端自定义格式/ }).click();
  await expect(page.locator('.ProseMirror')).toContainText('DOCX 正文');
  await expect(page.getByText(/本机自定义/).first()).toBeVisible();
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

test('keeps the application shell within the narrow viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Narrow viewport assertion runs only in the mobile project.');
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  const mainArea = await page.locator('.main-area').boundingBox();
  const navigation = await page.locator('.sidebar').boundingBox();
  expect(mainArea).not.toBeNull();
  expect(navigation).not.toBeNull();
  expect(mainArea!.y + mainArea!.height).toBeLessThanOrEqual(navigation!.y);
  await page.getByRole('button', { name: '文件收发' }).click();
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
