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
  await expect(page.getByText('推进全省基层治理年度工作总结')).toHaveCount(0);
  await page.getByRole('button', { name: '任务管理' }).click();
  await expect(page.getByText('没有匹配的任务')).toBeVisible();
  await page.getByRole('button', { name: '关于与设置' }).click();
  await expect(page.getByText(/互联网版仅在你明确配置兼容 API/)).toBeVisible();
  await page.getByRole('button', { name: 'AI 助手', exact: true }).click();
  await expect(page.getByRole('heading', { name: '同步连接' })).toHaveCount(0);
  const sectionNav = page.getByRole('navigation', { name: 'AI 页面分区' });
  await expect(sectionNav).toBeVisible();
  await sectionNav.getByRole('link', { name: '历史回答' }).click();
  await expect.poll(() => page.locator('#ai-history').evaluate((element) => element.getBoundingClientRect().top < 170)).toBe(true);
  await sectionNav.getByRole('link', { name: '本次协作' }).click();
  expect(requests).toEqual([]);

  const origin = new URL(page.url()).origin;
  const connectionDetails = page.locator('details.full-ai-connection');
  expect(await connectionDetails.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(true);
  await page.getByLabel('请求地址').fill(`${origin}/provider/v1`);
  await page.getByLabel('API Key（仅当前会话）').fill('memory-only-key');
  await page.getByRole('button', { name: '获取 AI 模型' }).click();
  await expect(page.getByLabel('选择模型')).toHaveValue('model-b');
  await expect.poll(() => connectionDetails.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ method: 'GET', authorization: 'Bearer memory-only-key' });
  expect(requests[0]?.url).toBe(`${origin}/provider/v1/models`);

  await page.getByLabel('待处理材料').fill('联系人：张三，手机13812345678');
  await page.getByRole('button', { name: '生成脱敏预览' }).click();
  await expect(page.getByLabel('脱敏预览（可继续修改）')).toHaveValue('联系人：[姓名]，手机[手机号]');
  expect(requests).toHaveLength(1);
  const confirmation = page.getByLabel('我确认本次材料已脱敏、非涉密且允许发送到所选服务商');
  await confirmation.check();
  await connectionDetails.locator('summary').click();
  await page.getByLabel('请求地址').fill(`${origin}/provider/v1/`);
  await expect(confirmation).not.toBeChecked();
  await expect(page.getByLabel('选择模型')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '确认本次 AI 请求' })).toBeDisabled();
  expect(requests).toHaveLength(1);
  await page.getByRole('button', { name: '获取 AI 模型' }).click();
  await expect(page.getByLabel('选择模型')).toHaveValue('model-b');
  await connectionDetails.locator('summary').click();
  await page.getByLabel('API Key（仅当前会话）').fill('rotated-memory-only-key');
  await expect(confirmation).not.toBeChecked();
  await confirmation.check();
  await page.getByRole('button', { name: '确认本次 AI 请求' }).click();
  await expect(page.locator('.ai-readable-result')).toHaveText('互联网模型结果');
  expect(requests).toHaveLength(3);
  expect(requests[2]).toMatchObject({ method: 'POST', authorization: 'Bearer rotated-memory-only-key', body: { model: 'model-b' } });
  expect(requests[2]?.url).toBe(`${origin}/provider/v1/chat/completions`);
});

