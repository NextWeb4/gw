import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDirectAiAllowed, composeAiSystemPrompt, requestAiCompletion, requestAiModels, resolveAiBaseUrl, resolveOpenAiEndpoint } from '../electron/ai.mjs';

test('accepts only HTTPS or loopback HTTP AI endpoints', () => {
  assert.equal(resolveAiBaseUrl('https://provider.example/api').href, 'https://provider.example/api/');
  assert.equal(resolveAiBaseUrl('http://127.0.0.1:11434').href, 'http://127.0.0.1:11434/');
  assert.throws(() => resolveAiBaseUrl('http://provider.example/api'), /HTTPS/);
  assert.throws(() => resolveAiBaseUrl('https://user:pass@provider.example/api'), /不得包含凭据/);
});

test('normalizes OpenAI-compatible paths and blocks direct AI in the intranet edition', () => {
  expectEndpoint('https://provider.example/', 'models', 'https://provider.example/v1/models');
  expectEndpoint('https://provider.example/api/v1', 'chat/completions', 'https://provider.example/api/v1/chat/completions');
  expectEndpoint('https://open.bigmodel.cn/api/paas/v4', 'chat/completions', 'https://open.bigmodel.cn/api/paas/v4/chat/completions');
  expectEndpoint('https://open.bigmodel.cn/api/paas/v4/', 'models', 'https://open.bigmodel.cn/api/paas/v4/models');
  assert.doesNotThrow(() => assertDirectAiAllowed('internet'));
  assert.throws(() => assertDirectAiAllowed('intranet'), /内网版禁止直连公网 AI/);
});

test('lists models and generates only confirmed redacted content', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push([url, init]);
    if (String(url).endsWith('/v1/models')) return new Response(JSON.stringify({ models: ['model-b', { name: 'model-a' }, { id: 'MODEL-B' }] }), { status: 200 });
    return new Response(JSON.stringify({ choices: [{ message: { content: '结果' } }] }), { status: 200 });
  };
  try {
    assert.deepEqual(await requestAiModels({ baseUrl: 'https://provider.example/api', apiKey: 'memory-only' }), ['model-b', 'model-a']);
    await assert.rejects(requestAiCompletion({ baseUrl: 'https://provider.example/api', apiKey: '', model: 'model-a', redactedContent: '原文', confirmed: false, redacted: true, purpose: '公文润色' }), /确认脱敏/);
    await assert.rejects(requestAiCompletion({ baseUrl: 'https://provider.example/api', apiKey: '', model: 'm'.repeat(201), redactedContent: '已脱敏', confirmed: true, redacted: true, purpose: '公文润色' }), /模型标识长度/);
    await assert.rejects(requestAiCompletion({ baseUrl: 'https://provider.example/api', apiKey: '', model: 'model-a', redactedContent: 'x'.repeat(120_001), confirmed: true, redacted: true, purpose: '公文润色' }), /已脱敏内容无效/);
    await requestAiCompletion({ baseUrl: 'https://provider.example/api', apiKey: '', model: 'model-a', redactedContent: '已脱敏', confirmed: true, redacted: true, purpose: '公文润色' });
    assert.equal(calls[0][1].redirect, 'manual');
    assert.equal(calls[1][1].redirect, 'manual');
    assert.match(JSON.parse(calls[1][1].body).messages[0].content, /当前任务用途：公文润色/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('appends bounded guidance to the desktop system prompt', async () => {
  assert.equal(composeAiSystemPrompt('公文润色'), '当前任务用途：公文润色。只处理用户确认的脱敏材料，不得编造事实；无法确认的信息必须明确标注。');
  assert.match(composeAiSystemPrompt('公文润色', ' 多用动宾结构。 '), /写作指引（用户提供，须遵循且不得虚构事实）：\n多用动宾结构。/);
  assert.doesNotMatch(composeAiSystemPrompt('公文润色', '  '), /写作指引/);
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push([url, init]); return new Response(JSON.stringify({ choices: [] }), { status: 200 }); };
  try {
    await requestAiCompletion({ baseUrl: 'https://provider.example/v1', apiKey: '', model: 'model-a', redactedContent: '已脱敏', confirmed: true, redacted: true, purpose: '公文润色', guidance: '标题使用四号黑体。' });
    const body = JSON.parse(calls[0][1].body);
    assert.match(body.messages[0].content, /标题使用四号黑体。/);
    assert.equal(body.messages[1].content, '已脱敏');
    await assert.rejects(requestAiCompletion({ baseUrl: 'https://provider.example/v1', apiKey: '', model: 'model-a', redactedContent: '已脱敏', confirmed: true, redacted: true, purpose: '公文润色', guidance: 'x'.repeat(20_001) }), /润色指引不能超过/);
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('bounds and validates provider responses in the desktop main process', async () => {
  const originalFetch = globalThis.fetch;
  const oversizedBody = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(1_100_000).fill(120));
      controller.enqueue(new Uint8Array(1_100_000).fill(120));
      controller.close();
    }
  });
  try {
    globalThis.fetch = async () => new Response(oversizedBody, { status: 200 });
    await assert.rejects(requestAiModels({ baseUrl: 'https://provider.example/v1', apiKey: '' }), /2 MB/);
    globalThis.fetch = async () => new Response('{not-json', { status: 200 });
    await assert.rejects(requestAiModels({ baseUrl: 'https://provider.example/v1', apiKey: '' }), /无效 JSON/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function expectEndpoint(baseUrl, resource, expected) {
  assert.equal(resolveOpenAiEndpoint(resolveAiBaseUrl(baseUrl), resource).href, expected);
}
