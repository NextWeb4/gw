import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import packageMetadata from '../package.json' with { type: 'json' };
import { resolveDevelopmentUrl } from './security.mjs';
import { assertDirectAiAllowed, requestAiCompletion, requestAiModels } from './ai.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow;
const desktopEdition = packageMetadata.hxhwangEdition === 'intranet' ? 'intranet' : 'internet';

function localEntry() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'web', 'index.html');
  return path.resolve(__dirname, '..', '..', 'web', 'dist', 'index.html');
}

function trustedExternalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === 'https:' && url.hostname === 'nextweb4.github.io') return url.href;
    if (url.protocol === 'mailto:' && url.pathname.toLowerCase() === 'rays688888@gmail.com') return url.href;
  } catch {}
  return undefined;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#e9e9e4',
    title: 'HxHwang Gw 管理系统',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });
  const devUrl = resolveDevelopmentUrl(process.env.HXHWANG_WEB_URL, app.isPackaged);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const trusted = trustedExternalUrl(url);
    if (trusted) void shell.openExternal(trusted);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow?.webContents.getURL();
    if (url === current) return;
    event.preventDefault();
    const trusted = trustedExternalUrl(url);
    if (trusted) void shell.openExternal(trusted);
  });
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'clipboard-sanitized-write');
  });
  if (devUrl) await mainWindow.loadURL(devUrl);
  else await mainWindow.loadFile(localEntry());
}

ipcMain.handle('hxhwang:print-pdf', async (_event, payload) => {
  if (!payload || typeof payload.html !== 'string' || typeof payload.title !== 'string') throw new Error('无效的 PDF 请求');
  if (payload.html.length > 2_000_000) throw new Error('文稿过大，无法导出 PDF');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出 PDF',
    defaultPath: `${payload.title.replace(/[\\/:*?"<>|]/g, '_') || '公文文稿'}.pdf`,
    filters: [{ name: 'PDF 文档', extensions: ['pdf'] }]
  });
  if (result.canceled || !result.filePath) return false;
  const printWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(payload.html)}`);
    const pdf = await printWindow.webContents.printToPDF({ pageSize: 'A4', printBackground: true, preferCSSPageSize: true });
    await writeFile(result.filePath, pdf);
    return true;
  } finally {
    if (!printWindow.isDestroyed()) printWindow.destroy();
  }
});

ipcMain.handle('hxhwang:ai-models', async (_event, payload) => {
  assertDirectAiAllowed(desktopEdition);
  return requestAiModels(payload);
});
ipcMain.handle('hxhwang:ai-generate', async (_event, payload) => {
  assertDirectAiAllowed(desktopEdition);
  return requestAiCompletion(payload);
});

app.whenReady().then(async () => {
  await createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) void createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
