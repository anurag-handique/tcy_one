import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker } from './lib/webPush';

// Initialize Service Worker for native Windows & macOS push notifications
registerServiceWorker().catch((err) => {
  console.debug('ServiceWorker init notice:', err);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

