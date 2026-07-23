import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authorizedUrlsForSource,
  fetchWithPolicy,
  normalizeAuthorizedUrls,
  readBoundedBody,
  snapshotContentChanged,
  validateConfiguredHosts,
  validateSourceUrl
} from './content-sync-policy.mjs';

const hosts = validateConfiguredHosts(['www.gov.cn', 'openstd.samr.gov.cn']);

test('accepts only configured HTTPS authority URLs', () => {
  assert.equal(validateSourceUrl('https://www.gov.cn/zhengce/', hosts).hostname, 'www.gov.cn');
  assert.throws(() => validateSourceUrl('http://www.gov.cn/', hosts), /HTTPS/);
  assert.throws(() => validateSourceUrl('https://user:pass@www.gov.cn/', hosts), /凭据/);
  assert.throws(() => validateSourceUrl('https://www.gov.cn:8443/', hosts), /非标准端口/);
  assert.throws(() => validateSourceUrl('https://example.com/', hosts), /精确授权范围/);
});

test('accepts a non-authority URL only through an exact automated-retrieval grant', () => {
  const records = new Map([['authorized-source', {
    authorizationStatus: 'user-confirmed',
    allowAutomatedRetrieval: true,
    authorizedSourceUrls: ['https://example.com/public/document']
  }]]);
  const source = {
    id: 'authorized-source',
    url: 'https://example.com/public/document',
    authorizationRef: 'content/licensed/authorization.json#authorized-source'
  };
  const authorizedUrls = authorizedUrlsForSource(source, records);
  assert.equal(validateSourceUrl(source.url, hosts, authorizedUrls).toString(), source.url);
  assert.throws(() => validateSourceUrl('https://example.com/public/other', hosts, authorizedUrls), /精确授权范围/);
  assert.throws(() => authorizedUrlsForSource({ ...source, url: 'https://example.com/public/other' }, records), /不在授权记录/);
  assert.throws(() => authorizedUrlsForSource(source, new Map()), /缺少自动抓取授权/);
  assert.throws(() => normalizeAuthorizedUrls(['http://example.com/public/document']), /HTTPS/);
});

test('checks every redirect target before following it', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url.toString());
    if (calls.length === 1) return new Response(null, { status: 302, headers: { location: 'https://openstd.samr.gov.cn/final' } });
    return new Response('ok', { status: 200, headers: { 'content-type': 'text/html' } });
  };
  const result = await fetchWithPolicy('https://www.gov.cn/start', { configuredHosts: hosts, fetchImpl });
  assert.equal(result.finalUrl.toString(), 'https://openstd.samr.gov.cn/final');
  assert.equal(result.redirectCount, 1);
  assert.equal(calls.length, 2);

  const rejectedFetch = async () => new Response(null, { status: 302, headers: { location: 'https://example.com/private' } });
  await assert.rejects(fetchWithPolicy('https://www.gov.cn/start', { configuredHosts: hosts, fetchImpl: rejectedFetch }), /精确授权范围/);
});

test('enforces declared and streamed response size limits', async () => {
  await assert.rejects(readBoundedBody(new Response('ok', { headers: { 'content-length': '5' } }), 4), /超过 4 字节/);
  await assert.rejects(readBoundedBody(new Response('12345'), 4), /超过 4 字节/);
  assert.equal((await readBoundedBody(new Response('1234'), 4)).toString('utf8'), '1234');
  const stalled = new Response(new ReadableStream({ start() {} }));
  await assert.rejects(readBoundedBody(stalled, 4, 10), /读取超过 10 毫秒/);
});

test('preserves retrieval time when source metadata and hash are unchanged', () => {
  const previous = { id: 'source', title: '标题', kind: 'official', mode: 'metadata', url: 'https://www.gov.cn/', sha256: 'abc', contentType: 'text/html', bytes: 10, retrievedAt: 'old' };
  assert.equal(snapshotContentChanged(previous, { ...previous, retrievedAt: 'new' }), false);
  assert.equal(snapshotContentChanged(previous, { ...previous, sha256: 'def', retrievedAt: 'new' }), true);
});
