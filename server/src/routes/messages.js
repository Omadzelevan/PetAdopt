import { Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';

const router = Router();

async function getRequestWithPermissions(adoptionRequestId, userId, role) {
  const request = await prisma.adoptionRequest.findUnique({
    where: { id: adoptionRequestId },
    include: {
      pet: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!request) {
    throw notFound('Adoption request not found');
  }

  const isParticipant =
    request.requesterId === userId || request.pet.ownerId === userId || role === Role.ADMIN;

  if (!isParticipant) {
    throw forbidden('You are not allowed to view this chat');
  }

  return request;
}

router.get(
  '/:adoptionRequestId',
  requireAuth,
  asyncHandler(async (request, response) => {
    await getRequestWithPermissions(
      request.params.adoptionRequestId,
      request.user.id,
      request.user.role,
    );

    const messages = await prisma.message.findMany({
      where: { adoptionRequestId: request.params.adoptionRequestId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    response.json({ messages });
  }),
);

const sendSchema = z.object({
  content: z.string().min(1).max(2000),
});

router.post(
  '/:adoptionRequestId',
  requireAuth,
  asyncHandler(async (request, response) => {
    const payload = sendSchema.safeParse(request.body);

    if (!payload.success) {
      throw badRequest('Invalid message fields', payload.error.flatten());
    }

    const adoptionRequest = await getRequestWithPermissions(
      request.params.adoptionRequestId,
      request.user.id,
      request.user.role,
    );

    const receiverId =
      request.user.id === adoptionRequest.requesterId
        ? adoptionRequest.pet.ownerId
        : adoptionRequest.requesterId;

    const message = await prisma.message.create({
      data: {
        adoptionRequestId: adoptionRequest.id,
        senderId: request.user.id,
        receiverId,
        content: payload.data.content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const io = request.app.get('io');
    io.to(`request:${adoptionRequest.id}`).emit('message:new', message);

    response.status(201).json({ message });
  }),
);

export default router;
