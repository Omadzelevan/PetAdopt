import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FloatingBackground } from './FloatingBackground';
import { ThemeToggle } from './ThemeToggle';

const baseDesktopLinks = [
  { to: '/', label: 'Home' },
  { to: '/pets', label: 'Browse Pets' },
  { to: '/post', label: 'Post Animal' },
  { to: '/donate', label: 'Donate' },
  { to: '/dashboard', label: 'Dashboard' },
];

const baseMobileLinks = [
  { to: '/', label: 'Home' },
  { to: '/pets', label: 'Pets' },
  { to: '/post', label: 'Post' },
  { to: '/donate', label: 'Donate' },
  { to: '/dashboard', label: 'Dash' },
  { to: '/auth', label: 'Auth' },
];

function linkClassName({ isActive }) {
  return isActive ? 'nav-link is-active' : 'nav-link';
}

function mobileClassName({ isActive }) {
  return isActive ? 'bottom-link is-active' : 'bottom-link';
}

export function AppShell({ children }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const desktopLinks = user?.role === 'ADMIN'
    ? [...baseDesktopLinks, { to: '/admin', label: 'Admin' }]
    : baseDesktopLinks;

  const mobileLinks = user?.role === 'ADMIN'
    ? [...baseMobileLinks, { to: '/admin', label: 'Admin' }]
    : baseMobileLinks;

  return (
    <div className="app-shell">
      <FloatingBackground />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="top-nav glass-panel">
        <NavLink to="/" className="brand-block">
          <span className="brand-mark" aria-hidden="true">
            PA
          </span>
          <div>
            <p className="brand-title">PetAdopt</p>
            <p className="brand-subtitle">Modern Animal Adoption Platform</p>
          </div>
        </NavLink>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {desktopLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={linkClassName}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          {user ? (
            <button type="button" className="ghost-link ghost-button" onClick={logout}>
              Sign out
            </button>
          ) : (
            <NavLink to="/auth" className="ghost-link">
              Sign in
            </NavLink>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main id="main-content" className="page-frame" tabIndex={-1}>
        {children}
      </main>

      <nav className="bottom-nav glass-panel" aria-label="Mobile navigation">
        {mobileLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={mobileClassName}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
