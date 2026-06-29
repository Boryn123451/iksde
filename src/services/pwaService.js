import { showToast } from '../components/toast.js';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations?.().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys
          .filter((key) => key.startsWith('deep-weather-app-shell'))
          .forEach((key) => caches.delete(key));
      });
    }
    return;
  }
  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', document.baseURI).toString();
    navigator.serviceWorker.register(swUrl).catch(() => {
      showToast('Service worker niedostępny', 'error', 3000);
    });
  });
}
