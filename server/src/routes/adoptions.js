import { RequestStatus, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { createNotification } from '../lib/notifications.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';

const router = Router();

const createSchema = z.object({
  petId: z.string().min(2),
  message: z.string().max(1500).optional(),
});

router.post(
  '/',
  requireAuth,
  asyncHandler(async (request, response) => {
    const payload = createSchema.safeParse(request.body);

    if (!payload.success) {
      throw badRequest('Invalid adoption request fields', payload.error.flatten());
    }

    const { petId, message } = payload.data;

    const pet = await prisma.pet.findUnique({ where: { id: petId } });

    if (!pet || pet.status !== 'ACTIVE') {
      throw badRequest('Pet is not available for adoption');
    }

    if (pet.ownerId === request.user.id) {
      throw badRequest('You cannot request adoption for your own listing');
    }

    const existing = await prisma.adoptionRequest.findFirst({
      where: {
        petId,
        requesterId: request.user.id,
        status: 'PENDING',
      },
    });

    if (existing) {
      throw badRequest('You already have a pending request for this pet');
    }

    const adoptionRequest = await prisma.adoptionRequest.create({
      data: {
        petId,
        requesterId: request.user.id,
        message,
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await createNotification({
      userId: adoptionRequest.pet.ownerId,
      title: 'New adoption request',
      body: `${adoptionRequest.requester.name} requested to adopt ${adoptionRequest.pet.name}`,
      link: '/dashboard',
    });

    response.status(201).json({ adoptionRequest });
  }),
);

router.get(
  '/my',
  requireAuth,
  asyncHandler(async (request, response) => {
    const requests = await prisma.adoptionRequest.findMany({
      where: { requesterId: request.user.id },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            breed: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    response.json({ requests });
  }),
);

router.get(
  '/received',
  requireAuth,
  asyncHandler(async (request, response) => {
    const requests = await prisma.adoptionRequest.findMany({
      where: {
        pet: {
          ownerId: request.user.id,
        },
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    response.json({ requests });
  }),
);

router.patch(
  '/:id/status',
  requireAuth,
  asyncHandler(async (request, response) => {
    const status = String(request.body?.status || '').toUpperCase();

    if (!Object.values(RequestStatus).includes(status)) {
      throw badRequest('Invalid request status');
    }

    const adoptionRequest = await prisma.adoptionRequest.findUnique({
      where: { id: request.params.id },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!adoptionRequest) {
      throw notFound('Adoption request not found');
    }

    const isOwner = adoptionRequest.pet.ownerId === request.user.id;
    const isAdmin = request.user.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
      throw forbidden('You are not allowed to change this request status');
    }

    const updated = await prisma.$transaction(async (transaction) => {
      const updatedRequest = await transaction.adoptionRequest.update({
        where: { id: adoptionRequest.id },
        data: { status },
      });

      if (status === 'APPROVED') {
        await transaction.pet.update({
          where: { id: adoptionRequest.petId },
          data: { status: 'ADOPTED' },
        });
      }

      return updatedRequest;
    });

    await createNotification({
      userId: adoptionRequest.requesterId,
      title: 'Adoption request updated',
      body: `${adoptionRequest.pet.name} request is now ${status.toLowerCase()}`,
      link: '/dashboard',
    });

    response.json({ request: updated });
  }),
);

export default router;
