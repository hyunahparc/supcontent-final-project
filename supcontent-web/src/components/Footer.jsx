/**
 * Footer.jsx
 *
 * Footer sombre, 3 colonnes sur desktop, empilé sur mobile.
 * Cohérent avec le Header (même palette noire/rouge).
 */
import { Link } from 'react-router-dom';

const LINKS = {
  'Explorer': [
    { label: 'Films',       to: '/films'   },
    { label: 'Séries',      to: '/series'  },
    { label: 'Top 100',     to: '/top'     },
    { label: 'Nouveautés',  to: '/new'     },
  ],
  'Compte': [
    { label: 'Se connecter', to: '/login'    },
    { label: 'S\'inscrire',  to: '/register' },
    { label: 'Mon profil',   to: '/profile'  },
  ],
  'Légal': [
    { label: 'Mentions légales', to: '/legal'   },
    { label: 'Confidentialité',  to: '/privacy' },
    { label: 'Conditions',       to: '/terms'   },
  ],
};

const SOCIAL = [
  {
    label: 'GitHub',
    href:  'https://github.com',
    icon:  (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.13 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    ),
  },
  {
    label: 'Twitter / X',
    href:  'https://x.com',
    icon:  (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href:  'https://instagram.com',
    icon:  (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={s.footer}>
      <div style={s.inner}>

        {/* Branding */}
        <div style={s.brand}>
          <Link to="/" style={s.logo}>
            <span style={s.logoIcon}>S</span>
            <span style={s.logoText}>Sup<span style={s.logoAccent}>Content</span></span>
          </Link>
          <p style={s.tagline}>
            Découvrez, explorez et suivez vos films et séries préférés.
          </p>
          <div style={s.social}>
            {SOCIAL.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                style={s.socialLink}
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* Colonnes de liens */}
        {Object.entries(LINKS).map(([title, links]) => (
          <div key={title} style={s.col}>
            <h3 style={s.colTitle}>{title}</h3>
            {links.map(({ label, to }) => (
              <Link key={to} to={to} style={s.link}>{label}</Link>
            ))}
          </div>
        ))}
      </div>

      {/* Bas de page */}
      <div style={s.bottom}>
        <div style={s.bottomInner}>
          <span style={s.copyright}>
            © {year} SupContent — Propulsé par TMDB
          </span>
          <span style={s.disclaimer}>
            Ce site utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.
          </span>
        </div>
      </div>
    </footer>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = {
  footer: {
    backgroundColor: '#050505',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    marginTop: 'auto',
  },
  inner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '56px 24px 40px',
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    gap: '40px',
  },

  // Brand column
  brand: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    background: 'linear-gradient(135deg, #e50914 0%, #b00710 100%)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: '800',
    color: '#fff',
    flexShrink: 0,
  },
  logoText: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#f0f0f0',
    letterSpacing: '-0.3px',
  },
  logoAccent: { color: '#e50914' },
  tagline: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 1.6,
    maxWidth: '220px',
    margin: 0,
  },
  social: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  socialLink: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.45)',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.07)',
    transition: 'all 0.2s',
    textDecoration: 'none',
  },

  // Link columns
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  colTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: '0 0 4px',
  },
  link: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    transition: 'color 0.2s',
    lineHeight: 1,
  },

  // Bottom bar
  bottom: {
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  bottomInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
  copyright: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
  },
  disclaimer: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.2)',
  },
};