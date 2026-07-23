export interface SyncRecord { id: string; updatedAt: string; [key: string]: unknown; }
export interface SyncCheckpoint { updatedAt: string; id: string; }
export interface PullResponse<T extends SyncRecord> { documents: T[]; checkpoint: SyncCheckpoint | null; }
export interface PushRow<T extends SyncRecord> { newDocumentState: T; assumedMasterState?: T | null; }
export interface SyncClientOptions { baseUrl: string; sessionToken?: string; fetcher?: typeof fetch; }
export interface AiGenerateRequest { redactedContent: string; confirmed: true; redacted: true; purpose: string; }
export interface AiGenerateResponse { result: unknown; audit: { purpose: string; provider: string; model: string; contentHash: string; createdAt: string } }
export interface AttachmentTransfer { id: string; name: string; mimeType: string; size: number; dataBase64: string; sha256: string; createdAt?: string; }

export { redactSensitiveContent } from './redaction.js';

export class PrivateSyncClient {
  private readonly baseUrl: URL;
  private readonly fetcher: typeof fetch;
  private sessionToken?: string;

  constructor(options: SyncClientOptions) {
    const baseUrl = new URL(options.baseUrl);
    if (baseUrl.protocol !== 'https:' && !(baseUrl.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(baseUrl.hostname))) throw new Error('同步地址必须使用 HTTPS，或仅允许本机 HTTP');
    this.baseUrl = new URL(baseUrl.href.endsWith('/') ? baseUrl.href : `${baseUrl.href}/`);
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
    this.sessionToken = options.sessionToken;
  }

  async createSession(accessCode: string) {
    const response = await this.fetcher(new URL('v1/demo/session', this.baseUrl), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accessCode }) });
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

  async putAttachment(attachment: AttachmentTransfer) {
    return this.request<Required<AttachmentTransfer>>('v1/attachments', attachment);
  }

  async getAttachment(id: string) {
    if (!this.sessionToken) throw new Error('同步会话尚未建立');
    const response = await this.fetcher(new URL(`v1/attachments/${encodeURIComponent(id)}`, this.baseUrl), { headers: { 'x-demo-session': this.sessionToken } });
    if (!response.ok) throw new Error(`同步请求失败：${response.status}`);
    return await response.json() as Required<AttachmentTransfer>;
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    if (!this.sessionToken) throw new Error('同步会话尚未建立');
    const response = await this.fetcher(new URL(path, this.baseUrl), { method: 'POST', headers: { 'content-type': 'application/json', 'x-demo-session': this.sessionToken }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`同步请求失败：${response.status}`);
    return await response.json() as T;
  }
}
