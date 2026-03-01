self.addEventListener('push', (event) => {
  let payload = { title: 'PetAdopt', body: 'You have a new notification.' };

  try {
    payload = event.data ? event.data.json() : payload;
  } catch {
    payload = { title: 'PetAdopt', body: event.data?.text() || 'New update' };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'PetAdopt', {
      body: payload.body || 'New update',
      data: { link: payload.link || '/dashboard' },
      icon: '/vite.svg',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/dashboard';

  event.waitUntil(clients.openWindow(link));
});
