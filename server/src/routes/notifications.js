import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (request, response) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: request.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    response.json({ notifications });
  }),
);

router.patch(
  '/:id/read',
  requireAuth,
  asyncHandler(async (request, response) => {
    const notification = await prisma.notification.updateMany({
      where: {
        id: request.params.id,
        userId: request.user.id,
      },
      data: { isRead: true },
    });

    if (notification.count === 0) {
      throw badRequest('Notification not found');
    }

    response.json({ ok: true });
  }),
);

const pushSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

router.post(
  '/push/subscribe',
  requireAuth,
  asyncHandler(async (request, response) => {
    const payload = pushSchema.safeParse(request.body);

    if (!payload.success) {
      throw badRequest('Invalid push subscription', payload.error.flatten());
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: payload.data.endpoint },
      update: {
        userId: request.user.id,
        p256dh: payload.data.keys.p256dh,
        auth: payload.data.keys.auth,
      },
      create: {
        userId: request.user.id,
        endpoint: payload.data.endpoint,
        p256dh: payload.data.keys.p256dh,
        auth: payload.data.keys.auth,
      },
    });

    response.status(201).json({ ok: true });
  }),
);

router.post(
  '/push/unsubscribe',
  requireAuth,
  asyncHandler(async (request, response) => {
    const endpoint = String(request.body?.endpoint || '');

    if (!endpoint) {
      throw badRequest('Endpoint is required');
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        userId: request.user.id,
        endpoint,
      },
    });

    response.json({ ok: true });
  }),
);

export default router;
