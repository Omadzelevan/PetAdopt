import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_request, response) => {
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: { members: true, pets: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    response.json({ organizations });
  }),
);

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(800).optional(),
  location: z.string().max(200).optional(),
});

router.post(
  '/',
  requireAuth,
  asyncHandler(async (request, response) => {
    const payload = createSchema.safeParse(request.body);

    if (!payload.success) {
      throw badRequest('Invalid organization fields', payload.error.flatten());
    }

    const organization = await prisma.organization.create({
      data: {
        name: payload.data.name,
        description: payload.data.description,
        location: payload.data.location,
        members: {
          create: {
            userId: request.user.id,
            role: 'owner',
          },
        },
      },
    });

    response.status(201).json({ organization });
  }),
);

router.post(
  '/:id/join',
  requireAuth,
  asyncHandler(async (request, response) => {
    const organization = await prisma.organization.findUnique({ where: { id: request.params.id } });

    if (!organization) {
      throw notFound('Organization not found');
    }

    await prisma.organizationMember.upsert({
      where: {
        userId_organizationId: {
          userId: request.user.id,
          organizationId: organization.id,
        },
      },
      update: {},
      create: {
        userId: request.user.id,
        organizationId: organization.id,
      },
    });

    response.json({ ok: true });
  }),
);

export default router;
