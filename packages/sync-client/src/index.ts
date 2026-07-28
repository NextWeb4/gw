export interface SyncRecord { id: string; updatedAt: string; [key: string]: unknown; }
export interface SyncCheckpoint { updatedAt: string; id: string; }
export interface PullResponse<T extends SyncRecord> { documents: T[]; checkpoint: SyncCheckpoint | null; }
export interface PushRow<T extends SyncRecord> { newDocumentState: T; assumedMasterState?: T | null; }
export interface SyncClientOptions { baseUrl: string; sessionToken?: string; fetcher?: typeof fetch; }
export interface AiGenerateRequest { redactedContent: string; confirmed: true; redacted: true; purpose: string; model?: string; guidance?: string; }
export interface AiGenerateResponse { result: unknown; audit: { purpose: string; provider: string; model: string; contentHash: string; createdAt: string } }
export interface AttachmentTransfer { id: string; name: string; mimeType: string; size: number; dataBase64: string; sha256: string; createdAt?: string; }
export interface DirectAiClientOptions { baseUrl: string; apiKey?: string; fetcher?: typeof fetch; }
export interface RelayAiClientOptions { baseUrl: string; sessionToken?: string; fetcher?: typeof fetch; }
export interface RelayProviderDescriptor { id: string; label: string; defaultModel: string; }
export interface RelayProviderDirectory { revision: string; providers: RelayProviderDescriptor[]; }
export interface AiProviderPreset { id: string; label: string; baseUrl: string; officialDocs: string; note: string; }
export const AI_MAX_CONTENT_LENGTH = 120_000;
export const AI_MAX_GUIDANCE_LENGTH = 20_000;
const AI_MAX_RESPONSE_BYTES = 2_000_000;
type LocalNetworkRequestInit = RequestInit & { targetAddressSpace?: 'public' | 'local' | 'loopback' };

