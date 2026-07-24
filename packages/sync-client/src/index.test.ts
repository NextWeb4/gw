import { describe, expect, it, vi } from 'vitest';
import { PrivateSyncClient, redactSensitiveContent } from './index.js';

describe('private sync client', () => {
  it('redacts common identifiers locally before any AI request is created', () => {
    expect(redactSensitiveContent('联系人：张三，手机13812345678，邮箱a.b@example.com，身份证11010119900101123X'))
      .toBe('联系人：[姓名]，手机[手机号]，邮箱[邮箱]，身份证[身份证号]');
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
});
