import { PetStatus, Role } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { createNotification } from '../lib/notifications.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { deleteUploadedFiles } from '../utils/petPhotos.js';

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

router.delete(
  '/pets/:id',
  asyncHandler(async (request, response) => {
    const pet = await prisma.pet.findUnique({
      where: { id: request.params.id },
      include: {
        photos: true,
      },
    });

    if (!pet) {
      throw notFound('Pet not found');
    }

    await prisma.$transaction(async (transaction) => {
      const adoptionRequests = await transaction.adoptionRequest.findMany({
        where: { petId: pet.id },
        select: { id: true },
      });

      const adoptionRequestIds = adoptionRequests.map((entry) => entry.id);

      if (adoptionRequestIds.length > 0) {
        await transaction.message.deleteMany({
          where: {
            adoptionRequestId: {
              in: adoptionRequestIds,
            },
          },
        });
      }

      await transaction.adoptionRequest.deleteMany({
        where: { petId: pet.id },
      });
      await transaction.savedPet.deleteMany({
        where: { petId: pet.id },
      });
      await transaction.report.deleteMany({
        where: { petId: pet.id },
      });
      await transaction.petPhoto.deleteMany({
        where: { petId: pet.id },
      });
      await transaction.pet.delete({
        where: { id: pet.id },
      });
    });

    await deleteUploadedFiles(pet.photos.map((photo) => photo.url));

    response.json({ ok: true });
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
