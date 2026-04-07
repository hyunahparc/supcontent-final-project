/**
 * Header.jsx
 *
 * Header fixe, responsive (hamburger sur mobile).
 * S'intègre avec AuthContext existant.
 * Design : fond noir mat, accents blanc cassé, typographie display.
 */
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { label: 'Accueil',  to: '/'         },
  { label: 'Films',    to: '/films'     },
  { label: 'Séries',   to: '/series'    },
  { label: 'Top 100',  to: '/top'       },
];

export default function Header() {
  const { user, logout }     = useAuth();
  const navigate             = useNavigate();
  const location             = useLocation();
  const [menuOpen, setMenu]  = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef              = useRef(null);

  // Ombre au scroll
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fermer le menu au changement de route
  useEffect(() => { setMenu(false); }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isActive = (to) => location.pathname === to;

  return (
    <header style={{ ...s.header, ...(scrolled ? s.headerScrolled : {}) }}>
      <div style={s.inner}>

        {/* Logo */}
        <Link to="/" style={s.logo}>
          <span style={s.logoIcon}>S</span>
          <span style={s.logoText}>Sup<span style={s.logoAccent}>Content</span></span>
        </Link>

        {/* Nav desktop */}
        <nav style={s.nav} className="sc-nav" aria-label="Navigation principale">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              style={{ ...s.navLink, ...(isActive(to) ? s.navLinkActive : {}) }}
            >
              {label}
              {isActive(to) && <span style={s.activeBar} />}
            </Link>
          ))}
        </nav>

        {/* Actions desktop */}
        <div style={s.actions} className="sc-actions">
          {user ? (
            <>
              <span style={s.username}>👤 {user.username}</span>
              <button onClick={handleLogout} style={s.btnSecondary}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    style={s.btnGhost}>Se connecter</Link>
              <Link to="/register" style={s.btnPrimary}>S'inscrire</Link>
            </>
          )}
        </div>

        {/* Hamburger mobile */}
        <button
          ref={menuRef}
          style={s.hamburger}
          className="sc-hamburger"
          onClick={() => setMenu((o) => !o)}
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
        >
          <span style={{ ...s.bar, ...(menuOpen ? s.barTopOpen   : {}) }} />
          <span style={{ ...s.bar, ...(menuOpen ? s.barMidOpen   : {}) }} />
          <span style={{ ...s.bar, ...(menuOpen ? s.barBotOpen   : {}) }} />
        </button>
      </div>

      {/* Menu mobile */}
      <div
        style={{ ...s.mobileMenu, ...(menuOpen ? s.mobileMenuOpen : {}) }}
        aria-hidden={!menuOpen}
      >
        {NAV_LINKS.map(({ label, to }) => (
          <Link
            key={to}
            to={to}
            style={{ ...s.mobileLink, ...(isActive(to) ? s.mobileLinkActive : {}) }}
          >
            {label}
          </Link>
        ))}
        <div style={s.mobileDivider} />
        {user ? (
          <>
            <span style={s.mobileUsername}>{user.username}</span>
            <button onClick={handleLogout} style={s.mobileBtnLogout}>
              Déconnexion
            </button>
          </>
        ) : (
          <>
            <Link to="/login"    style={s.mobileLink}>Se connecter</Link>
            <Link to="/register" style={{ ...s.mobileLink, ...s.mobileLinkCta }}>
              S'inscrire →
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const TRANSITION = 'all 0.2s ease';

const s = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    width: '100%',
    backgroundColor: 'rgba(8, 8, 8, 0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    transition: 'box-shadow 0.3s ease',
  },
  headerScrolled: {
    boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
  },
  inner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    position: 'relative',
  },

  // Logo
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
    flexShrink: 0,
  },
  logoIcon: {
    width: '34px',
    height: '34px',
    background: 'linear-gradient(135deg, #e50914 0%, #b00710 100%)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '800',
    color: '#fff',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#f0f0f0',
    letterSpacing: '-0.3px',
  },
  logoAccent: {
    color: '#e50914',
  },

  // Nav
  nav: {
    display: 'flex',
    gap: '4px',
    flex: 1,
  },
  navLink: {
    position: 'relative',
    padding: '6px 14px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    textDecoration: 'none',
    borderRadius: '8px',
    transition: TRANSITION,
  },
  navLinkActive: {
    color: '#fff',
  },
  activeBar: {
    position: 'absolute',
    bottom: '-1px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '20px',
    height: '2px',
    backgroundColor: '#e50914',
    borderRadius: '2px',
  },

  // Actions
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  username: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  btnGhost: {
    padding: '7px 16px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    borderRadius: '8px',
    transition: TRANSITION,
  },
  btnSecondary: {
    padding: '7px 16px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: TRANSITION,
  },
  btnPrimary: {
    padding: '7px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    background: '#e50914',
    border: 'none',
    borderRadius: '8px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: TRANSITION,
  },

  // Hamburger
  hamburger: {
    display: 'none',
    flexDirection: 'column',
    gap: '5px',
    padding: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  bar: {
    display: 'block',
    width: '22px',
    height: '2px',
    backgroundColor: '#fff',
    borderRadius: '2px',
    transition: 'transform 0.25s ease, opacity 0.25s ease',
    transformOrigin: 'center',
  },
  barTopOpen: { transform: 'translateY(7px) rotate(45deg)'  },
  barMidOpen: { opacity: 0                                   },
  barBotOpen: { transform: 'translateY(-7px) rotate(-45deg)' },

  // Mobile menu
  mobileMenu: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    maxHeight: 0,
    transition: 'max-height 0.35s ease, padding 0.35s ease',
    borderTop: '1px solid rgba(255,255,255,0)',
    padding: '0 24px',
  },
  mobileMenuOpen: {
    maxHeight: '400px',
    padding: '12px 24px 20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  mobileLink: {
    padding: '10px 0',
    fontSize: '15px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  mobileLinkActive: {
    color: '#fff',
  },
  mobileLinkCta: {
    color: '#e50914',
    fontWeight: '700',
  },
  mobileDivider: {
    height: '1px',
    background: 'rgba(255,255,255,0.08)',
    margin: '8px 0',
  },
  mobileUsername: {
    padding: '10px 0',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
  },
  mobileBtnLogout: {
    marginTop: '4px',
    padding: '10px 0',
    fontSize: '14px',
    fontWeight: '500',
    color: '#ff6b6b',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
};