export function composeAiSystemPrompt(purpose: string, guidance?: string) {
  const base = `当前任务用途：${purpose.trim()}。只处理用户确认的脱敏材料，不得编造事实；无法确认的信息必须明确标注。`;
  const trimmedGuidance = guidance?.trim();
  return trimmedGuidance ? `${base}\n\n写作指引（用户提供，须遵循且不得虚构事实）：\n${trimmedGuidance}` : base;
}

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', officialDocs: 'https://platform.openai.com/docs/api-reference', note: '国际服务；浏览器使用取决于账户与 CORS。' },
  { id: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', officialDocs: 'https://api-docs.deepseek.com/', note: '中国大陆常用 OpenAI 兼容接口。' },
  { id: 'moonshot', label: 'Moonshot / Kimi', baseUrl: 'https://api.moonshot.cn/v1', officialDocs: 'https://platform.moonshot.cn/docs/guide/start-using-kimi-api', note: 'Moonshot 开放平台兼容接口。' },
  { id: 'zhipu', label: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', officialDocs: 'https://docs.bigmodel.cn/', note: '智谱开放平台 OpenAI 兼容接口。' },
  { id: 'dashscope', label: '阿里云百炼 / DashScope', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', officialDocs: 'https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope', note: '如控制台提供工作空间专属地址，应以控制台地址覆盖此值。' },
  { id: 'siliconflow', label: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1', officialDocs: 'https://docs.siliconflow.cn/cn/api-reference/chat-completions/chat-completions', note: '中国大陆模型聚合服务。' },
  { id: 'ollama', label: '本机 Ollama', baseUrl: 'http://127.0.0.1:11434/v1', officialDocs: 'https://docs.ollama.com/api/openai-compatibility', note: '仅连接当前设备回环地址，不使用云端 API Key。' },
  { id: 'custom', label: '自定义兼容接口', baseUrl: '', officialDocs: '', note: '填写单位代理或其他 OpenAI 兼容基址。' }
];

export function resolveOpenAiEndpoint(baseUrl: URL, resource: 'models' | 'chat/completions') {
  const normalizedBase = new URL(baseUrl.href.endsWith('/') ? baseUrl.href : `${baseUrl.href}/`);
  const normalizedPath = normalizedBase.pathname.replace(/\/+$/, '');
  const endpoint = /\/v\d+$/.test(normalizedPath) ? resource : `v1/${resource}`;
  return new URL(endpoint, normalizedBase);
}

export function extractOpenAiText(payload: unknown): string {
  const value = payload && typeof payload === 'object' && 'result' in payload ? (payload as { result?: unknown }).result : payload;
  if (!value || typeof value !== 'object') return typeof value === 'string' ? value : '';
  const choices = (value as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return '';
  const content = (choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) return content.map((part) => part && typeof part === 'object' && 'text' in part ? String((part as { text?: unknown }).text || '') : '').join('').trim();
  return '';
}

function transportFailure(label: string, error: unknown) {
  if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) return new Error(`${label}请求超时，请检查服务状态和网络连接`);
  const cause = `${label}无法访问。浏览器可能因 CORS、本地网络访问权限、证书或地址错误阻止请求；`;
  return new Error(label === '本机中转站'
    ? `${cause}请确认本机中转服务已启动并允许当前网页来源。`
    : `${cause}请检查服务商地址和证书；若服务商不允许浏览器直连，请改用本机中转。`);
}

function loopbackRequestInit(url: URL, init: RequestInit): LocalNetworkRequestInit {
  const requestInit: LocalNetworkRequestInit = { ...init };
  if (['127.0.0.1', 'localhost'].includes(url.hostname)) requestInit.targetAddressSpace = 'loopback';
  return requestInit;
}

async function localNetworkPermissionState(): Promise<PermissionState | undefined> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return undefined;
  for (const name of ['loopback-network', 'local-network-access']) {
    try {
      return (await navigator.permissions.query({ name } as PermissionDescriptor)).state;
    } catch {
      // Chromium currently keeps the legacy alias while the fine-grained name rolls out.
    }
  }
  return undefined;
}

async function relayTransportFailure(error: unknown) {
  if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) return transportFailure('本机中转站', error);
  const permission = await localNetworkPermissionState();
  if (permission === 'denied') {
    return new Error('浏览器已拒绝当前网页访问本机中转站。请在地址栏的网站设置中把“本地网络访问”改为“允许”，刷新页面后重新解锁。');
  }
  if (permission === 'prompt') {
    return new Error('浏览器尚未允许当前网页访问本机中转站。点击解锁后请在“本地网络访问”提示中选择“允许”；若没有弹窗，请在地址栏的网站设置中手动允许后刷新。');
  }
  return transportFailure('本机中转站', error);
}

async function responseError(response: Response, prefix: string) {
  const payload = await response.clone().json().catch(() => undefined) as { error?: unknown; status?: unknown } | undefined;
  const code = typeof payload?.error === 'string' ? payload.error : '';
  const messages: Record<string, string> = {
    invalid_relay_password: '中转站密码错误',
    relay_session_required: '中转站会话已失效，请重新输入密码',
    relay_provider_not_found: '所选神秘站点不存在或尚未启用',
    relay_model_required: '该站点未配置默认模型，请先获取并选择模型',
    relay_disabled: '本机中转服务尚未启用',
    ai_provider_unreachable: '本机中转服务无法连接上游站点',
    ai_provider_error: `上游站点请求失败${typeof payload?.status === 'number' ? `：${payload.status}` : ''}`,
    ai_provider_response_too_large: '上游站点响应超过 2 MB 限制',
    invalid_ai_provider_response: '上游站点返回了无效 JSON'
  };
  return new Error(messages[code] || `${prefix}：${response.status}`);
}

async function readLimitedResponseText(response: Response) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > AI_MAX_RESPONSE_BYTES) throw new Error('AI 服务响应超过 2 MB 限制');
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > AI_MAX_RESPONSE_BYTES) throw new Error('AI 服务响应超过 2 MB 限制');
    return text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytesRead += chunk.value.byteLength;
      if (bytesRead > AI_MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error('AI 服务响应超过 2 MB 限制');
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
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
    if (this.apiKey.length > 1000) throw new Error('AI API Key 长度超限');
  }

  async listModels() {
    const payload = await this.request<{ data?: unknown; models?: unknown }>('models', { method: 'GET' });
    const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.models) ? payload.models : [];
    return [...new Set(rows.map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') return (item as { id: string }).id.trim();
      if (item && typeof item === 'object' && typeof (item as { name?: unknown }).name === 'string') return (item as { name: string }).name.trim();
      return '';
    }).filter((id) => id.length > 0 && id.length <= 200))].sort();
  }

  async generate(request: AiGenerateRequest & { model: string }) {
    if (!request.confirmed || !request.redacted || !request.redactedContent.trim()) throw new Error('必须先确认脱敏内容');
    if (request.redactedContent.length > AI_MAX_CONTENT_LENGTH) throw new Error(`已脱敏内容不能超过 ${AI_MAX_CONTENT_LENGTH} 个字符`);
    if (!request.model.trim()) throw new Error('请选择 AI 模型');
    if (request.model.trim().length > 200) throw new Error('AI 模型标识长度超限');
    if (!request.purpose.trim() || request.purpose.length > 200) throw new Error('AI 处理用途无效');
    if (request.guidance && request.guidance.length > AI_MAX_GUIDANCE_LENGTH) throw new Error(`润色指引不能超过 ${AI_MAX_GUIDANCE_LENGTH} 个字符`);
    return this.request<unknown>('chat/completions', {
      method: 'POST',
      body: JSON.stringify({ model: request.model.trim(), messages: [{ role: 'system', content: composeAiSystemPrompt(request.purpose, request.guidance) }, { role: 'user', content: request.redactedContent }], temperature: 0.3 })
    });
  }

  private async request<T>(resource: 'models' | 'chat/completions', init: { method: 'GET' | 'POST'; body?: string }): Promise<T> {
    let response: Response;
    const url = resolveOpenAiEndpoint(this.baseUrl, resource);
    try {
      response = await this.fetcher(url, loopbackRequestInit(url, {
        method: init.method,
        body: init.body,
        redirect: 'error',
        signal: AbortSignal.timeout(60_000),
        headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}) }
      }));
    } catch (error) { throw transportFailure('AI 服务', error); }
    if (!response.ok) throw await responseError(response, 'AI 服务请求失败');
    const text = await readLimitedResponseText(response);
    try { return JSON.parse(text) as T; }
    catch { throw new Error('AI 服务返回了无效 JSON'); }
  }
}

