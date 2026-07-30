import { describe, expect, it, vi } from 'vitest';
import { AI_MAX_CONTENT_LENGTH, AI_MAX_GUIDANCE_LENGTH, AI_PROVIDER_PRESETS, composeAiSystemPrompt, DirectAiClient, extractOpenAiText, PrivateSyncClient, redactSensitiveContent, RelayAiClient, resolveOpenAiEndpoint } from './index.js';

describe('private sync client', () => {
  it('redacts common identifiers locally before any AI request is created', () => {
    expect(redactSensitiveContent('联系人：张三，手机13812345678，邮箱a.b@example.com，身份证11010119900101123X'))
      .toBe('联系人：[姓名]，手机[手机号]，邮箱[邮箱]，身份证[身份证号]');
  });

  it('redacts a phone-number email address as a whole instead of leaking the domain', () => {
    expect(redactSensitiveContent('备用邮箱13812345678@example.com')).toBe('备用邮箱[邮箱]');
  });

  it('does not treat an 11-digit slice inside a longer number as a phone number', () => {
    expect(redactSensitiveContent('订单号2138123456789')).toBe('订单号2138123456789');
    expect(redactSensitiveContent('电话13812345678。')).toBe('电话[手机号]。');
  });

  it('requires safe base URLs and an explicit session', async () => {
    expect(() => new PrivateSyncClient({ baseUrl: 'https://sync.example.test' })).not.toThrow();
    expect(() => new PrivateSyncClient({ baseUrl: 'http://sync.example.test' })).toThrow(/HTTPS/);
    expect(() => new PrivateSyncClient({ baseUrl: 'https://user:pass@sync.example.test' })).toThrow(/不得包含凭据/);
    const client = new PrivateSyncClient({ baseUrl: 'https://sync.example.test' });
    await expect(client.pull('tasks')).rejects.toThrow('同步会话尚未建立');
  });

  it('keeps the native fetch receiver when no custom fetcher is provided', async () => {
    const originalFetch = globalThis.fetch;
    const expectedReceiver = globalThis;
    const receiverAwareFetch = vi.fn(function (this: unknown) {
      if (this !== expectedReceiver) throw new TypeError('Illegal invocation');
      return Promise.resolve(new Response(JSON.stringify({ token: 'session-token' }), { status: 200 }));
    });
    globalThis.fetch = receiverAwareFetch as typeof fetch;
    try {
      const client = new PrivateSyncClient({ baseUrl: 'http://127.0.0.1:8787' });
      await expect(client.createSession('long-access-code')).resolves.toMatchObject({ token: 'session-token' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('creates a session and returns server conflicts without merging them silently', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'session-token', expiresIn: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ conflicts: [{ id: 'task-1', updatedAt: 'now', title: 'master' }] }), { status: 200 }));
    const client = new PrivateSyncClient({ baseUrl: 'https://sync.example.test', fetcher });
    await client.createSession('long-access-code');
    const response = await client.push('tasks', [{ newDocumentState: { id: 'task-1', updatedAt: 'later' }, assumedMasterState: null }]);
    expect(response.conflicts[0]?.title).toBe('master');
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ redirect: 'error' });
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ redirect: 'error', headers: { 'x-demo-session': 'session-token' } });
  });

  it('only sends AI content after the caller supplies the explicit redaction confirmation contract', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'session-token', expiresIn: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { choices: [] }, audit: { purpose: '起草提纲', provider: 'localhost', model: 'qwen', contentHash: 'hash', createdAt: 'now' } }), { status: 200 }));
    const client = new PrivateSyncClient({ baseUrl: 'http://127.0.0.1:8787', fetcher });
    await client.createSession('long-access-code');
    await client.generate({ redactedContent: '联系人：[姓名]', redacted: true, confirmed: true, purpose: '起草提纲' });
    const body = JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body));
    expect(body).toEqual({ redactedContent: '联系人：[姓名]', redacted: true, confirmed: true, purpose: '起草提纲' });
  });

  it('lets callers cancel intranet generation through an AbortSignal', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'session-token', expiresIn: 3600 }), { status: 200 }))
      .mockImplementationOnce(async (_input, init) => new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => resolve(new Response(JSON.stringify({ result: { choices: [] } }), { status: 200 })), 80);
        init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal?.reason); }, { once: true });
      }));
    const client = new PrivateSyncClient({ baseUrl: 'http://127.0.0.1:8787', fetcher });
    await client.createSession('long-access-code');
    const controller = new AbortController();
    const request = client.generate({ redactedContent: '联系人：[姓名]', redacted: true, confirmed: true, purpose: '起草提纲' }, controller.signal);
    controller.abort();
    await expect(request).rejects.toThrow(/取消|aborted/i);
  });

  it('uploads and downloads attachments only through an authenticated session', async () => {
    const attachment = { id: 'att-1', name: 'evidence.txt', mimeType: 'text/plain', size: 3, dataBase64: 'YWJj', sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', createdAt: 'now' };
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'session-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(attachment), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(attachment), { status: 200 }));
    const client = new PrivateSyncClient({ baseUrl: 'http://127.0.0.1:8787', fetcher });
    await client.createSession('long-access-code');
    await expect(client.putAttachment(attachment)).resolves.toEqual(attachment);
    await expect(client.getAttachment(attachment.id)).resolves.toEqual(attachment);
    expect(fetcher.mock.calls[2]?.[1]).toMatchObject({ redirect: 'error', headers: { 'x-demo-session': 'session-token' } });
  });

  it('lists intranet AI models through the authenticated gateway', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'session-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: ['qwen3:4b'], defaultModel: 'qwen3:4b' }), { status: 200 }));
    const client = new PrivateSyncClient({ baseUrl: 'http://127.0.0.1:8787', fetcher });
    await client.createSession('long-access-code');
    await expect(client.listModels()).resolves.toEqual({ models: ['qwen3:4b'], defaultModel: 'qwen3:4b' });
    expect(fetcher.mock.calls[1]?.[0].toString()).toContain('/v1/ai/models');
  });

  it('lets callers cancel intranet model discovery through an AbortSignal', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'session-token' }), { status: 200 }))
      .mockImplementationOnce(async (_input, init) => new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => resolve(new Response(JSON.stringify({ models: ['too-late'], defaultModel: '' }), { status: 200 })), 80);
        init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal?.reason); }, { once: true });
      }));
    const client = new PrivateSyncClient({ baseUrl: 'http://127.0.0.1:8787', fetcher });
    await client.createSession('long-access-code');
    const controller = new AbortController();
    const request = client.listModels(controller.signal);
    controller.abort();
    await expect(request).rejects.toThrow(/aborted/i);
  });

  it('supports OpenAI-compatible internet endpoints without following redirects', async () => {
    expect(() => new DirectAiClient({ baseUrl: 'https://provider.example/api', apiKey: 'k'.repeat(1001) })).toThrow(/长度超限/);
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 'model-b' }, { id: 'model-a' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '结果' } }] }), { status: 200 }));
    const client = new DirectAiClient({ baseUrl: 'https://provider.example/api', apiKey: 'memory-only', fetcher });
    await expect(client.listModels()).resolves.toEqual(['model-b', 'model-a']);
    await expect(client.generate({ model: 'model-a', redactedContent: '已脱敏内容', redacted: true, confirmed: true, purpose: '润色' })).resolves.toMatchObject({ choices: expect.any(Array) });
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ method: 'GET', redirect: 'error' });
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', redirect: 'error' });
    expect(fetcher.mock.calls[1]?.[1]?.headers).toMatchObject({ authorization: 'Bearer memory-only' });
    const request = JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body));
    expect(request.messages[0].content).toContain('当前任务用途：润色');
    await expect(client.generate({ model: 'model-a', redactedContent: 'x'.repeat(AI_MAX_CONTENT_LENGTH + 1), redacted: true, confirmed: true, purpose: '润色' })).rejects.toThrow(/120000/);
    await expect(client.generate({ model: 'model-a', redactedContent: '已脱敏内容', redacted: true, confirmed: true, purpose: '' })).rejects.toThrow(/用途/);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('lets callers cancel direct generation through an AbortSignal', async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => resolve(new Response(JSON.stringify({ choices: [] }), { status: 200 })), 80);
      init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal?.reason); }, { once: true });
    }));
    const client = new DirectAiClient({ baseUrl: 'https://provider.example/v1', fetcher });
    const controller = new AbortController();
    const request = client.generate({ model: 'model-a', redactedContent: '已脱敏内容', redacted: true, confirmed: true, purpose: '润色' }, controller.signal);
    controller.abort();
    await expect(request).rejects.toThrow(/取消|aborted/i);
  });

  it('turns browser transport failures into an actionable CORS diagnostic', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => { throw new TypeError('Failed to fetch'); });
    const client = new DirectAiClient({ baseUrl: 'https://relay.example/v1', apiKey: 'memory-only', fetcher });
    await expect(client.listModels()).rejects.toThrow(/CORS.*本地网络访问权限.*证书.*地址错误.*改用本机中转/);
  });

  it('accepts common relay model-list shapes in direct desktop mode', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ models: ['model-z', { name: 'model-a' }, { id: 'model-b' }] }), { status: 200 }));
    const client = new DirectAiClient({ baseUrl: 'https://relay.example/v1', fetcher });
    await expect(client.listModels()).resolves.toEqual(['model-z', 'model-a', 'model-b']);
  });

  it('unlocks a loopback relay, refreshes providers and proxies models and confirmed generation by provider id', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'relay-session', expiresIn: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ revision: 'rev-1', providers: [{ id: 'mystery-01', label: '神秘站点 01', defaultModel: 'relay-model' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: ['relay-model'], defaultModel: 'relay-model' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { choices: [{ message: { content: '中转结果' } }] }, audit: { purpose: '润色', provider: '神秘站点 01', model: 'relay-model', contentHash: 'hash', createdAt: 'now' } }), { status: 200 }));
    const client = new RelayAiClient({ baseUrl: 'http://127.0.0.1:8787', fetcher });
    await expect(client.listProviders()).rejects.toThrow(/解锁/);
    await client.createSession('local-password');
    await expect(client.listProviders()).resolves.toMatchObject({ revision: 'rev-1', providers: [{ id: 'mystery-01' }] });
    await expect(client.listModels('mystery-01')).resolves.toEqual({ models: ['relay-model'], defaultModel: 'relay-model' });
    await expect(client.generate('mystery-01', { model: 'relay-model', redactedContent: '已脱敏材料', redacted: true, confirmed: true, purpose: '润色' })).resolves.toMatchObject({ result: { choices: expect.any(Array) } });
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ targetAddressSpace: 'loopback' });
    expect(fetcher.mock.calls[1]?.[1]?.headers).toMatchObject({ 'x-relay-session': 'relay-session' });
    expect(String(fetcher.mock.calls[2]?.[0])).toContain('/v1/relay/providers/mystery-01/models');
    const generatedBody = JSON.parse(String(fetcher.mock.calls[3]?.[1]?.body));
    expect(generatedBody).toMatchObject({ model: 'relay-model', redactedContent: '已脱敏材料', confirmed: true, redacted: true });
  });

  it('lets callers cancel relay model discovery through an AbortSignal', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'relay-token', expiresIn: 3600 }), { status: 200 }))
      .mockImplementationOnce(async (_input, init) => new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => resolve(new Response(JSON.stringify({ models: ['too-late'], defaultModel: '' }), { status: 200 })), 80);
        init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal?.reason); }, { once: true });
      }));
    const client = new RelayAiClient({ baseUrl: 'http://127.0.0.1:8787', fetcher });
    await client.createSession('session-password');
    const controller = new AbortController();
    const request = client.listModels('mystery-01', controller.signal);
    controller.abort();
    await expect(request).rejects.toThrow(/取消/);
  });

  it('lets callers cancel relay generation through an AbortSignal', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'relay-token', expiresIn: 3600 }), { status: 200 }))
      .mockImplementationOnce(async (_input, init) => new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => resolve(new Response(JSON.stringify({ result: { choices: [] } }), { status: 200 })), 80);
        init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal?.reason); }, { once: true });
      }));
    const client = new RelayAiClient({ baseUrl: 'http://127.0.0.1:8787', fetcher });
    await client.createSession('session-password');
    const controller = new AbortController();
    const request = client.generate('mystery-01', { model: 'relay-model', redactedContent: '已脱敏材料', redacted: true, confirmed: true, purpose: '润色' }, controller.signal);
    controller.abort();
    await expect(request).rejects.toThrow(/取消|aborted/i);
  });

  it('explains how to recover when Chrome denies loopback network permission', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => { throw new TypeError('Failed to fetch'); });
    const query = vi.fn(async () => ({ state: 'denied' }));
    vi.stubGlobal('navigator', { permissions: { query } });
    try {
      const client = new RelayAiClient({ baseUrl: 'http://127.0.0.1:8787', fetcher });
      await expect(client.createSession('local-password')).rejects.toThrow(/网站设置.*本地网络访问.*允许.*刷新/);
      expect(query).toHaveBeenCalled();
      expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ targetAddressSpace: 'loopback' });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('turns relay authentication responses into an actionable provider configuration error', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'relay-session', expiresIn: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'ai_provider_error', status: 401 }), { status: 502 }));
    const client = new RelayAiClient({ baseUrl: 'http://127.0.0.1:8787', fetcher });
    await client.createSession('local-password');
    await expect(client.listModels('mystery-01')).rejects.toThrow(/鉴权失败.*本机中转管理页.*Bearer.*x-api-key/);
  });

  it('appends bounded user guidance to the system prompt without touching the material', async () => {
    expect(composeAiSystemPrompt('公文润色')).toBe('当前任务用途：公文润色。只处理用户确认的脱敏材料，不得编造事实；无法确认的信息必须明确标注。');
    expect(composeAiSystemPrompt('公文润色', '  多用动宾结构。  ')).toContain('写作指引（用户提供，须遵循且不得虚构事实）：\n多用动宾结构。');
    expect(composeAiSystemPrompt('公文润色', '   ')).not.toContain('写作指引');

    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ choices: [{ message: { content: '结果' } }] }), { status: 200 }));
    const client = new DirectAiClient({ baseUrl: 'https://provider.example/v1', apiKey: 'memory-only', fetcher });
    await client.generate({ model: 'model-a', redactedContent: '已脱敏内容', redacted: true, confirmed: true, purpose: '公文润色', guidance: '标题使用四号黑体。' });
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(request.messages[0].content).toContain('当前任务用途：公文润色');
    expect(request.messages[0].content).toContain('标题使用四号黑体。');
    expect(request.messages[1].content).toBe('已脱敏内容');
    await expect(client.generate({ model: 'model-a', redactedContent: '已脱敏内容', redacted: true, confirmed: true, purpose: '公文润色', guidance: 'x'.repeat(AI_MAX_GUIDANCE_LENGTH + 1) })).rejects.toThrow(/润色指引不能超过/);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('bounds and validates OpenAI-compatible provider responses before parsing', async () => {
    const oversizedBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1_100_000).fill(120));
        controller.enqueue(new Uint8Array(1_100_000).fill(120));
        controller.close();
      }
    });
    const oversizedClient = new DirectAiClient({ baseUrl: 'https://provider.example/v1', fetcher: vi.fn<typeof fetch>(async () => new Response(oversizedBody, { status: 200 })) });
    await expect(oversizedClient.listModels()).rejects.toThrow(/2 MB/);

    const invalidClient = new DirectAiClient({ baseUrl: 'https://provider.example/v1', fetcher: vi.fn<typeof fetch>(async () => new Response('{not-json', { status: 200 })) });
    await expect(invalidClient.listModels()).rejects.toThrow(/无效 JSON/);
  });

  it('trims, filters and de-duplicates model identifiers', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ data: [{ id: ' model-b ' }, { id: 'model-a' }, { id: 'MODEL-B' }, { id: 'model-a' }, { id: '' }, { id: 'x'.repeat(201) }, { id: 42 }] }), { status: 200 }));
    const client = new DirectAiClient({ baseUrl: 'https://provider.example/v1', fetcher });
    await expect(client.listModels()).resolves.toEqual(['model-b', 'model-a']);
  });

  it('lets callers cancel direct model discovery through an AbortSignal', async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => resolve(new Response(JSON.stringify({ data: [{ id: 'too-late' }] }), { status: 200 })), 80);
      init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal?.reason); }, { once: true });
    }));
    const client = new DirectAiClient({ baseUrl: 'https://provider.example/v1', fetcher });
    const controller = new AbortController();
    const request = client.listModels(controller.signal);
    controller.abort();
    await expect(request).rejects.toThrow(/取消/);
  });

  it('accepts provider base URLs with or without a trailing version segment', () => {
    expect(resolveOpenAiEndpoint(new URL('https://provider.example/'), 'models').href).toBe('https://provider.example/v1/models');
    expect(resolveOpenAiEndpoint(new URL('https://provider.example/api/'), 'chat/completions').href).toBe('https://provider.example/api/v1/chat/completions');
    expect(resolveOpenAiEndpoint(new URL('https://provider.example/api/v1'), 'models').href).toBe('https://provider.example/api/v1/models');
    expect(resolveOpenAiEndpoint(new URL('https://open.bigmodel.cn/api/paas/v4'), 'chat/completions').href).toBe('https://open.bigmodel.cn/api/paas/v4/chat/completions');
    expect(resolveOpenAiEndpoint(new URL('https://open.bigmodel.cn/api/paas/v4/'), 'models').href).toBe('https://open.bigmodel.cn/api/paas/v4/models');
    expect(resolveOpenAiEndpoint(new URL('https://provider.example/v2035'), 'models').href).toBe('https://provider.example/v2035/models');
  });

  it('ships editable official provider presets without credentials', () => {
    expect(AI_PROVIDER_PRESETS.map((preset) => preset.id)).toEqual(['openai', 'deepseek', 'moonshot', 'zhipu', 'dashscope', 'siliconflow', 'ollama', 'custom']);
    expect(AI_PROVIDER_PRESETS.every((preset) => !('apiKey' in preset))).toBe(true);
    expect(AI_PROVIDER_PRESETS.find((preset) => preset.id === 'deepseek')?.baseUrl).toBe('https://api.deepseek.com');
    expect(AI_PROVIDER_PRESETS.find((preset) => preset.id === 'zhipu')?.baseUrl).toBe('https://open.bigmodel.cn/api/paas/v4');
  });

  it('extracts readable text from direct and gateway OpenAI responses', () => {
    expect(extractOpenAiText({ choices: [{ message: { content: '直接结果' } }] })).toBe('直接结果');
    expect(extractOpenAiText({ result: { choices: [{ message: { content: '网关结果' } }] } })).toBe('网关结果');
    expect(extractOpenAiText({ data: [] })).toBe('');
  });
});
