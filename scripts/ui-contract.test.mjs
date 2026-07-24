import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');

test('interface uses Lucide components without emoji or custom functional image icons', async () => {
  const [app, index] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/index.html'),
  ]);
  const interfaceSource = `${app}\n${index}`;

  assert.match(app, /from 'lucide-react'/, 'interface must import Lucide components');
  assert.doesNotMatch(interfaceSource, /[\u2600-\u27BF\u{1F300}-\u{1FAFF}]/u, 'interface must not contain emoji');
  assert.doesNotMatch(app, /<(?:img|svg)\b/i, 'functional interface icons must not use image or inline SVG elements');
  assert.doesNotMatch(interfaceSource, /icon-font|fontawesome|material-icons/i, 'interface must not use icon fonts');
});

test('visual system stays local and honors reduced motion', async () => {
  const [app, css] = await Promise.all([
    read('apps/web/src/App.tsx'),
    read('apps/web/src/styles.css'),
  ]);

  assert.doesNotMatch(css, /@import|url\(["']?https?:\/\//i, 'visual CSS must not load remote assets');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'visual CSS must support reduced motion');
  assert.match(app, /className="kinetic-field" aria-hidden="true"/, 'kinetic background must stay out of the accessibility tree');
  assert.match(css, /\.kinetic-field[^}]*pointer-events:\s*none/s, 'kinetic background must not intercept input');
});
