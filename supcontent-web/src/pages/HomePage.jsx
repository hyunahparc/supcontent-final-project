/**
 * HomePage.jsx
 *
 * Page d'accueil complète : Hero → Tendances → Features → CTA
 *
 * Design : dark cinema, rouge Netflix-inspired, typographie display bold.
 * Architecture modulaire : chaque section est un composant autonome.
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTrending } from '../api/films';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';

// ═══════════════════════════════════════════════════════════════════════════
// Section Hero
// ═══════════════════════════════════════════════════════════════════════════
function HeroSection() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [query, setQuery] = useState('');

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim().length >= 2) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <section style={s.hero}>
      {/* Grain overlay */}
      <div style={s.heroGrain} aria-hidden="true" />
      {/* Radial glow */}
      <div style={s.heroGlow}  aria-hidden="true" />

      <div style={s.heroContent}>
        <div style={s.heroBadge}>
          <span style={s.heroBadgeDot} />
          Base de données cinéma & séries
        </div>

        <h1 style={s.heroTitle}>
          Explorez{' '}
          <span style={s.heroTitleAccent}>des milliers</span>
          {' '}de films<br />et séries en un instant.
        </h1>

        <p style={s.heroSubtitle}>
          Recherchez, découvrez et suivez vos contenus préférés grâce à nos données enrichies.
        </p>

        <form onSubmit={handleSearch} style={s.searchForm}>
          <div style={s.searchWrap}>
            <svg style={s.searchIcon} viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8"/>
              <path d="M13.5 13.5L17 17" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un film ou une série..."
              style={s.searchInput}
              aria-label="Recherche"
            />
            <button type="submit" style={s.searchBtn} disabled={query.trim().length < 2}>
              Rechercher
            </button>
          </div>
        </form>

        <div style={s.heroStats}>
          {[
            { value: '1M+',  label: 'Titres indexés'   },
            { value: '150+', label: 'Pays représentés'  },
            { value: '50K+', label: 'Avis communauté'   },
          ].map(({ value, label }) => (
            <div key={label} style={s.stat}>
              <span style={s.statValue}>{value}</span>
              <span style={s.statLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={s.scrollHint} aria-hidden="true">
        <div style={s.scrollLine} />
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Section Tendances
// ═══════════════════════════════════════════════════════════════════════════
function TrendingSection() {
  const [activeTab, setActiveTab] = useState('all');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTrending(activeTab, 12)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? 'Erreur');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [activeTab]);

  const tabs = [
    { id: 'all',    label: 'Tout'    },
    { id: 'Movie',  label: 'Films'   },
    { id: 'Series', label: 'Séries'  },
  ];

  return (
    <section style={s.section}>
      <div style={s.sectionInner}>
        <div style={s.sectionHeader}>
          <div>
            <p style={s.sectionEyebrow}>À la une</p>
            <h2 style={s.sectionTitle}>Tendances du moment</h2>
          </div>
          <div style={s.tabs} role="tablist">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                style={{ ...s.tab, ...(activeTab === id ? s.tabActive : {}) }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={s.errorBox} role="alert">
            Impossible de charger les tendances. <button onClick={() => setActiveTab(activeTab)} style={s.retryBtn}>Réessayer</button>
          </div>
        )}

        <div style={{ marginBottom: '16px', color: '#aaa', fontSize: '13px' }}>
        </div>

        <div style={s.grid}>
          {loading
            ? Array.from({ length: 12 }, (_, i) => <SkeletonCard key={i} />)
            : (data?.map((item) => <MediaCard key={item.external_id} item={item} />) ?? <p style={{ color: '#fff' }}>Aucun contenu disponible.</p>)
          }
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MediaCard
// ═══════════════════════════════════════════════════════════════════════════
function MediaCard({ item }) {
  const [hovered, setHovered] = useState(false);
  const score = Number(item.vote_average).toFixed(1);
  const year  = item.release_date?.slice(0, 4) ?? '—';

  return (
    <Link
      to={`/films/${item.external_id}`}
      style={{ ...s.card, ...(hovered ? s.cardHovered : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`${item.title} (${year})`}
    >
      {/* Poster */}
      <div style={s.cardImgWrap}>
        {item.poster_path ? (
          <img
            src={item.poster_path.startsWith('http') ? item.poster_path : `${POSTER_BASE}${item.poster_path}`}
            alt={item.title}
            style={{ ...s.cardImg, ...(hovered ? s.cardImgHovered : {}) }}
            loading="lazy"
          />
        ) : (
          <div style={s.cardImgFallback}>
            <span style={{ fontSize: '32px' }}>🎬</span>
          </div>
        )}
        {/* Badge type */}
        <span style={{ ...s.typeBadge, ...(item.media_type === 'Series' ? s.typeBadgeSeries : {}) }}>
          {item.media_type === 'Series' ? 'Série' : 'Film'}
        </span>
        {/* Score */}
        <div style={s.scoreBadge}>
          ⭐ {score}
        </div>
        {/* Hover overlay */}
        <div style={{ ...s.cardOverlay, ...(hovered ? s.cardOverlayVisible : {}) }}>
          <span style={{ ...s.viewBtn, ...(hovered ? { opacity: 1, transform: 'translateY(0)' } : {}) }}>
            Voir les détails →
          </span>
        </div>
      </div>

      <div style={s.cardBody}>
        <h3 style={s.cardTitle} title={item.title}>{item.title}</h3>
        <span style={s.cardYear}>{year}</span>
      </div>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Skeleton Card (loading)
// ═══════════════════════════════════════════════════════════════════════════
function SkeletonCard() {
  return (
    <div style={s.skeleton} aria-hidden="true">
      <div style={s.skeletonImg} />
      <div style={s.skeletonTitle} />
      <div style={s.skeletonYear} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Section Features
// ═══════════════════════════════════════════════════════════════════════════
function FeaturesSection() {
  const features = [
    {
      icon: '🔍',
      title: 'Recherche intelligente',
      desc:  'Trouvez n\'importe quel film ou série en quelques secondes grâce à notre moteur de recherche combinant cache local et TMDB.',
    },
    {
      icon: '⭐',
      title: 'Notes & avis',
      desc:  'Consultez les scores et les avis de la communauté pour ne jamais manquer un chef-d\'œuvre.',
    },
    {
      icon: '🎬',
      title: 'Fiches détaillées',
      desc:  'Accédez aux synopsis, distributions, réalisateurs et bien plus pour chaque contenu.',
    },
    {
      icon: '📱',
      title: 'Expérience responsive',
      desc:  'Une interface fluide sur desktop, tablette et mobile pour profiter de vos recherches partout.',
    },
  ];

  return (
    <section style={{ ...s.section, ...s.sectionAlt }}>
      <div style={s.sectionInner}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <p style={s.sectionEyebrow}>Pourquoi SupContent ?</p>
          <h2 style={s.sectionTitle}>Tout ce dont vous avez besoin</h2>
        </div>
        <div style={s.featuresGrid}>
          {features.map(({ icon, title, desc }) => (
            <FeatureCard key={title} icon={icon} title={title} desc={desc} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, desc }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ ...s.featureCard, ...(hovered ? s.featureCardHovered : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.featureIcon}>{icon}</div>
      <h3 style={s.featureTitle}>{title}</h3>
      <p  style={s.featureDesc}>{desc}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Section CTA
// ═══════════════════════════════════════════════════════════════════════════
function CtaSection() {
  const { user } = useAuth();
  if (user) return null;

  return (
    <section style={s.ctaSection}>
      <div style={s.ctaInner}>
        <div style={s.ctaGlow} aria-hidden="true" />
        <h2 style={s.ctaTitle}>Prêt à explorer ?</h2>
        <p style={s.ctaSubtitle}>
          Créez votre compte gratuitement et accédez à toute la base de données.
        </p>
        <div style={s.ctaActions}>
          <Link to="/register" style={s.ctaBtnPrimary}>
            Créer un compte gratuitement
          </Link>
          <Link to="/login" style={s.ctaBtnGhost}>
            J'ai déjà un compte
          </Link>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Export principal
// ═══════════════════════════════════════════════════════════════════════════
export default function HomePage() {

  return (
    <main>
      <HeroSection    />
      <TrendingSection />
      <FeaturesSection />
      <CtaSection      />
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════
const s = {
  // ── Hero ────────────────────────────────────────────────────────────────
  hero: {
    position: 'relative',
    minHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px 60px',
    background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(229,9,20,0.15) 0%, transparent 60%), #080808',
    overflow: 'hidden',
  },
  heroGrain: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
    pointerEvents: 'none',
    opacity: 0.5,
  },
  heroGlow: {
    position: 'absolute',
    top: '-10%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '600px',
    height: '300px',
    background: 'radial-gradient(ellipse, rgba(229,9,20,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroContent: {
    position: 'relative',
    maxWidth: '760px',
    textAlign: 'center',
    zIndex: 1,
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    background: 'rgba(229,9,20,0.12)',
    border: '1px solid rgba(229,9,20,0.25)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ff6b6b',
    letterSpacing: '0.5px',
    marginBottom: '24px',
    textTransform: 'uppercase',
  },
  heroBadgeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#e50914',
    animation: 'pulse 2s ease-in-out infinite',
  },
  heroTitle: {
    fontSize: 'clamp(32px, 5vw, 60px)',
    fontWeight: '800',
    color: '#fff',
    lineHeight: 1.1,
    letterSpacing: '-1.5px',
    margin: '0 0 20px',
  },
  heroTitleAccent: {
    color: '#e50914',
    position: 'relative',
  },
  heroSubtitle: {
    fontSize: '17px',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.7,
    maxWidth: '520px',
    margin: '0 auto 36px',
  },

  // Search
  searchForm: { width: '100%', maxWidth: '560px', margin: '0 auto 40px' },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '14px',
    padding: '5px 5px 5px 16px',
    backdropFilter: 'blur(8px)',
  },
  searchIcon: { width: '18px', height: '18px', flexShrink: 0, marginRight: '8px' },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    fontSize: '15px',
    color: '#fff',
    padding: '8px 0',
    minWidth: 0,
  },
  searchBtn: {
    padding: '10px 20px',
    background: '#e50914',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.2s',
  },

  // Stats
  heroStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    flexWrap: 'wrap',
  },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  statValue: { fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' },
  statLabel: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px' },

  // Scroll hint
  scrollHint: {
    position: 'absolute',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  scrollLine: {
    width: '1px',
    height: '40px',
    background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)',
    animation: 'scrollFade 2s ease-in-out infinite',
  },

  // ── Sections layout ────────────────────────────────────────────────────
  section: {
    backgroundColor: '#0a0a0a',
    padding: '80px 0',
  },
  sectionAlt: {
    backgroundColor: '#080808',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  sectionInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: '40px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  sectionEyebrow: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#e50914',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    margin: '0 0 8px',
  },
  sectionTitle: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#fff',
    letterSpacing: '-0.5px',
    margin: 0,
  },

  // Tabs
  tabs: {
    display: 'flex',
    gap: '4px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px',
    padding: '4px',
  },
  tab: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    background: 'none',
    border: 'none',
    borderRadius: '7px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: '#e50914',
    color: '#fff',
  },

  // Error
  errorBox: {
    padding: '14px 18px',
    background: 'rgba(229,9,20,0.1)',
    border: '1px solid rgba(229,9,20,0.2)',
    borderRadius: '10px',
    color: '#ff6b6b',
    fontSize: '14px',
    marginBottom: '24px',
  },
  retryBtn: {
    background: 'none',
    border: 'none',
    color: '#ff9999',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: '14px',
    padding: 0,
    marginLeft: '8px',
  },

  // ── Grid de cartes ────────────────────────────────────────────────────
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '16px',
  },

  // MediaCard
  card: {
    display: 'block',
    textDecoration: 'none',
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#111',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
  },
  cardHovered: {
    transform: 'translateY(-6px)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
    borderColor: 'rgba(229,9,20,0.3)',
  },
  cardImgWrap: {
    position: 'relative',
    paddingTop: '150%',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  cardImg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.4s ease',
  },
  cardImgHovered: { transform: 'scale(1.05)' },
  cardImgFallback: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a1a',
  },
  typeBadge: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    padding: '3px 8px',
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(4px)',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  typeBadgeSeries: { color: '#60b3ff' },
  scoreBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '3px 8px',
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(4px)',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#ffd700',
  },
  cardOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.3s ease',
  },
  cardOverlayVisible: { background: 'rgba(229,9,20,0.5)' },
  viewBtn: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#fff',
    opacity: 0,
    transform: 'translateY(8px)',
    transition: 'all 0.3s ease',
    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
  },
  cardBody: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardYear: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
  },

  // ── Skeleton ──────────────────────────────────────────────────────────
  skeleton: {
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#111',
    border: '1px solid rgba(255,255,255,0.04)',
    padding: '0 0 12px',
  },
  skeletonImg: {
    paddingTop: '150%',
    background: 'linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
  skeletonTitle: {
    height: '12px',
    borderRadius: '6px',
    background: '#1e1e1e',
    margin: '12px 12px 6px',
  },
  skeletonYear: {
    height: '10px',
    width: '40%',
    borderRadius: '6px',
    background: '#1a1a1a',
    margin: '0 12px',
  },

  // ── Features ──────────────────────────────────────────────────────────
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '20px',
  },
  featureCard: {
    padding: '28px 24px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    transition: 'all 0.25s ease',
  },
  featureCardHovered: {
    background: 'rgba(229,9,20,0.05)',
    borderColor: 'rgba(229,9,20,0.2)',
    transform: 'translateY(-4px)',
  },
  featureIcon: {
    fontSize: '28px',
    marginBottom: '16px',
    display: 'block',
  },
  featureTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 8px',
  },
  featureDesc: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.7,
    margin: 0,
  },

  // ── CTA ───────────────────────────────────────────────────────────────
  ctaSection: {
    padding: '100px 24px',
    background: '#080808',
    textAlign: 'center',
  },
  ctaInner: {
    position: 'relative',
    maxWidth: '640px',
    margin: '0 auto',
  },
  ctaGlow: {
    position: 'absolute',
    top: '-60px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '400px',
    height: '200px',
    background: 'radial-gradient(ellipse, rgba(229,9,20,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  ctaTitle: {
    position: 'relative',
    fontSize: 'clamp(28px, 4vw, 44px)',
    fontWeight: '800',
    color: '#fff',
    letterSpacing: '-1px',
    margin: '0 0 16px',
  },
  ctaSubtitle: {
    position: 'relative',
    fontSize: '16px',
    color: 'rgba(255,255,255,0.5)',
    margin: '0 0 40px',
    lineHeight: 1.7,
  },
  ctaActions: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  ctaBtnPrimary: {
    padding: '14px 28px',
    background: '#e50914',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '700',
    transition: 'background 0.2s, transform 0.2s',
  },
  ctaBtnGhost: {
    padding: '14px 28px',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    border: '1px solid rgba(255,255,255,0.1)',
    transition: 'all 0.2s',
  },
};