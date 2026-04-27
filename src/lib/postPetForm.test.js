import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDescription,
  getListingTypeGuidance,
  inferAgeGroup,
  initialPostForm,
  validatePostStep,
} from './postPetForm.js';

test('buildDescription prefers notes and falls back to a health summary', () => {
  assert.equal(
    buildDescription({
      ...initialPostForm,
      health: 'Vaccinated and dewormed',
      notes: 'Calm around kids and crate trained',
    }),
    'Calm around kids and crate trained',
  );

  assert.equal(
    buildDescription({
      ...initialPostForm,
      health: 'Vaccinated and dewormed',
      notes: '   ',
    }),
    'Health summary: Vaccinated and dewormed',
  );
});

test('validatePostStep catches missing base fields and invalid coordinates', () => {
  const errors = validatePostStep(0, {
    ...initialPostForm,
    name: 'A',
    breed: '',
    age: '',
    location: '',
    latitude: '100',
    longitude: '-200',
  });

  assert.equal(errors.name, 'Name must be at least 2 characters.');
  assert.equal(errors.breed, 'Breed must be at least 2 characters.');
  assert.equal(errors.age, 'Age is required.');
  assert.equal(errors.location, 'Location is required.');
  assert.equal(errors.latitude, 'Latitude must be between -90 and 90.');
  assert.equal(errors.longitude, 'Longitude must be between -180 and 180.');
});

test('validatePostStep requires photos, meaningful health details, and final confirmation', () => {
  const photoErrors = validatePostStep(1, initialPostForm);
  assert.equal(photoErrors.photos, 'Upload at least one photo.');

  const healthErrors = validatePostStep(2, {
    ...initialPostForm,
    health: 'ok',
    notes: 'short',
  });
  assert.equal(healthErrors.health, 'Health summary must be at least 3 characters.');
  assert.equal(healthErrors.notes, 'Add a bit more detail for the listing description.');

  const agreementErrors = validatePostStep(3, initialPostForm);
  assert.equal(agreementErrors.agree, 'Please confirm the information is accurate.');
});

test('inferAgeGroup handles descriptive and numeric ages', () => {
  assert.equal(inferAgeGroup('6 months'), 'baby');
  assert.equal(inferAgeGroup('2'), 'young');
  assert.equal(inferAgeGroup('5 years'), 'adult');
  assert.equal(inferAgeGroup('9'), 'senior');
});

test('getListingTypeGuidance changes copy for foster and lost-found flows', () => {
  assert.match(getListingTypeGuidance('FOSTER'), /temporary housing/i);
  assert.match(getListingTypeGuidance('LOST_FOUND'), /last known location/i);
  assert.match(getListingTypeGuidance('ADOPTION'), /temperament/i);
});