test('prevents duplicate generation and keeps the last successful result when the user stops waiting', async ({ page }) => {
  test.setTimeout(45_000);
  let generationRequests = 0;
  const delayedResponseMs = 5_000;
  await page.route('**/generation-provider/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/generation-provider/v1/models') return route.fulfill({ json: { data: [{ id: 'generation-model' }] } });
    if (path === '/generation-provider/v1/chat/completions') {
      generationRequests += 1;
      if (generationRequests === 1) return route.fulfill({ json: { choices: [{ message: { content: '上一条成功结果' } }] } });
      if (generationRequests === 4) return route.fulfill({ status: 503, json: { error: 'temporary_failure' } });
      await new Promise((resolve) => setTimeout(resolve, delayedResponseMs));
      try { await route.fulfill({ json: { choices: [{ message: { content: `迟到结果 ${generationRequests}` } }] } }); } catch { /* Browser request was actively aborted. */ }
      return;
    }
    return route.abort();
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'AI 助手' }).click();
  const origin = new URL(page.url()).origin;
  await page.getByLabel('请求地址').fill(`${origin}/generation-provider/v1`);
  await page.getByRole('button', { name: '获取 AI 模型' }).click();
  await page.getByLabel('待处理材料').fill('联系人：张三，手机13812345678');
  await page.getByRole('button', { name: '生成脱敏预览' }).click();
  const confirmation = page.getByLabel('我确认本次材料已脱敏、非涉密且允许发送到所选服务商');
  await confirmation.check();
  await page.getByRole('button', { name: '确认本次 AI 请求' }).click();
  await expect(page.locator('.ai-readable-result')).toHaveText('上一条成功结果');
  await expect(page.locator('.ai-history-row')).toHaveCount(1);
  await expect(confirmation).not.toBeChecked();

  await confirmation.check();
  await page.getByRole('button', { name: '确认本次 AI 请求' }).click();
  const busyButton = page.getByRole('button', { name: '正在生成结果' });
  await expect(busyButton).toBeDisabled();
  await expect(confirmation).toBeDisabled();
  await busyButton.evaluate((button: HTMLButtonElement) => button.click());
  await expect.poll(() => generationRequests).toBe(2);
  await expect(page.getByRole('button', { name: '停止等待生成结果' })).toBeVisible();
  await page.getByRole('button', { name: '停止等待生成结果' }).click();
  await expect(page.getByText('已停止等待；上次成功结果保持不变')).toBeVisible();
  await expect(confirmation).toBeEnabled();
  await page.waitForTimeout(delayedResponseMs + 150);
  await expect(page.locator('.ai-readable-result')).toHaveText('上一条成功结果');
  await expect(page.locator('.ai-history-row')).toHaveCount(1);
  await expect(confirmation).not.toBeChecked();

  await confirmation.check();
  await page.getByRole('button', { name: '确认本次 AI 请求' }).click();
  await expect(page.getByRole('button', { name: '正在生成结果' })).toBeDisabled();
  await page.getByRole('button', { name: '生成脱敏预览' }).click();
  await expect(page.getByRole('button', { name: '正在生成结果' })).toHaveCount(0);
  await page.waitForTimeout(delayedResponseMs + 150);
  await expect.poll(() => generationRequests).toBe(3);
  await expect(page.getByText(/迟到结果/)).toHaveCount(0);
  await expect(page.locator('.ai-history-row')).toHaveCount(1);
  await expect(confirmation).not.toBeChecked();

  await page.getByLabel('处理用途').selectOption('任务总结');
  await confirmation.check();
  await page.getByRole('button', { name: '确认本次 AI 请求' }).click();
  await expect(page.getByText(/AI 服务请求失败：503/)).toBeVisible();
  await expect.poll(() => generationRequests).toBe(4);
  await expect(page.locator('.ai-history-row')).toHaveCount(1);
  await expect(confirmation).not.toBeChecked();
});

test('ignores a late desktop IPC generation result after the user stops waiting', async ({ page }) => {
  test.setTimeout(45_000);
  const delayedResponseMs = 5_000;
  await page.addInitScript(() => {
    Object.defineProperty(window, 'hxhwang', {
      configurable: true,
      value: {
        printPdf: async () => true,
        listAiModels: async () => ['desktop-late-model'],
        generateAi: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5_000));
          return { choices: [{ message: { content: '不应写入的桌面迟到结果' } }] };
        }
      }
    });
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await page.getByRole('button', { name: '获取 AI 模型' }).click();
  await page.getByLabel('待处理材料').fill('已确认的桌面材料');
  await page.getByRole('button', { name: '生成脱敏预览' }).click();
  const confirmation = page.getByLabel('我确认本次材料已脱敏、非涉密且允许发送到所选服务商');
  await confirmation.check();
  await page.getByRole('button', { name: '确认本次 AI 请求' }).click();
  await expect(page.getByRole('button', { name: '正在生成结果' })).toBeDisabled();
  await page.getByRole('button', { name: '停止等待生成结果' }).click();
  await page.waitForTimeout(delayedResponseMs + 150);
  await expect(page.getByText('不应写入的桌面迟到结果')).toHaveCount(0);
  await expect(page.locator('.ai-history-row')).toHaveCount(0);
  await expect(confirmation).not.toBeChecked();
});

