export function getListingCallToAction(pet) {
  if (!pet) {
    return 'View Profile';
  }

  if (pet.status && pet.status !== 'ACTIVE') {
    return 'Review Status';
  }

  if (pet.listingType === 'FOSTER') {
    return 'View Foster Profile';
  }

  if (pet.listingType === 'LOST_FOUND') {
    return 'Open Alert';
  }

  return 'View Adoption Profile';
}

export function getListingMetaLabel(pet) {
  if (!pet) {
    return 'Listing';
  }

  if (pet.listingType === 'FOSTER') {
    return 'Foster';
  }

  if (pet.listingType === 'LOST_FOUND') {
    return 'Alert';
  }

  return 'Adoption';
}

export function canSavePet(pet, userId) {
  if (!pet) {
    return false;
  }

  return pet.status === 'ACTIVE' && pet.owner?.id !== userId && pet.ownerId !== userId;
}
