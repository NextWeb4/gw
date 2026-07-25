const MAX_RESPONSE_LENGTH = 2_000_000;

export function resolveAiBaseUrl(rawUrl) {
  const url = new URL(String(rawUrl || ''));
  const loopbackHttp = url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname);
  if (url.protocol !== 'https:' && !loopbackHttp) throw new Error('AI 请求地址必须使用 HTTPS，或仅允许本机 HTTP');
  if (url.username || url.password) throw new Error('AI 请求地址不得包含凭据');
  return new URL(url.href.endsWith('/') ? url.href : `${url.href}/`);
}

export function resolveOpenAiEndpoint(baseUrl, resource) {
  const normalizedBase = new URL(baseUrl.href.endsWith('/') ? baseUrl.href : `${baseUrl.href}/`);
  const normalizedPath = normalizedBase.pathname.replace(/\/+$/, '');
  const endpoint = normalizedPath.endsWith('/v1') ? resource : `v1/${resource}`;
  return new URL(endpoint, normalizedBase);
}

export function assertDirectAiAllowed(edition) {
  if (edition !== 'internet') throw new Error('内网版禁止直连公网 AI，请通过内部 AI 网关使用模型');
}

async function requestJson(payload, resource, init) {
  if (!payload || typeof payload.baseUrl !== 'string' || typeof payload.apiKey !== 'string') throw new Error('AI 请求配置无效');
  if (payload.apiKey.length > 1000) throw new Error('AI API Key 长度超限');
  const endpoint = resolveOpenAiEndpoint(resolveAiBaseUrl(payload.baseUrl), resource);
  const response = await fetch(endpoint, {
    ...init,
    redirect: 'manual',
    signal: AbortSignal.timeout(60_000),
    headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(payload.apiKey ? { authorization: `Bearer ${payload.apiKey}` } : {}) }
  });
  if (!response.ok) throw new Error(`AI 服务请求失败：${response.status}`);
  const text = await response.text();
  if (text.length > MAX_RESPONSE_LENGTH) throw new Error('AI 服务响应超过 2 MB 限制');
  return JSON.parse(text);
}

export async function requestAiModels(payload) {
  const response = await requestJson(payload, 'models', { method: 'GET' });
  return (Array.isArray(response.data) ? response.data : []).map((item) => typeof item?.id === 'string' ? item.id : '').filter(Boolean).sort();
}

export async function requestAiCompletion(payload) {
  if (!payload || typeof payload.model !== 'string' || !payload.model.trim()) throw new Error('请选择 AI 模型');
  if (typeof payload.redactedContent !== 'string' || !payload.redactedContent.trim() || payload.redactedContent.length > 120_000) throw new Error('已脱敏内容无效');
  if (payload.confirmed !== true || payload.redacted !== true) throw new Error('必须先确认脱敏内容');
  return requestJson(payload, 'chat/completions', {
    method: 'POST',
    body: JSON.stringify({ model: payload.model, messages: [{ role: 'system', content: '只处理用户确认的脱敏材料，不得编造事实。' }, { role: 'user', content: payload.redactedContent }], temperature: 0.3 })
  });
}
