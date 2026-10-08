/*
 * Phone / browser push notifications for the dashboard (Notifications > Alert settings > Phone notifications).
 * Registered at the root scope by lib/pushNotifications.ts the first time someone turns push on. It only shows
 * what the server pushes (server/src/notifications/push.service.ts) and opens the right page when it is tapped;
 * it has no fetch handler and caches nothing, so it never serves a page. The POS counter keeps its own offline
 * service worker (scope /vendor/pos/), which is separate.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { title: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    (async () => {
      // The dashboard open on screen already rings its own bell, so a second banner would only repeat it.
      // (A test push sets `force` so the person sees it work.)
      if (!data.force) {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (windows.some((w) => w.visibilityState === 'visible')) return;
      }
      await self.registration.showNotification(data.title || 'Regantify', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        // One notification per tag: a newer one replaces the older instead of piling up on the screen.
        tag: data.tag || undefined,
        renotify: Boolean(data.tag),
        data: { url: data.url || '/vendor/dashboard' },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/vendor/dashboard', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const win of windows) {
        if (!('focus' in win)) continue;
        await win.focus();
        // Go to the page the notification is about (an order, the stock page...), inside the open dashboard.
        if ('navigate' in win && win.url !== target) {
          try {
            await win.navigate(target);
          } catch (err) {
            // A window that can't be steered still got focus; the bell has the same item.
          }
        }
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
