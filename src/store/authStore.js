import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { apiRequest } from '../lib/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: '',
      user: null,
      isHydrating: true,
      setHydrated: () => set({ isHydrating: false }),
      setSession: ({ token, user }) => set({ token, user }),
      logout: () => set({ token: '', user: null }),
      refreshMe: async () => {
        const token = get().token;

        if (!token) {
          return null;
        }

        try {
          const response = await apiRequest('/auth/me', { token });
          set({ user: response.user });
          return response.user;
        } catch {
          set({ token: '', user: null });
          return null;
        }
      },
      login: async ({ email, password }) => {
        const response = await apiRequest('/auth/login', {
          method: 'POST',
          body: { email, password },
        });

        set({ token: response.accessToken, user: response.user });
        return response;
      },
      register: async ({ name, email, password }) => {
        const response = await apiRequest('/auth/register', {
          method: 'POST',
          body: { name, email, password },
        });

        return response;
      },
      verifyEmail: async (token) =>
        apiRequest('/auth/verify-email', {
          method: 'POST',
          body: { token },
        }),
    }),
    {
      name: 'petadopt-auth',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
