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
  await page.getByRole('button', { name: '关于与设置' }).click();
  await expect(page.getByText('内网 Web 模式')).toBeVisible();
  await expect(page.getByRole('heading', { name: '同步连接' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '脱敏 AI 网关' })).toBeVisible();
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
