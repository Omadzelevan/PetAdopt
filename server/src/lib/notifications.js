import { prisma } from './prisma.js';
import { sendPushNotification } from './push.js';

export async function createNotification({ userId, title, body, link }) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      link,
    },
  });

  await sendPushNotification(userId, {
    title,
    body,
    link,
    notificationId: notification.id,
  });

  return notification;
}
