// Minimal service worker — just enough to make the app installable.
// Push/notificationclick handling is added in Phase D.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
