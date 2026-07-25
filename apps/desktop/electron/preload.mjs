import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hxhwang', {
  printPdf: (html, title) => ipcRenderer.invoke('hxhwang:print-pdf', { html, title }),
  listAiModels: (baseUrl, apiKey) => ipcRenderer.invoke('hxhwang:ai-models', { baseUrl, apiKey }),
  generateAi: (payload) => ipcRenderer.invoke('hxhwang:ai-generate', payload)
});
