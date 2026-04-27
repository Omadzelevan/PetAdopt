import { ListingType, PetStatus } from '@prisma/client';

export const DEFAULT_PET_PAGE_SIZE = 12;
export const MAX_PET_PAGE_SIZE = 24;

function normalizeFilterValue(value) {
  if (value === null || typeof value === 'undefined') {
    return undefined;
  }

  const normalized = String(value).trim();

  if (!normalized || normalized.toLowerCase() === 'all') {
    return undefined;
  }

  return normalized;
}

function normalizePositiveInt(value, fallback, max = Number.POSITIVE_INFINITY) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function normalizeEnumValue(value, allowedValues) {
  const normalized = normalizeFilterValue(value);

  if (!normalized || !allowedValues.includes(normalized)) {
    return undefined;
  }

  return normalized;
}

function normalizeBoolean(value) {
  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return undefined;
}

export function parsePetListQuery(query = {}) {
  const page = normalizePositiveInt(query.page, 1);
  const pageSize = normalizePositiveInt(query.pageSize, DEFAULT_PET_PAGE_SIZE, MAX_PET_PAGE_SIZE);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    search: normalizeFilterValue(query.search),
    featuredOnly: normalizeBoolean(query.featured) === true,
    filters: {
      listingType: normalizeEnumValue(query.listingType, Object.values(ListingType)),
      breed: normalizeFilterValue(query.breed),
      ageGroup: normalizeFilterValue(query.ageGroup),
      gender: normalizeFilterValue(query.gender),
      size: normalizeFilterValue(query.size),
      location: normalizeFilterValue(query.location),
    },
  };
}

export function buildPublicPetWhere(parsedQuery) {
  return {
    status: PetStatus.ACTIVE,
    ...parsedQuery.filters,
    featured: parsedQuery.featuredOnly ? true : undefined,
    OR: parsedQuery.search
      ? [
          { name: { contains: parsedQuery.search } },
          { breed: { contains: parsedQuery.search } },
          { location: { contains: parsedQuery.search } },
        ]
      : undefined,
  };
}

export function buildPaginationMeta({ page, pageSize, totalCount }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

function uniqueSortedValues(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

export function buildPetFacets(pets) {
  return {
    breeds: uniqueSortedValues(pets.map((pet) => pet.breed)),
    locations: uniqueSortedValues(pets.map((pet) => pet.location)),
  };
}
