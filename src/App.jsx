import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { PageLoader } from './components/PageLoader';
import { useAuthStore } from './store/authStore';
import { usePetStore } from './store/petStore';
import { useThemeStore } from './store/themeStore';

const HomePage = lazy(() => import('./pages/HomePage'));
const BrowsePetsPage = lazy(() => import('./pages/BrowsePetsPage'));
const PetDetailsPage = lazy(() => import('./pages/PetDetailsPage'));
const PostAnimalPage = lazy(() => import('./pages/PostAnimalPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const DonatePage = lazy(() => import('./pages/DonatePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  const location = useLocation();
  const theme = useThemeStore((state) => state.theme);
  const token = useAuthStore((state) => state.token);
  const refreshMe = useAuthStore((state) => state.refreshMe);
  const bootstrapPets = usePetStore((state) => state.bootstrap);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    bootstrapPets(token);
  }, [bootstrapPets, token]);

  useEffect(() => {
    if (token) {
      refreshMe();
    }
  }, [refreshMe, token]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    const titles = {
      '/': 'PetAdopt | Adopt, Foster, Rescue',
      '/pets': 'Browse Pets | PetAdopt',
      '/post': 'Post Animal | PetAdopt',
      '/dashboard': 'Dashboard | PetAdopt',
      '/admin': 'Admin Moderation | PetAdopt',
      '/donate': 'Donate | PetAdopt',
      '/auth': 'Sign In | PetAdopt',
    };

    document.title = titles[location.pathname] || 'PetAdopt';
  }, [location.pathname]);

  return (
    <AppShell>
      <Suspense fallback={<PageLoader fullScreen />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/pets" element={<BrowsePetsPage />} />
            <Route path="/pets/:id" element={<PetDetailsPage />} />
            <Route path="/post" element={<PostAnimalPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/donate" element={<DonatePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </AppShell>
  );
}
