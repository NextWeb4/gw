import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hxhwang', {
  printPdf: (html, title) => ipcRenderer.invoke('hxhwang:print-pdf', { html, title })
});
