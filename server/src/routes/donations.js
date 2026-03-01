import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';

const router = Router();

const donationSchema = z.object({
  amountCents: z.coerce.number().int().min(100).max(10000000),
  currency: z.string().length(3).optional(),
});

router.post(
  '/',
  requireAuth,
  asyncHandler(async (request, response) => {
    const payload = donationSchema.safeParse(request.body);

    if (!payload.success) {
      throw badRequest('Invalid donation fields', payload.error.flatten());
    }

    const donation = await prisma.donation.create({
      data: {
        userId: request.user.id,
        amountCents: payload.data.amountCents,
        currency: (payload.data.currency || 'USD').toUpperCase(),
        status: 'COMPLETED',
        provider: 'TEST',
      },
    });

    response.status(201).json({ donation });
  }),
);

router.get(
  '/my',
  requireAuth,
  asyncHandler(async (request, response) => {
    const donations = await prisma.donation.findMany({
      where: { userId: request.user.id },
      orderBy: { createdAt: 'desc' },
    });

    response.json({ donations });
  }),
);

export default router;
