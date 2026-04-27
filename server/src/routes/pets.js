import { ListingType, PetStatus, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { normalizePhotoInput, toPublicAssetUrl } from '../utils/assetUrl.js';
import { upload } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';
import { createNotification } from '../lib/notifications.js';
import {
  buildPaginationMeta,
  buildPetFacets,
  buildPublicPetWhere,
  parsePetListQuery,
} from '../utils/petQuery.js';
import {
  deleteUploadedFiles,
  findRemovedLocalPhotoUrls,
  uploadedFilesToUrls,
} from '../utils/petPhotos.js';

const router = Router();

function serializePet(pet, request) {
  return {
    ...pet,
    photos:
      pet.photos?.map((photo) => ({
        ...photo,
        url: toPublicAssetUrl(photo.url, request),
      })) || [],
  };
}

function canViewPet(pet, user) {
  if (pet.status === PetStatus.ACTIVE) {
    return true;
  }

  if (!user) {
    return false;
  }

  return user.role === Role.ADMIN || pet.ownerId === user.id;
}

const coordinateField = z.preprocess((value) => {
  if (value === '' || value === null || typeof value === 'undefined') {
    return undefined;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}, z.number().finite().optional());

const featuredField = z.preprocess((value) => {
  if (value === '' || value === null || typeof value === 'undefined') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
}, z.boolean().optional());

const createPetSchema = z.object({
  name: z.string().min(2).max(120),
  species: z.string().min(2).max(60),
  breed: z.string().min(2).max(100),
  age: z.string().min(1).max(40),
  ageGroup: z.string().min(1).max(40).optional(),
  gender: z.string().min(1).max(40),
  size: z.string().min(1).max(40),
  location: z.string().min(1).max(120),
  latitude: coordinateField,
  longitude: coordinateField,
  health: z.string().min(3).max(500),
  description: z.string().min(10).max(1000),
  story: z.string().max(1500).optional(),
  listingType: z.nativeEnum(ListingType).optional(),
  featured: featuredField,
});

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const parsedQuery = parsePetListQuery(request.query);
    const where = buildPublicPetWhere(parsedQuery);

    const [totalCount, pets] = await prisma.$transaction([
      prisma.pet.count({ where }),
      prisma.pet.findMany({
        where,
        include: {
          photos: {
            orderBy: { position: 'asc' },
          },
        },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        skip: parsedQuery.skip,
        take: parsedQuery.take,
      }),
    ]);

    response.json({
      pets: pets.map((pet) => serializePet(pet, request)),
      meta: buildPaginationMeta({
        page: parsedQuery.page,
        pageSize: parsedQuery.pageSize,
        totalCount,
      }),
    });
  }),
);

