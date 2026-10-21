export function registerOfflineWeb() {
  if (!__DEV__ && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Offline website setup failed', error));
  }
}
