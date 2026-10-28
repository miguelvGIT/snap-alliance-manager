/// <reference lib="webworker" />
export {};
const scope = self as unknown as ServiceWorkerGlobalScope;
scope.addEventListener('install', () => {
  void scope.skipWaiting();
});
scope.addEventListener('activate', (event) => {
  event.waitUntil(scope.clients.claim());
});
scope.addEventListener('push', (event) => {
  if (!event.data) return;
  const payload = event.data.json() as {
    title: string;
    body: string;
    week: string;
    reset: string;
    tag: string;
  };
  if (Date.parse(payload.reset) <= Date.now()) return;
  event.waitUntil(
    scope.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/icon-192.png',
      data: { week: payload.week, reset: payload.reset },
    }),
  );
});
scope.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const reset = event.notification.data?.reset;
  const url =
    reset && Date.parse(reset) <= Date.now()
      ? '/'
      : '/#week?week=' + encodeURIComponent(event.notification.data.week);
  event.waitUntil(scope.clients.openWindow(url));
});
