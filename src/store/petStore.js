import { create } from 'zustand';
import { petCatalog } from '../data/pets';
import { apiRequest } from '../lib/api';
import { normalizePet } from '../lib/normalizePet';

export const baseFilters = {
  breed: 'all',
  age: 'all',
  gender: 'all',
  size: 'all',
  location: 'all',
  listingType: 'all',
};

function buildQueryString(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (!value || value === 'all') {
      return;
    }

    if (key === 'age') {
      params.set('ageGroup', value);
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

const fallbackPets = petCatalog.map((pet) => ({
  ...pet,
  listingType: 'ADOPTION',
  status: 'ACTIVE',
}));

export const usePetStore = create((set, get) => ({
  pets: fallbackPets,
  filters: { ...baseFilters },
  savedIds: [],
  loading: false,
  initialized: false,
  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),
  resetFilters: () => set({ filters: { ...baseFilters } }),
  setSavedIds: (ids) => set({ savedIds: ids }),
  getPetById: (id) => get().pets.find((pet) => pet.id === id),
  fetchPets: async (filters = {}) => {
    set({ loading: true });

    try {
      const query = buildQueryString(filters);
      const response = await apiRequest(`/pets${query}`);
      const pets = response.pets.map(normalizePet);
      set({ pets, loading: false, initialized: true });
      return pets;
    } catch (error) {
      console.error(error);
      set({ loading: false, initialized: true });
      return get().pets;
    }
  },
  fetchPetById: async (id) => {
    try {
      const response = await apiRequest(`/pets/${id}`);
      const pet = normalizePet(response.pet);
      const currentPets = get().pets;
      const exists = currentPets.some((entry) => entry.id === pet.id);
      set({
        pets: exists
          ? currentPets.map((entry) => (entry.id === pet.id ? pet : entry))
          : [pet, ...currentPets],
      });
      return pet;
    } catch (error) {
      console.error(error);
      return null;
    }
  },
  bootstrap: async (token) => {
    const alreadyInitialized = get().initialized;

    if (!alreadyInitialized) {
      await get().fetchPets();
    }

    if (token) {
      try {
        const response = await apiRequest('/pets/saved', { token });
        const ids = response.pets.map((pet) => pet.id);
        set({ savedIds: ids });
      } catch (error) {
        console.error(error);
      }
    } else {
      set({ savedIds: [] });
    }
  },
  toggleSaved: async (id, token) => {
    if (!token) {
      return { saved: false, requiresAuth: true };
    }

    const response = await apiRequest(`/pets/${id}/save`, {
      method: 'POST',
      token,
    });

    set((state) => {
      const isSaved = state.savedIds.includes(id);
      return {
        savedIds: response.saved
          ? isSaved
            ? state.savedIds
            : [...state.savedIds, id]
          : state.savedIds.filter((savedId) => savedId !== id),
      };
    });

    return response;
  },
  createPet: async ({ formData, token }) => {
    const response = await apiRequest('/pets', {
      method: 'POST',
      token,
      body: formData,
      isFormData: true,
    });

    const pet = normalizePet(response.pet);
    set((state) => ({
      pets: [pet, ...state.pets],
    }));

    return pet;
  },
}));
