import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
  const hadServiceWorkerController = Boolean(navigator.serviceWorker.controller);
  let reloadingForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadServiceWorkerController || reloadingForUpdate) return;
    reloadingForUpdate = true;
    window.location.reload();
  });
  registerSW({
    immediate: true,
    onRegisteredSW: (_serviceWorkerUrl, registration) => {
      registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      if (registration) void registration.update().catch(() => undefined);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