test('filters a large model catalog and ignores a late response from an obsolete endpoint', async ({ page }) => {
  const longModelId = 'fresh-model-14-with-a-very-long-identifier-for-mobile-layout';
  let slowResponseCompleted = false;
  await page.route('**/slow-provider/v1/models', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 450));
    slowResponseCompleted = true;
    await route.fulfill({ json: { data: [{ id: 'stale-model' }] } });
  });
  await page.route('**/fast-provider/v1/models', async (route) => {
    await route.fulfill({ json: { data: Array.from({ length: 15 }, (_, index) => ({ id: index === 14 ? longModelId : `fresh-model-${String(index).padStart(2, '0')}` })) } });
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'AI 助手' }).click();
  const origin = new URL(page.url()).origin;
  const modelButton = page.getByRole('button', { name: '获取 AI 模型' });

  await page.getByLabel('请求地址').fill(`${origin}/slow-provider/v1`);
  await modelButton.click();
  await expect(page.getByRole('button', { name: '正在获取模型' })).toBeDisabled();

  await page.getByLabel('请求地址').fill(`${origin}/fast-provider/v1`);
  await page.getByRole('button', { name: '获取 AI 模型' }).click();
  await expect(page.getByLabel('选择模型')).toHaveValue('fresh-model-00');
  await page.locator('details.full-ai-connection').locator('summary').click();
  await expect(page.getByText('15 个模型')).toBeVisible();

  await page.getByLabel('筛选模型').fill('14');
  await expect(page.getByLabel('选择模型').locator('option')).toContainText(['当前 · fresh-model-00', longModelId]);
  await page.getByLabel('选择模型').selectOption(longModelId);
  await expect(page.locator('.model-current-selection code')).toHaveText(longModelId);
  await expect.poll(() => page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel('筛选模型').fill('no-such-model');
  await expect(page.getByText('没有匹配项；当前模型仍保留，可清除筛选后重新选择')).toBeVisible();
  await expect(page.getByLabel('选择模型').locator('option')).toHaveText([`当前 · ${longModelId}`]);
  await expect(page.getByLabel('选择模型')).toHaveValue(longModelId);
  await page.getByRole('button', { name: '清除模型筛选' }).click();
  await expect(page.getByLabel('选择模型').locator('option')).toHaveCount(15);
  await expect(page.getByText('匹配 15 / 15')).toBeVisible();
  await expect.poll(() => slowResponseCompleted).toBe(true);
  await expect(page.getByLabel('选择模型')).toHaveValue(longModelId);
});

test('refreshes models without dropping the last good catalog and lets the user stop waiting', async ({ page }) => {
  let requestCount = 0;
  await page.route('**/refresh-provider/v1/models', async (route) => {
    requestCount += 1;
    if (requestCount === 1) return route.fulfill({ json: { data: [{ id: 'provider-model-b' }, { id: 'provider-model-a' }, { id: 'provider-model-c' }] } });
    if (requestCount === 2) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      try { await route.fulfill({ json: { data: [{ id: 'obsolete-after-cancel' }] } }); } catch { /* Browser request was actively aborted. */ }
      return;
    }
    if (requestCount === 3) return route.fulfill({ json: { data: [{ id: 'provider-model-new' }, { id: 'provider-model-b' }, { id: 'provider-model-a' }] } });
    return route.fulfill({ status: 503, json: { error: 'temporary_failure' } });
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'AI 助手' }).click();
  const origin = new URL(page.url()).origin;
  await page.getByLabel('请求地址').fill(`${origin}/refresh-provider/v1`);
  await page.getByRole('button', { name: '获取 AI 模型' }).click();
  await expect(page.getByLabel('选择模型')).toHaveValue('provider-model-b');
  await page.locator('details.full-ai-connection').locator('summary').click();
  await expect(page.getByLabel('选择模型').locator('option')).toHaveText(['provider-model-b', 'provider-model-a', 'provider-model-c']);

  await page.getByRole('button', { name: '刷新 AI 模型' }).click();
  await expect(page.getByRole('button', { name: '正在刷新模型' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '停止等待' })).toBeVisible();
  await expect(page.getByLabel('选择模型')).toHaveValue('provider-model-b');
  await expect(page.getByLabel('选择模型').locator('option')).toHaveText(['provider-model-b', 'provider-model-a', 'provider-model-c']);
  await page.getByRole('button', { name: '停止等待' }).click();
  await expect(page.getByText('已停止等待；当前模型目录保持不变')).toBeVisible();
  await page.waitForTimeout(550);
  await expect(page.getByLabel('选择模型')).toHaveValue('provider-model-b');

  await page.getByRole('button', { name: '刷新 AI 模型' }).click();
  await expect(page.getByLabel('选择模型')).toHaveValue('provider-model-b');
  await expect(page.getByLabel('选择模型').locator('option')).toHaveText(['provider-model-new', 'provider-model-b', 'provider-model-a']);

  await page.getByRole('button', { name: '刷新 AI 模型' }).click();
  await expect(page.getByText(/AI 服务请求失败：503.*已保留上次模型目录/)).toBeVisible();
  await expect(page.getByLabel('选择模型')).toHaveValue('provider-model-b');
  await expect(page.getByLabel('选择模型').locator('option')).toHaveText(['provider-model-new', 'provider-model-b', 'provider-model-a']);
});

