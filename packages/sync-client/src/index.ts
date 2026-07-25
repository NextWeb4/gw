export interface SyncRecord { id: string; updatedAt: string; [key: string]: unknown; }
export interface SyncCheckpoint { updatedAt: string; id: string; }
export interface PullResponse<T extends SyncRecord> { documents: T[]; checkpoint: SyncCheckpoint | null; }
export interface PushRow<T extends SyncRecord> { newDocumentState: T; assumedMasterState?: T | null; }
export interface SyncClientOptions { baseUrl: string; sessionToken?: string; fetcher?: typeof fetch; }
export interface AiGenerateRequest { redactedContent: string; confirmed: true; redacted: true; purpose: string; model?: string; }
export interface AiGenerateResponse { result: unknown; audit: { purpose: string; provider: string; model: string; contentHash: string; createdAt: string } }
export interface AttachmentTransfer { id: string; name: string; mimeType: string; size: number; dataBase64: string; sha256: string; createdAt?: string; }
export interface DirectAiClientOptions { baseUrl: string; apiKey?: string; fetcher?: typeof fetch; }

export function resolveOpenAiEndpoint(baseUrl: URL, resource: 'models' | 'chat/completions') {
  const normalizedBase = new URL(baseUrl.href.endsWith('/') ? baseUrl.href : `${baseUrl.href}/`);
  const normalizedPath = normalizedBase.pathname.replace(/\/+$/, '');
  const endpoint = normalizedPath.endsWith('/v1') ? resource : `v1/${resource}`;
  return new URL(endpoint, normalizedBase);
}

export { redactSensitiveContent } from './redaction.js';

export class PrivateSyncClient {
  private readonly baseUrl: URL;
  private readonly fetcher: typeof fetch;
  private sessionToken?: string;

  constructor(options: SyncClientOptions) {
    const baseUrl = new URL(options.baseUrl);
    if (baseUrl.protocol !== 'https:' && !(baseUrl.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(baseUrl.hostname))) throw new Error('同步地址必须使用 HTTPS，或仅允许本机 HTTP');
    if (baseUrl.username || baseUrl.password) throw new Error('同步地址不得包含凭据');
    this.baseUrl = new URL(baseUrl.href.endsWith('/') ? baseUrl.href : `${baseUrl.href}/`);
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
    this.sessionToken = options.sessionToken;
  }

  async createSession(accessCode: string) {
    const response = await this.fetcher(new URL('v1/demo/session', this.baseUrl), { method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accessCode }) });
    if (!response.ok) throw new Error(`同步会话创建失败：${response.status}`);
    const payload = await response.json() as { token?: string; expiresIn?: number; warning?: string };
    if (!payload.token) throw new Error('同步服务未返回会话令牌');
    this.sessionToken = payload.token;
    return payload;
  }

  async pull<T extends SyncRecord>(collection: string, checkpoint: SyncCheckpoint | null = null, batchSize = 100): Promise<PullResponse<T>> {
    return this.request<PullResponse<T>>(`v1/sync/${encodeURIComponent(collection)}/pull`, { checkpoint, batchSize });
  }

  async push<T extends SyncRecord>(collection: string, rows: Array<PushRow<T>>) {
    return this.request<{ conflicts: T[] }>(`v1/sync/${encodeURIComponent(collection)}/push`, { rows });
  }

  async generate(request: AiGenerateRequest) {
    return this.request<AiGenerateResponse>('v1/ai/generate', request);
  }

  async listModels() {
    return this.get<{ models: string[]; defaultModel: string }>('v1/ai/models');
  }

  async putAttachment(attachment: AttachmentTransfer) {
    return this.request<Required<AttachmentTransfer>>('v1/attachments', attachment);
  }

  async getAttachment(id: string) {
    return this.get<Required<AttachmentTransfer>>(`v1/attachments/${encodeURIComponent(id)}`);
  }

  private async get<T>(path: string): Promise<T> {
    if (!this.sessionToken) throw new Error('同步会话尚未建立');
    const response = await this.fetcher(new URL(path, this.baseUrl), { redirect: 'error', headers: { 'x-demo-session': this.sessionToken } });
    if (!response.ok) throw new Error(`同步请求失败：${response.status}`);
    return await response.json() as T;
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    if (!this.sessionToken) throw new Error('同步会话尚未建立');
    const response = await this.fetcher(new URL(path, this.baseUrl), { method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json', 'x-demo-session': this.sessionToken }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`同步请求失败：${response.status}`);
    return await response.json() as T;
  }
}

export class DirectAiClient {
  private readonly baseUrl: URL;
  private readonly fetcher: typeof fetch;
  private readonly apiKey: string;

  constructor(options: DirectAiClientOptions) {
    const baseUrl = new URL(options.baseUrl);
    if (baseUrl.protocol !== 'https:' && !(baseUrl.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(baseUrl.hostname))) throw new Error('AI 请求地址必须使用 HTTPS，或仅允许本机 HTTP');
    if (baseUrl.username || baseUrl.password) throw new Error('AI 请求地址不得包含凭据');
    this.baseUrl = new URL(baseUrl.href.endsWith('/') ? baseUrl.href : `${baseUrl.href}/`);
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
    this.apiKey = options.apiKey?.trim() || '';
  }

  async listModels() {
    const payload = await this.request<{ data?: Array<{ id?: unknown }> }>('models', { method: 'GET' });
    return (payload.data || []).map((item) => typeof item.id === 'string' ? item.id : '').filter(Boolean).sort();
  }

  async generate(request: AiGenerateRequest & { model: string }) {
    if (!request.confirmed || !request.redacted || !request.redactedContent.trim()) throw new Error('必须先确认脱敏内容');
    if (!request.model.trim()) throw new Error('请选择 AI 模型');
    return this.request<unknown>('chat/completions', {
      method: 'POST',
      body: JSON.stringify({ model: request.model, messages: [{ role: 'system', content: '只处理用户确认的脱敏材料，不得编造事实。' }, { role: 'user', content: request.redactedContent }], temperature: 0.3 })
    });
  }

  private async request<T>(resource: 'models' | 'chat/completions', init: { method: 'GET' | 'POST'; body?: string }): Promise<T> {
    const response = await this.fetcher(resolveOpenAiEndpoint(this.baseUrl, resource), {
      method: init.method,
      body: init.body,
      redirect: 'error',
      signal: AbortSignal.timeout(60_000),
      headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}) }
    });
    if (!response.ok) throw new Error(`AI 服务请求失败：${response.status}`);
    const text = await response.text();
    if (text.length > 2_000_000) throw new Error('AI 服务响应超过 2 MB 限制');
    return JSON.parse(text) as T;
  }
}