router.get(
  '/featured',
  asyncHandler(async (request, response) => {
    const pets = await prisma.pet.findMany({
      where: {
        featured: true,
        status: PetStatus.ACTIVE,
      },
      include: {
        photos: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 6,
    });

    response.json({ pets: pets.map((pet) => serializePet(pet, request)) });
  }),
);

router.get(
  '/stats',
  asyncHandler(async (_request, response) => {
    const [
      activeListings,
      featuredPets,
      fosterListings,
      lostFoundListings,
      partnerOrganizations,
      pendingRequests,
    ] = await prisma.$transaction([
      prisma.pet.count({
        where: { status: PetStatus.ACTIVE },
      }),
      prisma.pet.count({
        where: { status: PetStatus.ACTIVE, featured: true },
      }),
      prisma.pet.count({
        where: {
          status: PetStatus.ACTIVE,
          listingType: ListingType.FOSTER,
        },
      }),
      prisma.pet.count({
        where: {
          status: PetStatus.ACTIVE,
          listingType: ListingType.LOST_FOUND,
        },
      }),
      prisma.organization.count(),
      prisma.adoptionRequest.count({
        where: { status: 'PENDING' },
      }),
    ]);

    response.json({
      stats: {
        activeListings,
        featuredPets,
        fosterListings,
        lostFoundListings,
        partnerOrganizations,
        pendingRequests,
      },
    });
  }),
);

router.get(
  '/facets',
  asyncHandler(async (_request, response) => {
    const pets = await prisma.pet.findMany({
      where: { status: PetStatus.ACTIVE },
      select: {
        breed: true,
        location: true,
      },
    });

    response.json({ facets: buildPetFacets(pets) });
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

    response.json({ pets: saved.map((entry) => serializePet(entry.pet, request)) });
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

    response.json({ pets: pets.map((pet) => serializePet(pet, request)) });
  }),
);

router.post(
  '/',
  requireAuth,
  upload.array('photos', 6),
  asyncHandler(async (request, response) => {
    const uploadedPhotoUrls = uploadedFilesToUrls(request.files);
    const payload = createPetSchema.safeParse(request.body);

    if (!payload.success) {
      await deleteUploadedFiles(uploadedPhotoUrls);
      throw badRequest('Invalid pet fields', payload.error.flatten());
    }

    const data = payload.data;

    if (uploadedPhotoUrls.length === 0) {
      await deleteUploadedFiles(uploadedPhotoUrls);
      throw badRequest('Please provide at least one photo');
    }

    const isAdmin = request.user.role === Role.ADMIN;
    const status = isAdmin ? PetStatus.ACTIVE : PetStatus.PENDING;

    try {
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
          featured: isAdmin ? Boolean(data.featured) : false,
          status,
          ownerId: request.user.id,
          photos: {
            create: uploadedPhotoUrls.map((url, index) => ({
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

      response.status(201).json({ pet: serializePet(pet, request) });
    } catch (error) {
      await deleteUploadedFiles(uploadedPhotoUrls);
      throw error;
    }
  }),
);

router.get(
  '/:id',
  optionalAuth,
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

    if (!pet || !canViewPet(pet, request.user)) {
      throw notFound('Pet not found');
    }

    response.json({ pet: serializePet(pet, request) });
  }),
);

router.patch(
  '/:id',
  requireAuth,
  upload.array('photos', 6),
  asyncHandler(async (request, response) => {
    const uploadedPhotoUrls = uploadedFilesToUrls(request.files);
    const pet = await prisma.pet.findUnique({
      where: { id: request.params.id },
      include: { photos: true },
    });

    if (!pet) {
      await deleteUploadedFiles(uploadedPhotoUrls);
      throw notFound('Pet not found');
    }

    const isOwner = pet.ownerId === request.user.id;
    const isAdmin = request.user.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
      await deleteUploadedFiles(uploadedPhotoUrls);
      throw forbidden('You are not allowed to update this pet');
    }

    if (pet.status === PetStatus.ADOPTED && !isAdmin) {
      await deleteUploadedFiles(uploadedPhotoUrls);
      throw badRequest('Adopted listings can only be changed by admins');
    }

    const payload = createPetSchema.partial().safeParse(request.body);

    if (!payload.success) {
      await deleteUploadedFiles(uploadedPhotoUrls);
      throw badRequest('Invalid update fields', payload.error.flatten());
    }

    const hasPhotoUpdate =
      uploadedPhotoUrls.length > 0 || typeof request.body?.photos !== 'undefined';
    const nextPhotoUrls = hasPhotoUpdate
      ? normalizePhotoInput(request.body?.photos, request.files)
      : [];

    if (hasPhotoUpdate && nextPhotoUrls.length === 0) {
      await deleteUploadedFiles(uploadedPhotoUrls);
      throw badRequest('Please provide at least one photo');
    }

    const { featured, ...nextFields } = payload.data;
    const hasAnyUpdate =
      hasPhotoUpdate ||
      Object.keys(nextFields).length > 0 ||
      typeof featured === 'boolean';

    if (!hasAnyUpdate) {
      response.json({ pet: serializePet(pet, request) });
      return;
    }

    const removedPhotoUrls = hasPhotoUpdate
      ? findRemovedLocalPhotoUrls(pet.photos, nextPhotoUrls)
      : [];

    const data = {
      ...nextFields,
      photos: hasPhotoUpdate
        ? {
            deleteMany: { petId: pet.id },
            create: nextPhotoUrls.map((url, index) => ({
              url,
              position: index,
            })),
          }
        : undefined,
    };

    if (isAdmin) {
      if (typeof featured === 'boolean') {
        data.featured = featured;
      }
    } else {
      data.status = PetStatus.PENDING;
      data.featured = false;
    }

    try {
      const updatedPet = await prisma.pet.update({
        where: { id: pet.id },
        data,
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

      await deleteUploadedFiles(removedPhotoUrls);

      response.json({ pet: serializePet(updatedPet, request) });
    } catch (error) {
      await deleteUploadedFiles(uploadedPhotoUrls);
      throw error;
    }
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

    if (pet.status !== PetStatus.ACTIVE) {
      throw badRequest('Only active listings can be saved');
    }

    if (pet.ownerId === request.user.id) {
      throw badRequest('You cannot save your own listing');
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
      await prisma.savedPet.delete({
        where: {
          userId_petId: {
            userId: request.user.id,
            petId: pet.id,
          },
        },
      });
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
      data: {
        status,
        featured: status === PetStatus.ACTIVE ? undefined : false,
      },
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
