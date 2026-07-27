import { expect, test } from '@playwright/test';

test('enables private controls without contacting a service before explicit connection', async ({ page }) => {
  const unexpectedRequests: string[] = [];
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== 'http://127.0.0.1:4174') unexpectedRequests.push(request.url());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('推进全省基层治理年度工作总结')).toHaveCount(0);
  await page.getByRole('button', { name: '任务管理' }).click();
  await expect(page.getByText('没有匹配的任务')).toBeVisible();
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.getByText('内网版', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '同步连接' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '总结与润色' })).toBeVisible();
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain('connect-src https: http://127.0.0.1:* http://localhost:*');

  await page.getByRole('button', { name: '文件收发' }).click();
  await page.getByRole('button', { name: '登记文件' }).click();
  await expect(page.locator('.attachment-picker input[type="file"]')).toBeEnabled();
  await page.getByTitle('关闭').click();
  await page.getByRole('button', { name: '数据迁移' }).click();
  await expect(page.locator('.file-drop input[type="file"]')).toBeEnabled();
  expect(unexpectedRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('retrieves internal models and sends only explicitly confirmed redacted content through the gateway', async ({ page }) => {
  const requests: Array<{ method: string; url: string; body?: Record<string, unknown> }> = [];
  await page.route('**/v1/**', async (route) => {
    const request = route.request();
    const body = request.method() === 'POST' ? (request.postDataJSON() || {}) as Record<string, unknown> : undefined;
    requests.push({ method: request.method(), url: request.url(), body });
    const path = new URL(request.url()).pathname;
    if (path === '/v1/demo/session') return route.fulfill({ json: { token: 'session-token', expiresIn: 3600 } });
    if (path === '/v1/ai/models') return route.fulfill({ json: { models: ['qwen3:4b', 'qwen3:8b'], defaultModel: 'qwen3:8b' } });
    if (path.endsWith('/push')) return route.fulfill({ json: { conflicts: [] } });
    if (path.endsWith('/pull')) return route.fulfill({ json: { documents: [], checkpoint: null } });
    if (path === '/v1/ai/generate') return route.fulfill({ json: { result: { choices: [{ message: { content: '内部模型结果' } }] }, audit: { purpose: '提纲生成', provider: 'localhost', model: 'qwen3:8b', contentHash: 'hash', createdAt: 'now' } } });
    return route.abort();
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'AI 助手' }).click();
  expect(requests).toEqual([]);
  await page.getByLabel('内部 API 地址').fill(new URL(page.url()).origin);
  await page.getByLabel('一次性访问码').fill('long-access-code');
  await page.getByRole('button', { name: '建立会话' }).click();
  await expect(page.getByRole('status')).toHaveText(/内网会话已建立/);
  await expect(page.getByLabel('一次性访问码')).toHaveValue('');

  const requestsAfterFirstSession = requests.length;
  await page.getByLabel('内部 API 地址').fill(`${new URL(page.url()).origin}/`);
  await expect(page.getByRole('button', { name: '获取内部模型' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '同步全部业务数据' })).toBeDisabled();
  expect(requests).toHaveLength(requestsAfterFirstSession);
  await page.getByLabel('一次性访问码').fill('second-access-code');
  await page.getByRole('button', { name: '建立会话' }).click();
  await expect(page.getByRole('status')).toHaveText(/内网会话已建立/);

  await page.getByRole('button', { name: '获取内部模型' }).click();
  const modelSelect = page.getByRole('combobox', { name: '内部模型', exact: true });
  await expect(modelSelect).toHaveValue('qwen3:8b');
  await expect(modelSelect.locator('option')).toHaveText(['qwen3:4b', 'qwen3:8b']);
  await page.getByLabel('待处理材料').fill('联系人：张三，手机13812345678，邮箱a.b@example.com');
  await page.getByRole('button', { name: '生成脱敏预览' }).click();
  await expect(page.getByLabel('脱敏预览（可继续修改）')).toHaveValue('联系人：[姓名]，手机[手机号]，邮箱[邮箱]');
  expect(requests.some((request) => request.url.endsWith('/v1/ai/generate'))).toBe(false);
  const confirmation = page.getByLabel('我确认本次材料已脱敏且允许发送到内部模型');
  await confirmation.check();
  await modelSelect.selectOption('qwen3:4b');
  await expect(confirmation).not.toBeChecked();
  await confirmation.check();
  await page.getByRole('button', { name: '确认发送到内部 AI' }).click();
  await expect(page.locator('.ai-readable-result')).toHaveText('内部模型结果');
  const aiRequest = requests.find((request) => request.url.endsWith('/v1/ai/generate'));
  expect(aiRequest?.body).toEqual({ redactedContent: '联系人：[姓名]，手机[手机号]，邮箱[邮箱]', redacted: true, confirmed: true, purpose: '提纲生成', model: 'qwen3:4b' });
});
