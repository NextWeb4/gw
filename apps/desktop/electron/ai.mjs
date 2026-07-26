const MAX_RESPONSE_LENGTH = 2_000_000;
const MAX_GUIDANCE_LENGTH = 20_000;

export function composeAiSystemPrompt(purpose, guidance) {
  const base = `当前任务用途：${String(purpose).trim()}。只处理用户确认的脱敏材料，不得编造事实；无法确认的信息必须明确标注。`;
  const trimmedGuidance = typeof guidance === 'string' ? guidance.trim() : '';
  return trimmedGuidance ? `${base}\n\n写作指引（用户提供，须遵循且不得虚构事实）：\n${trimmedGuidance}` : base;
}

async function readLimitedResponseText(response) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_LENGTH) throw new Error('AI 服务响应超过 2 MB 限制');
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_LENGTH) throw new Error('AI 服务响应超过 2 MB 限制');
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
      if (bytesRead > MAX_RESPONSE_LENGTH) {
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
  const endpoint = /\/v\d+$/.test(normalizedPath) ? resource : `v1/${resource}`;
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
  const text = await readLimitedResponseText(response);
  try { return JSON.parse(text); }
  catch { throw new Error('AI 服务返回了无效 JSON'); }
}

export async function requestAiModels(payload) {
  const response = await requestJson(payload, 'models', { method: 'GET' });
  return [...new Set((Array.isArray(response.data) ? response.data : []).map((item) => typeof item?.id === 'string' ? item.id.trim() : '').filter((id) => id.length > 0 && id.length <= 200))].sort();
}

export async function requestAiCompletion(payload) {
  if (!payload || typeof payload.model !== 'string' || !payload.model.trim()) throw new Error('请选择 AI 模型');
  if (payload.model.trim().length > 200) throw new Error('AI 模型标识长度超限');
  if (typeof payload.redactedContent !== 'string' || !payload.redactedContent.trim() || payload.redactedContent.length > 120_000) throw new Error('已脱敏内容无效');
  if (typeof payload.purpose !== 'string' || !payload.purpose.trim() || payload.purpose.length > 200) throw new Error('AI 处理用途无效');
  if (payload.guidance !== undefined && (typeof payload.guidance !== 'string' || payload.guidance.length > MAX_GUIDANCE_LENGTH)) throw new Error(`润色指引不能超过 ${MAX_GUIDANCE_LENGTH} 个字符`);
  if (payload.confirmed !== true || payload.redacted !== true) throw new Error('必须先确认脱敏内容');
  return requestJson(payload, 'chat/completions', {
    method: 'POST',
    body: JSON.stringify({ model: payload.model.trim(), messages: [{ role: 'system', content: composeAiSystemPrompt(payload.purpose, payload.guidance) }, { role: 'user', content: payload.redactedContent }], temperature: 0.3 })
  });
}
