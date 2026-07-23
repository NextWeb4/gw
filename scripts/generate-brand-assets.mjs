import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'assets', 'brand', 'app-icon.svg');
const webIconDir = path.join(root, 'apps', 'web', 'public', 'icons');
const desktopBuildDir = path.join(root, 'apps', 'desktop', 'build');

const svg = await readFile(sourcePath, 'utf8');
await Promise.all([mkdir(webIconDir, { recursive: true }), mkdir(desktopBuildDir, { recursive: true })]);

const browser = await chromium.launch({ headless: true });
try {
  const render = async (size, destination) => {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body,svg{width:100%;height:100%;margin:0;display:block;overflow:hidden}</style>${svg}`);
    await page.locator('svg').screenshot({ path: destination, omitBackground: false });
    await page.close();
  };

  await render(192, path.join(webIconDir, 'icon-192.png'));
  await render(512, path.join(webIconDir, 'icon-512.png'));
  await render(512, path.join(desktopBuildDir, 'icon.png'));
  const icoPngPath = path.join(desktopBuildDir, 'icon-256.png');
  await render(256, icoPngPath);

  const png = await readFile(icoPngPath);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);
  await writeFile(path.join(desktopBuildDir, 'icon.ico'), Buffer.concat([header, png]));
} finally {
  await browser.close();
}

process.stdout.write('Generated Web PNG and Electron PNG/ICO brand assets.\n');