test('uses the restricted desktop bridge for Internet-edition AI', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'hxhwang', {
      configurable: true,
      value: {
        printPdf: async () => true,
        listAiModels: async (baseUrl: string, apiKey: string) => {
          window.localStorage.setItem('desktop-model-request', JSON.stringify({ baseUrl, apiKey }));
          return ['desktop-summary-model'];
        },
        generateAi: async (payload: Record<string, unknown>) => {
          window.localStorage.setItem('desktop-ai-request', JSON.stringify(payload));
          return { choices: [{ message: { content: '桌面客户端总结结果' } }] };
        }
      }
    });
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.getByText('桌面互联网版', { exact: true }).first()).toBeVisible();
  await page.getByLabel('请求地址').fill('https://desktop-provider.example/v1');
  await page.getByLabel('API Key（仅当前会话）').fill('desktop-session-key');
  await page.getByRole('button', { name: '获取 AI 模型' }).click();
  await expect(page.getByLabel('选择模型')).toHaveValue('desktop-summary-model');
  await page.getByLabel('处理用途').selectOption('任务总结');
  await page.getByLabel('待处理材料').fill('联系人：张三，手机13812345678，完成桌面端总结。');
  await page.getByRole('button', { name: '生成脱敏预览' }).click();
  await page.getByLabel('我确认本次材料已脱敏、非涉密且允许发送到所选服务商').check();
  await page.getByRole('button', { name: '确认本次 AI 请求' }).click();
  await expect(page.locator('.ai-readable-result')).toHaveText('桌面客户端总结结果');
  await expect.poll(() => page.evaluate(() => JSON.parse(window.localStorage.getItem('desktop-model-request') || '{}'))).toEqual({ baseUrl: 'https://desktop-provider.example/v1', apiKey: 'desktop-session-key' });
  await expect.poll(() => page.evaluate(() => JSON.parse(window.localStorage.getItem('desktop-ai-request') || '{}'))).toMatchObject({
    baseUrl: 'https://desktop-provider.example/v1',
    apiKey: 'desktop-session-key',
    model: 'desktop-summary-model',
    purpose: '任务总结',
    redacted: true,
    confirmed: true,
    redactedContent: '联系人：[姓名]，手机[手机号]，完成桌面端总结。'
  });
});

