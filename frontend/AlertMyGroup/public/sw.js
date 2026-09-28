self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const { ringId, channelName, senderName, hasAudio } = data;

  const title = senderName ? `${senderName} is ringing!` : 'AlertMyGroup';
  const options = {
    body: channelName ? `${channelName}${hasAudio ? ' · voice note' : ''}` : 'Someone needs you',
    tag: ringId ? `ring-${ringId}` : 'ring',
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300, 100, 300],
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192-maskable.png',
    data: { ringId },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const ringId = event.notification.data && event.notification.data.ringId;
  const url = ringId ? `/r/${ringId}` : '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) await client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(url);
    })()
  );
});