export class RelayAiClient {
  private readonly baseUrl: URL;
  private readonly fetcher: typeof fetch;
  private sessionToken?: string;

  constructor(options: RelayAiClientOptions) {
    const baseUrl = new URL(options.baseUrl);
    if (!['127.0.0.1', 'localhost'].includes(baseUrl.hostname) || !['http:', 'https:'].includes(baseUrl.protocol)) throw new Error('本机中转地址必须使用 127.0.0.1 或 localhost');
    if (baseUrl.username || baseUrl.password) throw new Error('本机中转地址不得包含凭据');
    this.baseUrl = new URL(baseUrl.href.endsWith('/') ? baseUrl.href : `${baseUrl.href}/`);
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
    this.sessionToken = options.sessionToken;
  }

  async createSession(password: string) {
    const payload = await this.request<{ token: string; expiresIn: number }>('v1/relay/session', { method: 'POST', body: JSON.stringify({ password }), authenticated: false });
    if (!payload.token) throw new Error('本机中转服务未返回会话令牌');
    this.sessionToken = payload.token;
    return payload;
  }

  async listProviders() {
    return this.request<RelayProviderDirectory>('v1/relay/providers', { method: 'GET', authenticated: true });
  }

  async listModels(providerId: string) {
    return this.request<{ models: string[]; defaultModel: string }>(`v1/relay/providers/${encodeURIComponent(providerId)}/models`, { method: 'GET', authenticated: true });
  }

  async generate(providerId: string, request: AiGenerateRequest & { model: string }) {
    if (!request.confirmed || !request.redacted || !request.redactedContent.trim()) throw new Error('必须先确认脱敏内容');
    if (request.redactedContent.length > AI_MAX_CONTENT_LENGTH) throw new Error(`已脱敏内容不能超过 ${AI_MAX_CONTENT_LENGTH} 个字符`);
    if (!request.model.trim() || request.model.length > 200) throw new Error('请选择有效的 AI 模型');
    if (!request.purpose.trim() || request.purpose.length > 200) throw new Error('AI 处理用途无效');
    if (request.guidance && request.guidance.length > AI_MAX_GUIDANCE_LENGTH) throw new Error(`润色指引不能超过 ${AI_MAX_GUIDANCE_LENGTH} 个字符`);
    return this.request<AiGenerateResponse>(`v1/relay/providers/${encodeURIComponent(providerId)}/generate`, { method: 'POST', authenticated: true, body: JSON.stringify(request) });
  }

  private async request<T>(path: string, options: { method: 'GET' | 'POST'; body?: string; authenticated: boolean }): Promise<T> {
    if (options.authenticated && !this.sessionToken) throw new Error('请先输入密码解锁本机中转站');
    let response: Response;
    const url = new URL(path, this.baseUrl);
    try {
      response = await this.fetcher(url, loopbackRequestInit(url, {
        method: options.method,
        body: options.body,
        redirect: 'error',
        signal: AbortSignal.timeout(60_000),
        headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(this.sessionToken ? { 'x-relay-session': this.sessionToken } : {}) }
      }));
    } catch (error) { throw await relayTransportFailure(error); }
    if (!response.ok) throw await responseError(response, '本机中转请求失败');
    const text = await readLimitedResponseText(response);
    try { return JSON.parse(text) as T; }
    catch { throw new Error('本机中转服务返回了无效 JSON'); }
  }
}
