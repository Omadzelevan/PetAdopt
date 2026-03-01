import { ListingType, PetStatus, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';
import { normalizePhotoInput, toPublicAssetUrl } from '../utils/assetUrl.js';
import { createNotification } from '../lib/notifications.js';

const router = Router();

function serializePet(pet) {
  return {
    ...pet,
    photos: pet.photos?.map((photo) => ({
      ...photo,
      url: toPublicAssetUrl(photo.url),
    })) || [],
  };
}

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = request.query;

    const where = {
      status: query.status && Object.values(PetStatus).includes(String(query.status))
        ? String(query.status)
        : 'ACTIVE',
      listingType:
        query.listingType && Object.values(ListingType).includes(String(query.listingType))
          ? String(query.listingType)
          : undefined,
      breed: query.breed && query.breed !== 'all' ? String(query.breed) : undefined,
      ageGroup: query.ageGroup && query.ageGroup !== 'all' ? String(query.ageGroup) : undefined,
      gender: query.gender && query.gender !== 'all' ? String(query.gender) : undefined,
      size: query.size && query.size !== 'all' ? String(query.size) : undefined,
      location: query.location && query.location !== 'all' ? String(query.location) : undefined,
      OR: query.search
        ? [
            { name: { contains: String(query.search) } },
            { breed: { contains: String(query.search) } },
            { location: { contains: String(query.search) } },
          ]
        : undefined,
    };

    const pets = await prisma.pet.findMany({
      where,
      include: {
        photos: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });

    response.json({ pets: pets.map(serializePet) });
  }),
);

router.get(
  '/featured',
  asyncHandler(async (_request, response) => {
    const pets = await prisma.pet.findMany({
      where: {
        featured: true,
        status: 'ACTIVE',
      },
      include: {
        photos: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    response.json({ pets: pets.map(serializePet) });
  }),
);

router.get(
  '/saved',
  requireAuth,
  asyncHandler(async (request, response) => {
    const saved = await prisma.savedPet.findMany({
      where: { userId: request.user.id },
      include: {
        pet: {
          include: {
            photos: {
              orderBy: { position: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    response.json({ pets: saved.map((entry) => serializePet(entry.pet)) });
  }),
);

router.get(
  '/my/listings',
  requireAuth,
  asyncHandler(async (request, response) => {
    const pets = await prisma.pet.findMany({
      where: { ownerId: request.user.id },
      include: {
        photos: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    response.json({ pets: pets.map(serializePet) });
  }),
);

const createPetSchema = z.object({
  name: z.string().min(2).max(120),
  species: z.string().min(2).max(60),
  breed: z.string().min(2).max(100),
  age: z.string().min(1).max(40),
  ageGroup: z.string().min(1).max(40).optional(),
  gender: z.string().min(1).max(40),
  size: z.string().min(1).max(40),
  location: z.string().min(1).max(120),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  health: z.string().min(3).max(500),
  description: z.string().min(10).max(1000),
  story: z.string().max(1500).optional(),
  listingType: z.nativeEnum(ListingType).optional(),
  featured: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => (value === true || value === 'true' ? true : false)),
});

router.post(
  '/',
  requireAuth,
  upload.array('photos', 6),
  asyncHandler(async (request, response) => {
    const payload = createPetSchema.safeParse(request.body);

    if (!payload.success) {
      throw badRequest('Invalid pet fields', payload.error.flatten());
    }

    const data = payload.data;

    const photoUrls = normalizePhotoInput([], request.files);

    if (photoUrls.length === 0) {
      throw badRequest('Please provide at least one photo');
    }

    const status = request.user.role === Role.ADMIN ? PetStatus.ACTIVE : PetStatus.PENDING;

    const pet = await prisma.pet.create({
      data: {
        name: data.name,
        species: data.species,
        breed: data.breed,
        age: data.age,
        ageGroup: data.ageGroup,
        gender: data.gender,
        size: data.size,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        health: data.health,
        description: data.description,
        story: data.story,
        listingType: data.listingType || ListingType.ADOPTION,
        featured: data.featured,
        status,
        ownerId: request.user.id,
        photos: {
          create: photoUrls.map((url, index) => ({
            url,
            position: index,
          })),
        },
      },
      include: {
        photos: {
          orderBy: { position: 'asc' },
        },
      },
    });

    response.status(201).json({ pet: serializePet(pet) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const pet = await prisma.pet.findUnique({
      where: { id: request.params.id },
      include: {
        photos: {
          orderBy: { position: 'asc' },
        },
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!pet) {
      throw notFound('Pet not found');
    }

    response.json({ pet: serializePet(pet) });
  }),
);

router.patch(
  '/:id',
  requireAuth,
  upload.array('photos', 6),
  asyncHandler(async (request, response) => {
    const pet = await prisma.pet.findUnique({
      where: { id: request.params.id },
      include: { photos: true },
    });

    if (!pet) {
      throw notFound('Pet not found');
    }

    const isOwner = pet.ownerId === request.user.id;
    const isAdmin = request.user.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
      throw forbidden('You are not allowed to update this pet');
    }

    const payload = createPetSchema.partial().safeParse(request.body);

    if (!payload.success) {
      throw badRequest('Invalid update fields', payload.error.flatten());
    }

    const photos = normalizePhotoInput(request.body?.photos, request.files);

    const updatedPet = await prisma.pet.update({
      where: { id: pet.id },
      data: {
        ...payload.data,
        photos:
          photos.length > 0
            ? {
                deleteMany: { petId: pet.id },
                create: photos.map((url, index) => ({
                  url,
                  position: index,
                })),
              }
            : undefined,
      },
      include: {
        photos: {
          orderBy: { position: 'asc' },
        },
      },
    });

    response.json({ pet: serializePet(updatedPet) });
  }),
);

router.post(
  '/:id/save',
  requireAuth,
  asyncHandler(async (request, response) => {
    const pet = await prisma.pet.findUnique({ where: { id: request.params.id } });

    if (!pet) {
      throw notFound('Pet not found');
    }

    const existing = await prisma.savedPet.findUnique({
      where: {
        userId_petId: {
          userId: request.user.id,
          petId: pet.id,
        },
      },
    });

    if (existing) {
      await prisma.savedPet.delete({ where: { userId_petId: { userId: request.user.id, petId: pet.id } } });
      response.json({ saved: false });
      return;
    }

    await prisma.savedPet.create({
      data: {
        userId: request.user.id,
        petId: pet.id,
      },
    });

    response.json({ saved: true });
  }),
);

router.patch(
  '/:id/status',
  requireAuth,
  requireRole(Role.ADMIN),
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
            name: true,
          },
        },
      },
    });

    await createNotification({
      userId: pet.ownerId,
      title: 'Pet listing status updated',
      body: `${pet.name} is now ${status.toLowerCase()}`,
      link: `/pets/${pet.id}`,
    });

    response.json({ pet });
  }),
);

export default router;
