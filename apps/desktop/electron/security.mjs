export function resolveDevelopmentUrl(rawUrl, isPackaged) {
  if (!rawUrl || isPackaged) return undefined;

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('HXHWANG_WEB_URL 不是有效 URL');
  }

  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('HXHWANG_WEB_URL 仅允许本机 HTTP 开发服务器');
  }
  if (url.username || url.password) throw new Error('HXHWANG_WEB_URL 不得包含凭据');
  return url.href;
}
