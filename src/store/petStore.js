import { create } from 'zustand';
import { apiRequest } from '../lib/api';
import { normalizePet } from '../lib/normalizePet';

export const baseFilters = {
  search: '',
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

function mergePetMap(currentMap, pets) {
  return pets.reduce(
    (nextMap, pet) => ({
      ...nextMap,
      [pet.id]: pet,
    }),
    currentMap,
  );
}

export const usePetStore = create((set, get) => ({
  pets: [],
  featuredPets: [],
  petMap: {},
  facets: {
    breeds: [],
    locations: [],
  },
  stats: {
    activeListings: 0,
    featuredPets: 0,
    fosterListings: 0,
    lostFoundListings: 0,
    partnerOrganizations: 0,
    pendingRequests: 0,
  },
  filters: { ...baseFilters },
  page: 1,
  pageSize: 12,
  totalCount: 0,
  totalPages: 1,
  savedIds: [],
  loading: false,
  featuredLoading: false,
  statsLoading: false,
  facetsLoading: false,
  error: '',
  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
      page: 1,
    })),
  resetFilters: () =>
    set({
      filters: { ...baseFilters },
      page: 1,
    }),
  setPage: (page) => set({ page }),
  setSavedIds: (ids) => set({ savedIds: ids }),
  getPetById: (id) => {
    const state = get();
    return (
      state.petMap[id] ||
      state.pets.find((pet) => pet.id === id) ||
      state.featuredPets.find((pet) => pet.id === id)
    );
  },
  fetchPets: async (options = {}) => {
    const state = get();
    const filters = options.filters || state.filters;
    const page = options.page || state.page;
    const pageSize = options.pageSize || state.pageSize;
    const params = new URLSearchParams(buildQueryString(filters).replace(/^\?/, ''));

    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    set({ loading: true, error: '' });

    try {
      const response = await apiRequest(`/pets?${params.toString()}`);
      const pets = (response.pets || []).map(normalizePet);

      set((current) => ({
        pets,
        petMap: mergePetMap(current.petMap, pets),
        page: response.meta?.page || page,
        pageSize: response.meta?.pageSize || pageSize,
        totalCount: response.meta?.totalCount || 0,
        totalPages: response.meta?.totalPages || 1,
        loading: false,
        error: '',
      }));

      return pets;
    } catch (error) {
      console.error(error);
      set({
        pets: [],
        loading: false,
        error: error.message,
        totalCount: 0,
        totalPages: 1,
      });
      return [];
    }
  },
  fetchFeaturedPets: async () => {
    set({ featuredLoading: true });

    try {
      const response = await apiRequest('/pets/featured');
      const pets = (response.pets || []).map(normalizePet);

      set((state) => ({
        featuredPets: pets,
        featuredLoading: false,
        petMap: mergePetMap(state.petMap, pets),
      }));

      return pets;
    } catch (error) {
      console.error(error);
      set({ featuredPets: [], featuredLoading: false });
      return [];
    }
  },
  fetchPetStats: async () => {
    set({ statsLoading: true });

    try {
      const response = await apiRequest('/pets/stats');
      set({
        stats: response.stats || get().stats,
        statsLoading: false,
      });

      return response.stats;
    } catch (error) {
      console.error(error);
      set({ statsLoading: false });
      return get().stats;
    }
  },
  fetchFacets: async () => {
    set({ facetsLoading: true });

    try {
      const response = await apiRequest('/pets/facets');
      set({
        facets: response.facets || { breeds: [], locations: [] },
        facetsLoading: false,
      });

      return response.facets;
    } catch (error) {
      console.error(error);
      set({ facetsLoading: false });
      return get().facets;
    }
  },
  fetchPetById: async (id, token) => {
    try {
      const response = await apiRequest(`/pets/${id}`, token ? { token } : undefined);
      const pet = normalizePet(response.pet);
      const currentPets = get().pets;
      const exists = currentPets.some((entry) => entry.id === pet.id);
      set((state) => ({
        petMap: mergePetMap(state.petMap, [pet]),
        pets: exists
          ? currentPets.map((entry) => (entry.id === pet.id ? pet : entry))
          : [pet, ...currentPets],
      }));
      return pet;
    } catch (error) {
      console.error(error);
      return null;
    }
  },
  bootstrap: async (token) => {
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
      petMap: mergePetMap(state.petMap, [pet]),
      featuredPets: pet.featured
        ? [pet, ...state.featuredPets.filter((entry) => entry.id !== pet.id)].slice(0, 6)
        : state.featuredPets,
    }));

    return pet;
  },
}));
