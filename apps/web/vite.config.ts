import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const webCsp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'";
const privateCsp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src https: http://127.0.0.1:* http://localhost:*; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'";

export default defineConfig(({ mode }) => {
  const privateServicesBuild = mode === 'desktop' || mode === 'intranet';
  const outDir = mode === 'intranet' ? 'dist-intranet' : 'dist';
  return {
  define: {
    __APP_VERSION__: JSON.stringify('0.1.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __PRIVATE_SERVICES__: JSON.stringify(privateServicesBuild)
  },
  plugins: [
    {
      name: 'hxhwang-csp',
      transformIndexHtml(html) {
        return html.replace('__HXHWANG_CSP__', privateServicesBuild ? privateCsp : webCsp);
      }
    },
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'HxHwang Gw 管理系统',
        short_name: 'HxHwang Gw',
        description: '本地优先的公文事务与写作管理系统',
        lang: 'zh-CN',
        theme_color: '#16201d',
        background_color: '#e9e9e4',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{html,js,css,json,svg,png,ico,woff2}'],
        navigateFallback: 'index.html'
      }
    })
  ],
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    outDir,
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/rxdb/') || id.includes('/dexie/')) return 'local-storage';
          if (id.includes('/@tiptap/') || id.includes('/prosemirror-')) return 'writing-editor';
          if (id.includes('/docx/')) return 'document-export';
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'react-core';
          if (id.includes('/lucide-react/')) return 'icons';
        }
      }
    }
  }
  };
});
