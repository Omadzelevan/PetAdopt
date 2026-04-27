import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPaginationMeta,
  buildPetFacets,
  buildPublicPetWhere,
  parsePetListQuery,
} from './petQuery.js';

test('parsePetListQuery normalizes filters, search, and page bounds', () => {
  const parsed = parsePetListQuery({
    page: '0',
    pageSize: '999',
    search: '  milo ',
    listingType: 'ADOPTION',
    breed: ' all ',
    ageGroup: 'young',
    featured: 'true',
  });

  assert.equal(parsed.page, 1);
  assert.equal(parsed.pageSize, 24);
  assert.equal(parsed.search, 'milo');
  assert.equal(parsed.featuredOnly, true);
  assert.equal(parsed.filters.listingType, 'ADOPTION');
  assert.equal(parsed.filters.breed, undefined);
  assert.equal(parsed.filters.ageGroup, 'young');
});

test('buildPublicPetWhere always scopes list queries to active listings', () => {
  const where = buildPublicPetWhere(
    parsePetListQuery({
      search: 'Tbilisi',
      location: 'Tbilisi',
    }),
  );

  assert.equal(where.status, 'ACTIVE');
  assert.equal(where.location, 'Tbilisi');
  assert.equal(where.OR?.length, 3);
});

test('buildPaginationMeta reports next and previous pages correctly', () => {
  const meta = buildPaginationMeta({
    page: 2,
    pageSize: 12,
    totalCount: 25,
  });

  assert.deepEqual(meta, {
    page: 2,
    pageSize: 12,
    totalCount: 25,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: true,
  });
});

test('buildPetFacets returns unique sorted breed and location values', () => {
  const facets = buildPetFacets([
    { breed: 'Beagle', location: 'Tbilisi' },
    { breed: 'Akita', location: 'Batumi' },
    { breed: 'Beagle', location: 'Tbilisi' },
  ]);

  assert.deepEqual(facets, {
    breeds: ['Akita', 'Beagle'],
    locations: ['Batumi', 'Tbilisi'],
  });
});
