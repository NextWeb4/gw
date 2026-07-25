import { expect, test } from '@playwright/test';

test('does not contact an AI provider until model retrieval and sends only confirmed redacted content', async ({ page }) => {
  const requests: Array<{ method: string; url: string; authorization?: string; body?: Record<string, unknown> }> = [];
  await page.route('**/provider/v1/**', async (route) => {
    const request = route.request();
    requests.push({
      method: request.method(),
      url: request.url(),
      authorization: request.headers().authorization,
      body: request.method() === 'POST' ? (request.postDataJSON() || {}) as Record<string, unknown> : undefined
    });
    const path = new URL(request.url()).pathname;
    if (path === '/provider/v1/models') return route.fulfill({ json: { data: [{ id: 'model-b' }, { id: 'model-a' }] } });
    if (path === '/provider/v1/chat/completions') return route.fulfill({ json: { choices: [{ message: { content: '互联网模型结果' } }] } });
    return route.abort();
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: '关于与设置' }).click();
  await expect(page.getByText(/互联网版仅在你明确配置兼容 API/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '同步连接' })).toHaveCount(0);
  expect(requests).toEqual([]);

  const origin = new URL(page.url()).origin;
  await page.getByLabel('请求地址').fill(`${origin}/provider/v1`);
  await page.getByLabel('API Key（仅当前会话）').fill('memory-only-key');
  await page.getByRole('button', { name: '获取 AI 模型' }).click();
  await expect(page.getByLabel('选择模型')).toHaveValue('model-a');
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ method: 'GET', authorization: 'Bearer memory-only-key' });
  expect(requests[0]?.url).toBe(`${origin}/provider/v1/models`);

  await page.getByLabel('待处理材料').fill('联系人：张三，手机13812345678');
  await page.getByRole('button', { name: '生成脱敏预览' }).click();
  await expect(page.getByLabel('脱敏预览（可继续修改）')).toHaveValue('联系人：[姓名]，手机[手机号]');
  expect(requests).toHaveLength(1);
  await page.getByRole('button', { name: '确认本次互联网请求' }).click();
  await expect(page.getByText(/互联网模型结果/)).toBeVisible();
  expect(requests[1]).toMatchObject({ method: 'POST', authorization: 'Bearer memory-only-key', body: { model: 'model-a' } });
  expect(requests[1]?.url).toBe(`${origin}/provider/v1/chat/completions`);
});
