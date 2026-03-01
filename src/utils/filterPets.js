export function filterPets(pets, filters) {
  return pets.filter((pet) => {
    if (filters.listingType !== 'all' && pet.listingType !== filters.listingType) {
      return false;
    }

    if (filters.breed !== 'all' && pet.breed !== filters.breed) {
      return false;
    }

    if (filters.age !== 'all' && pet.ageGroup !== filters.age) {
      return false;
    }

    if (filters.gender !== 'all' && pet.gender !== filters.gender) {
      return false;
    }

    if (filters.size !== 'all' && pet.size !== filters.size) {
      return false;
    }

    if (filters.location !== 'all' && pet.location !== filters.location) {
      return false;
    }

    return true;
  });
}

export function uniqueValues(pets, key) {
  return [...new Set(pets.map((pet) => pet[key]))].sort((a, b) =>
    a.localeCompare(b),
  );
}
