import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveDevelopmentUrl } from '../electron/security.mjs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('allows only loopback HTTP development URLs in unpackaged builds', () => {
  assert.equal(resolveDevelopmentUrl('http://127.0.0.1:5173', false), 'http://127.0.0.1:5173/');
  assert.equal(resolveDevelopmentUrl('http://localhost:4173/app', false), 'http://localhost:4173/app');
  assert.throws(() => resolveDevelopmentUrl('https://example.com', false), /仅允许本机/);
  assert.throws(() => resolveDevelopmentUrl('http://example.com', false), /仅允许本机/);
  assert.throws(() => resolveDevelopmentUrl('http://user:pass@localhost:5173', false), /不得包含凭据/);
});

test('ignores development URL overrides in packaged builds', () => {
  assert.equal(resolveDevelopmentUrl('http://127.0.0.1:5173', true), undefined);
  assert.equal(resolveDevelopmentUrl(undefined, false), undefined);
});

test('declares complete Debian runtime dependencies', () => {
  assert.deepEqual(packageJson.build.deb.depends, [
    'libgtk-3-0',
    'libnotify4',
    'libnss3',
    'libxss1',
    'libxtst6',
    'xdg-utils',
    'libatspi2.0-0',
    'libuuid1',
    'libsecret-1-0',
    'libasound2',
    'libgbm1',
  ]);
});
