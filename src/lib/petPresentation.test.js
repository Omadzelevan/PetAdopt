import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canSavePet,
  getListingCallToAction,
  getListingMetaLabel,
} from './petPresentation.js';

test('getListingCallToAction adapts to listing type and moderation state', () => {
  assert.equal(getListingCallToAction({ listingType: 'ADOPTION', status: 'ACTIVE' }), 'View Adoption Profile');
  assert.equal(getListingCallToAction({ listingType: 'FOSTER', status: 'ACTIVE' }), 'View Foster Profile');
  assert.equal(getListingCallToAction({ listingType: 'LOST_FOUND', status: 'ACTIVE' }), 'Open Alert');
  assert.equal(getListingCallToAction({ listingType: 'ADOPTION', status: 'PENDING' }), 'Review Status');
});

test('getListingMetaLabel exposes the expected badge label', () => {
  assert.equal(getListingMetaLabel({ listingType: 'ADOPTION' }), 'Adoption');
  assert.equal(getListingMetaLabel({ listingType: 'FOSTER' }), 'Foster');
  assert.equal(getListingMetaLabel({ listingType: 'LOST_FOUND' }), 'Alert');
});

test('canSavePet blocks inactive and own listings while allowing active public ones', () => {
  assert.equal(
    canSavePet({ status: 'ACTIVE', ownerId: 'owner-1' }, 'viewer-1'),
    true,
  );
  assert.equal(
    canSavePet({ status: 'PENDING', ownerId: 'owner-1' }, 'viewer-1'),
    false,
  );
  assert.equal(
    canSavePet({ status: 'ACTIVE', ownerId: 'owner-1' }, 'owner-1'),
    false,
  );
});
