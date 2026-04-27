export const postSteps = ['Basic Info', 'Photos Upload', 'Health Details', 'Confirmation'];

export const initialPostForm = {
  name: '',
  species: 'Dog',
  listingType: 'ADOPTION',
  breed: '',
  age: '',
  gender: 'Female',
  size: 'Medium',
  location: '',
  latitude: '',
  longitude: '',
  health: '',
  notes: '',
  photos: [],
  agree: false,
};

export function buildDescription(form) {
  const notes = form.notes.trim();
  const health = form.health.trim();

  if (notes) {
    return notes;
  }

  return `Health summary: ${health}`;
}

function isCoordinateInRange(value, min, max) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return true;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min && numeric <= max;
}

export function validatePostStep(step, form) {
  const errors = {};

  if (step === 0) {
    if (form.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }
    if (form.breed.trim().length < 2) {
      errors.breed = 'Breed must be at least 2 characters.';
    }
    if (!form.age.trim()) {
      errors.age = 'Age is required.';
    }
    if (!form.location.trim()) {
      errors.location = 'Location is required.';
    }
    if (!isCoordinateInRange(form.latitude, -90, 90)) {
      errors.latitude = 'Latitude must be between -90 and 90.';
    }
    if (!isCoordinateInRange(form.longitude, -180, 180)) {
      errors.longitude = 'Longitude must be between -180 and 180.';
    }
  }

  if (step === 1 && form.photos.length === 0) {
    errors.photos = 'Upload at least one photo.';
  }

  if (step === 2) {
    if (form.health.trim().length < 3) {
      errors.health = 'Health summary must be at least 3 characters.';
    }

    if (buildDescription(form).trim().length < 10) {
      errors.notes = 'Add a bit more detail for the listing description.';
    }
  }

  if (step === 3 && !form.agree) {
    errors.agree = 'Please confirm the information is accurate.';
  }

  return errors;
}

export function inferAgeGroup(age) {
  const normalized = String(age || '').toLowerCase();

  if (normalized.includes('month') || normalized.includes('puppy') || normalized.includes('kitten')) {
    return 'baby';
  }

  const numericAge = Number.parseFloat(normalized);
  if (!Number.isNaN(numericAge)) {
    if (numericAge < 1) {
      return 'baby';
    }
    if (numericAge < 3) {
      return 'young';
    }
    if (numericAge < 7) {
      return 'adult';
    }
    return 'senior';
  }

  return 'adult';
}

export function getListingTypeGuidance(listingType) {
  if (listingType === 'FOSTER') {
    return 'Highlight care routine, temporary housing needs, and who covers medical support.';
  }

  if (listingType === 'LOST_FOUND') {
    return 'Add last known location details and any visible identifying marks or collar info.';
  }

  return 'Focus on temperament, home fit, and any adoption readiness details.';
}
