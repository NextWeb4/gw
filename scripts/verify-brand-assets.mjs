import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

async function verifyPng(relativePath, expectedSize) {
  const file = await readFile(path.join(root, relativePath));
  if (!file.subarray(0, 8).equals(pngSignature)) throw new Error(`${relativePath} 不是 PNG`);
  if (file.readUInt32BE(16) !== expectedSize || file.readUInt32BE(20) !== expectedSize) throw new Error(`${relativePath} 尺寸必须为 ${expectedSize}x${expectedSize}`);
  return file;
}

await verifyPng(path.join('apps', 'web', 'public', 'icons', 'icon-192.png'), 192);
await verifyPng(path.join('apps', 'web', 'public', 'icons', 'icon-512.png'), 512);
await verifyPng(path.join('apps', 'desktop', 'build', 'icon.png'), 512);
const icoPng = await verifyPng(path.join('apps', 'desktop', 'build', 'icon-256.png'), 256);
const ico = await readFile(path.join(root, 'apps', 'desktop', 'build', 'icon.ico'));
if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1 || ico.readUInt16LE(4) !== 1) throw new Error('Electron ICO 目录头无效');
if (ico.readUInt32LE(14) !== icoPng.length || ico.readUInt32LE(18) !== 22 || !ico.subarray(22, 30).equals(pngSignature)) throw new Error('Electron ICO 未包含有效的 256px PNG');

process.stdout.write('Verified Web and Electron brand assets.\n');
