import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDirectAiAllowed, requestAiCompletion, requestAiModels, resolveAiBaseUrl, resolveOpenAiEndpoint } from '../electron/ai.mjs';

test('accepts only HTTPS or loopback HTTP AI endpoints', () => {
  assert.equal(resolveAiBaseUrl('https://provider.example/api').href, 'https://provider.example/api/');
  assert.equal(resolveAiBaseUrl('http://127.0.0.1:11434').href, 'http://127.0.0.1:11434/');
  assert.throws(() => resolveAiBaseUrl('http://provider.example/api'), /HTTPS/);
  assert.throws(() => resolveAiBaseUrl('https://user:pass@provider.example/api'), /不得包含凭据/);
});

test('normalizes OpenAI-compatible paths and blocks direct AI in the intranet edition', () => {
  expectEndpoint('https://provider.example/', 'models', 'https://provider.example/v1/models');
  expectEndpoint('https://provider.example/api/v1', 'chat/completions', 'https://provider.example/api/v1/chat/completions');
  assert.doesNotThrow(() => assertDirectAiAllowed('internet'));
  assert.throws(() => assertDirectAiAllowed('intranet'), /内网版禁止直连公网 AI/);
});

test('lists models and generates only confirmed redacted content', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push([url, init]);
    if (String(url).endsWith('/v1/models')) return new Response(JSON.stringify({ data: [{ id: 'model-b' }, { id: 'model-a' }] }), { status: 200 });
    return new Response(JSON.stringify({ choices: [{ message: { content: '结果' } }] }), { status: 200 });
  };
  try {
    assert.deepEqual(await requestAiModels({ baseUrl: 'https://provider.example/api', apiKey: 'memory-only' }), ['model-a', 'model-b']);
    await assert.rejects(requestAiCompletion({ baseUrl: 'https://provider.example/api', apiKey: '', model: 'model-a', redactedContent: '原文', confirmed: false, redacted: true }), /确认脱敏/);
    await requestAiCompletion({ baseUrl: 'https://provider.example/api', apiKey: '', model: 'model-a', redactedContent: '已脱敏', confirmed: true, redacted: true });
    assert.equal(calls[0][1].redirect, 'manual');
    assert.equal(calls[1][1].redirect, 'manual');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function expectEndpoint(baseUrl, resource, expected) {
  assert.equal(resolveOpenAiEndpoint(resolveAiBaseUrl(baseUrl), resource).href, expected);
}
