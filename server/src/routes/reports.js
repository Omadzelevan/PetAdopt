import { ReportStatus, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { createNotification } from '../lib/notifications.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';

const router = Router();

const createSchema = z.object({
  petId: z.string().min(2),
  reason: z.string().min(2).max(200),
  details: z.string().max(1200).optional(),
});

router.post(
  '/',
  requireAuth,
  asyncHandler(async (request, response) => {
    const payload = createSchema.safeParse(request.body);

    if (!payload.success) {
      throw badRequest('Invalid report fields', payload.error.flatten());
    }

    const pet = await prisma.pet.findUnique({ where: { id: payload.data.petId } });

    if (!pet) {
      throw notFound('Pet not found');
    }

    const report = await prisma.report.create({
      data: {
        petId: payload.data.petId,
        reporterId: request.user.id,
        reason: payload.data.reason,
        details: payload.data.details,
      },
    });

    response.status(201).json({ report });
  }),
);

router.get(
  '/my',
  requireAuth,
  asyncHandler(async (request, response) => {
    const reports = await prisma.report.findMany({
      where: { reporterId: request.user.id },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    response.json({ reports });
  }),
);

router.get(
  '/admin',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_request, response) => {
    const reports = await prisma.report.findMany({
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            ownerId: true,
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

router.patch(
  '/admin/:id/status',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (request, response) => {
    const status = String(request.body?.status || '').toUpperCase();

    if (!Object.values(ReportStatus).includes(status)) {
      throw badRequest('Invalid report status');
    }

    const report = await prisma.report.update({
      where: { id: request.params.id },
      data: { status },
      include: {
        reporter: {
          select: {
            id: true,
          },
        },
        pet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await createNotification({
      userId: report.reporter.id,
      title: 'Report status updated',
      body: `Your report for ${report.pet.name} is now ${status.toLowerCase()}`,
      link: `/pets/${report.pet.id}`,
    });

    response.json({ report });
  }),
);

export default router;
