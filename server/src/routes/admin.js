import { PetStatus, Role } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { createNotification } from '../lib/notifications.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';

const router = Router();

router.use(requireAuth, requireRole(Role.ADMIN));

router.get(
  '/pets',
  asyncHandler(async (request, response) => {
    const status = String(request.query.status || '').toUpperCase();

    const pets = await prisma.pet.findMany({
      where: {
        status: Object.values(PetStatus).includes(status) ? status : undefined,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        photos: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    response.json({ pets });
  }),
);

router.patch(
  '/pets/:id/status',
  asyncHandler(async (request, response) => {
    const status = String(request.body?.status || '').toUpperCase();

    if (!Object.values(PetStatus).includes(status)) {
      throw badRequest('Invalid pet status');
    }

    const pet = await prisma.pet.update({
      where: { id: request.params.id },
      data: { status },
      include: {
        owner: {
          select: {
            id: true,
          },
        },
      },
    });

    await createNotification({
      userId: pet.owner.id,
      title: 'Moderation update',
      body: `${pet.name} listing is now ${status.toLowerCase()}`,
      link: `/pets/${pet.id}`,
    });

    response.json({ pet });
  }),
);

router.get(
  '/reports',
  asyncHandler(async (_request, response) => {
    const reports = await prisma.report.findMany({
      include: {
        pet: {
          select: {
            id: true,
            name: true,
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    response.json({ reports });
  }),
);

router.get(
  '/users',
  asyncHandler(async (_request, response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    response.json({ users });
  }),
);

export default router;
