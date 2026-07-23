const POLICY_HOSTS = new Set(['gov.cn', 'www.gov.cn', 'openstd.samr.gov.cn', 'std.samr.gov.cn']);

export const MAX_SOURCE_BYTES = 2_000_000;
export const MAX_REDIRECTS = 5;

export function validateConfiguredHosts(hosts) {
  if (!Array.isArray(hosts) || hosts.length === 0) throw new Error('来源清单必须声明 hosts');
  const configured = new Set();
  for (const rawHost of hosts) {
    if (typeof rawHost !== 'string') throw new Error('来源 hosts 只能包含字符串');
    const host = rawHost.trim().toLowerCase();
    if (!POLICY_HOSTS.has(host)) throw new Error(`来源 hosts 超出公共权威站点策略：${host}`);
    if (configured.has(host)) throw new Error(`来源 hosts 重复：${host}`);
    configured.add(host);
  }
  return configured;
}

function normalizeHttpsUrl(input) {
  const url = input instanceof URL ? new URL(input) : new URL(input);
  if (url.protocol !== 'https:') throw new Error(`来源必须使用 HTTPS：${url}`);
  if (url.username || url.password) throw new Error(`来源 URL 不得包含凭据：${url}`);
  if (url.port && url.port !== '443') throw new Error(`来源 URL 不得使用非标准端口：${url}`);
  url.hash = '';
  return url;
}

export function normalizeAuthorizedUrls(urls) {
  if (!Array.isArray(urls) || urls.length === 0) throw new Error('授权抓取记录必须声明 authorizedSourceUrls');
  return new Set(urls.map((url) => normalizeHttpsUrl(url).toString()));
}

export function authorizedUrlsForSource(source, authorizationRecords) {
  if (!source.authorizationRef) return new Set();
  const prefix = 'content/licensed/authorization.json#';
  if (typeof source.authorizationRef !== 'string' || !source.authorizationRef.startsWith(prefix)) throw new Error(`来源授权引用无效：${source.id}`);
  const record = authorizationRecords.get(source.authorizationRef.slice(prefix.length));
  if (!record || record.authorizationStatus !== 'user-confirmed' || record.allowAutomatedRetrieval !== true) throw new Error(`来源缺少自动抓取授权：${source.id}`);
  const authorizedUrls = normalizeAuthorizedUrls(record.authorizedSourceUrls);
  const sourceUrl = normalizeHttpsUrl(source.url).toString();
  if (!authorizedUrls.has(sourceUrl)) throw new Error(`来源 URL 不在授权记录中：${source.id}`);
  return authorizedUrls;
}

export function validateSourceUrl(input, configuredHosts, authorizedUrls = new Set()) {
  const url = normalizeHttpsUrl(input);
  const officialHost = configuredHosts.has(url.hostname.toLowerCase());
  if (!officialHost && !authorizedUrls.has(url.toString())) throw new Error(`来源 URL 不在公共权威清单或精确授权范围：${url}`);
  return url;
}

function isRedirect(status) {
  return [301, 302, 303, 307, 308].includes(status);
}

export async function fetchWithPolicy(input, options) {
  const {
    configuredHosts,
    authorizedUrls = new Set(),
    fetchImpl = fetch,
    maxRedirects = MAX_REDIRECTS,
    timeoutMs = 15_000,
    userAgent = 'HxHwang-Gw-ContentSync/0.1 (+https://nextweb4.github.io/)'
  } = options;
  let current = validateSourceUrl(input, configuredHosts, authorizedUrls);

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': userAgent }
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!isRedirect(response.status)) return { response, finalUrl: current, redirectCount };
    if (response.body) void response.body.cancel().catch(() => {});
    const location = response.headers.get('location');
    if (!location) throw new Error(`来源重定向缺少 Location：${current}`);
    if (redirectCount === maxRedirects) throw new Error(`来源重定向超过 ${maxRedirects} 次：${input}`);
    current = validateSourceUrl(new URL(location, current), configuredHosts, authorizedUrls);
  }
  throw new Error(`来源重定向处理失败：${input}`);
}

export async function readBoundedBody(response, maxBytes = MAX_SOURCE_BYTES, timeoutMs = 15_000) {
  const rawLength = response.headers.get('content-length');
  if (rawLength !== null) {
    if (!/^\d+$/.test(rawLength)) throw new Error(`来源 Content-Length 无效：${rawLength}`);
    if (Number(rawLength) > maxBytes) throw new Error(`来源响应超过 ${maxBytes} 字节`);
  }
  if (!response.body) return Buffer.alloc(0);

  const reader = response.body.getReader();
  let timeout;
  let didTimeout = false;
  const timedOut = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      didTimeout = true;
      reject(new Error(`来源响应读取超过 ${timeoutMs} 毫秒`));
    }, timeoutMs);
  });
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timedOut]);
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        void reader.cancel('source body size limit').catch(() => {});
        throw new Error(`来源响应超过 ${maxBytes} 字节`);
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, total);
  } catch (error) {
    if (didTimeout) void reader.cancel('source body timeout').catch(() => {});
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function snapshotContentChanged(previous, next) {
  if (!previous) return true;
  const stableKeys = ['id', 'title', 'kind', 'mode', 'url', 'sha256', 'contentType', 'bytes'];
  return stableKeys.some((key) => previous[key] !== next[key]);
}
