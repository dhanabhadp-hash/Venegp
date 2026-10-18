import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker for offline caching and fast loading
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('PWA: New content available');
  },
  onOfflineReady() {
    console.log('PWA: App ready to work offline');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
