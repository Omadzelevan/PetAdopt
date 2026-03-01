import webpush from 'web-push';
import { config } from '../config.js';
import { prisma } from './prisma.js';

if (config.vapid.publicKey && config.vapid.privateKey) {
  webpush.setVapidDetails(
    config.vapid.subject,
    config.vapid.publicKey,
    config.vapid.privateKey,
  );
}

export function isPushConfigured() {
  return Boolean(config.vapid.publicKey && config.vapid.privateKey);
}

export async function sendPushNotification(userId, payload) {
  if (!isPushConfigured()) {
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { endpoint: subscription.endpoint } });
        }
      }
    }),
  );
}