test('unlocks local mystery providers, refreshes their revision and proxies only confirmed redacted content', async ({ page }) => {
  const relayRequests: Array<{ method: string; pathname: string; session?: string; body?: Record<string, unknown> }> = [];
  await page.route('http://127.0.0.1:8787/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const corsHeaders = {
      'access-control-allow-origin': 'http://127.0.0.1:4175',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,x-relay-session',
      'access-control-allow-private-network': 'true'
    };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders });
    const body = request.method() === 'POST' ? request.postDataJSON() as Record<string, unknown> : undefined;
    relayRequests.push({ method: request.method(), pathname: url.pathname, session: request.headers()['x-relay-session'], body });
    if (url.pathname === '/v1/relay/session') {
      if (body?.password !== 'browser-memory-password') return route.fulfill({ status: 401, headers: corsHeaders, json: { error: 'invalid_relay_password' } });
      return route.fulfill({ headers: corsHeaders, json: { token: 'relay-browser-session', expiresIn: 3600 } });
    }
    if (request.headers()['x-relay-session'] !== 'relay-browser-session') return route.fulfill({ status: 401, headers: corsHeaders, json: { error: 'relay_session_required' } });
    if (url.pathname === '/v1/relay/providers') return route.fulfill({ headers: corsHeaders, json: { revision: 'relay-revision-2', providers: [{ id: 'mystery-01', label: '神秘站点 01', defaultModel: 'mystery-model' }, { id: 'mystery-02', label: '神秘站点 02', defaultModel: '' }] } });
    if (url.pathname === '/v1/relay/providers/mystery-01/models') return route.fulfill({ headers: corsHeaders, json: { models: ['mystery-model', 'mystery-model-lite'], defaultModel: 'mystery-model' } });
    if (url.pathname === '/v1/relay/providers/mystery-01/generate') return route.fulfill({ headers: corsHeaders, json: { result: { choices: [{ message: { content: '神秘站点生成结果' } }] }, audit: { purpose: body?.purpose, provider: '神秘站点 01', model: body?.model, contentHash: 'hash', createdAt: 'now' } } });
    return route.fulfill({ status: 404, headers: corsHeaders, json: { error: 'not_found' } });
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'AI 助手' }).click();
  expect(relayRequests).toEqual([]);
  await page.getByLabel('服务商预设').selectOption('relay');
  await expect(page.getByText(/Chrome 会询问是否允许“本地网络访问”/)).toBeVisible();
  await expect(page.getByText('可先在本机管理页点击“测试已保存配置”检查模型列表')).toBeVisible();
  await expect(page.getByRole('link', { name: '打开本机管理页' })).toHaveAttribute('href', 'http://127.0.0.1:8787/relay-admin');
  await page.getByLabel('中转站密码（仅当前会话）').fill('browser-memory-password');
  expect(relayRequests).toEqual([]);
  await page.getByRole('button', { name: '解锁并刷新站点' }).click();
  await expect(page.getByLabel('服务商预设')).toHaveValue('relay:mystery-01');
  await expect(page.getByLabel('服务商预设').locator('option')).toContainText(['神秘 · 神秘站点 01', '神秘 · 神秘站点 02']);
  await expect(page.getByText(/revision relay-revision-2/)).toBeVisible();
  await expect(page.getByLabel('中转站密码（仅当前会话）')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '打开本机管理页' })).toHaveAttribute('href', 'http://127.0.0.1:8787/relay-admin');

  const beforeRefresh = relayRequests.length;
  await page.getByRole('button', { name: '刷新站点' }).click();
  await expect.poll(() => relayRequests.length).toBe(beforeRefresh + 1);
  await page.getByRole('button', { name: '获取中转站模型' }).click();
  await expect(page.getByLabel('选择模型')).toHaveValue('mystery-model');
  await page.getByLabel('待处理材料').fill('联系人：张三，手机13812345678');
  await page.getByRole('button', { name: '生成脱敏预览' }).click();
  await page.getByLabel('我确认本次材料已脱敏、非涉密且允许发送到所选服务商').check();
  await page.getByRole('button', { name: '确认本次 AI 请求' }).click();
  await expect(page.locator('.ai-readable-result')).toHaveText('神秘站点生成结果');
  const generated = relayRequests.find((request) => request.pathname.endsWith('/generate'));
  expect(generated).toMatchObject({ session: 'relay-browser-session', body: { model: 'mystery-model', redactedContent: '联系人：[姓名]，手机[手机号]', redacted: true, confirmed: true } });
  expect(JSON.stringify(relayRequests)).not.toContain('relay.example');
  expect(JSON.stringify(relayRequests)).not.toContain('apiKey');

  await page.reload();
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.getByLabel('服务商预设')).toHaveValue('deepseek');
});
