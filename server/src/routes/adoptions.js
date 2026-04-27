import { RequestStatus, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { createNotification } from '../lib/notifications.js';
import { requireAuth } from '../middleware/auth.js';
import {
  canSubmitRequestForListing,
  getAutoRejectedRequestIds,
  isRequestStatusChangeAllowed,
} from '../utils/adoptionRules.js';
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

    if (!pet || pet.status !== 'ACTIVE' || !canSubmitRequestForListing(pet.listingType)) {
      throw badRequest('This listing is not available for adoption requests');
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
            listingType: true,
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
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
            breed: true,
            location: true,
            listingType: true,
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

    if (!isRequestStatusChangeAllowed(adoptionRequest.status, status)) {
      throw badRequest('Only pending requests can be approved or rejected');
    }

    const relatedPendingRequests =
      status === RequestStatus.APPROVED
        ? await prisma.adoptionRequest.findMany({
            where: {
              petId: adoptionRequest.petId,
              status: RequestStatus.PENDING,
            },
            select: {
              id: true,
              requesterId: true,
              status: true,
            },
          })
        : [];

    const closedRequestIds =
      status === RequestStatus.APPROVED
        ? getAutoRejectedRequestIds(relatedPendingRequests, adoptionRequest.id)
        : [];

    const updated = await prisma.$transaction(async (transaction) => {
      const updatedRequest = await transaction.adoptionRequest.update({
        where: { id: adoptionRequest.id },
        data: { status },
      });

      if (status === RequestStatus.APPROVED) {
        if (closedRequestIds.length > 0) {
          await transaction.adoptionRequest.updateMany({
            where: {
              id: {
                in: closedRequestIds,
              },
            },
            data: { status: RequestStatus.REJECTED },
          });
        }

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

    const autoRejectedRequests = relatedPendingRequests.filter((request) =>
      closedRequestIds.includes(request.id),
    );

    await Promise.allSettled(
      autoRejectedRequests.map((request) =>
        createNotification({
          userId: request.requesterId,
          title: 'Adoption request updated',
          body: `${adoptionRequest.pet.name} is no longer available`,
          link: '/dashboard',
        }),
      ),
    );

    response.json({ request: updated, closedRequestIds });
  }),
);

export default router;
