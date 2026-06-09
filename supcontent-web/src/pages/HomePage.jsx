import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getTrending } from '../api/media';
import { mediaHref } from '../utils/media';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';
const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

// ═══════════════════════════════════════════════════════════════════════════
// Hero Section
// ═══════════════════════════════════════════════════════════════════════════
function HeroSection() {
  const { t } = useLanguage();
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [query, setQuery] = useState('');

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim().length >= 2) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <section style={s.hero}>
      <div style={s.heroGrain} aria-hidden="true" />
      <div style={s.heroGlow}  aria-hidden="true" />

      <div style={s.heroContent}>
        <h1 style={s.heroTitle}>{t('hero_title')}</h1>

        <p style={s.heroSubtitle}>{t('hero_subtitle')}</p>

        <form onSubmit={handleSearch} style={s.searchForm}>
          <div style={s.searchWrap}>
            <svg style={s.searchIcon} viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="var(--text-faint)" strokeWidth="1.8"/>
              <path d="M13.5 13.5L17 17" stroke="var(--text-faint)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('hero_search_placeholder')}
              style={s.searchInput}
              aria-label={t('search_btn')}
            />
            <button type="submit" style={s.searchBtn} disabled={query.trim().length < 2}>
              {t('search_btn')}
            </button>
          </div>
        </form>

      </div>

      <div style={s.scrollHint} aria-hidden="true">
        <div style={s.scrollLine} />
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Trending Section
// ═══════════════════════════════════════════════════════════════════════════
function TrendingSection() {
  const { t } = useLanguage();
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
          setError(err.message ?? t('trending_error'));
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [activeTab]);

  const tabs = [
    { id: 'all',    labelKey: 'trending_all'    },
    { id: 'Movie',  labelKey: 'trending_movies' },
    { id: 'Series', labelKey: 'trending_series' },
  ];

  return (
    <section style={s.section}>
      <div style={s.sectionInner}>
        <div style={s.sectionHeader}>
          <div>
            <p style={s.sectionEyebrow}>{t('trending_eyebrow')}</p>
            <h2 style={s.sectionTitle}>{t('trending_title')}</h2>
          </div>
          <div style={s.tabs} role="tablist">
            {tabs.map(({ id, labelKey }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                style={{ ...s.tab, ...(activeTab === id ? s.tabActive : {}) }}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={s.errorBox} role="alert">
            {t('trending_error')}{' '}
            <button onClick={() => setActiveTab(activeTab)} style={s.retryBtn}>{t('trending_retry')}</button>
          </div>
        )}

        <div style={s.grid}>
          {loading
            ? Array.from({ length: 12 }, (_, i) => <SkeletonCard key={i} />)
            : (data?.map((item) => <MediaCard key={`${item.external_id}-${item.media_type}`} item={item} />) ?? (
                <p style={{ color: 'var(--text-secondary)', fontFamily: font }}>{t('search_no_content')}</p>
              ))
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
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(false);
  const score = Number(item.vote_average).toFixed(1);
  const year  = item.release_date?.slice(0, 4) ?? '—';

  return (
    <Link
      to={mediaHref(item)}
      style={{ ...s.card, ...(hovered ? s.cardHovered : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`${item.title} (${year})`}
    >
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
        <span style={{ ...s.typeBadge, ...(item.media_type === 'Series' ? s.typeBadgeSeries : {}) }}>
          {item.media_type === 'Series' ? t('trending_series') : t('trending_movies')}
        </span>
        <div style={s.scoreBadge}>
          ⭐ {score}
        </div>
        <div style={{ ...s.cardOverlay, ...(hovered ? s.cardOverlayVisible : {}) }}>
          <span style={{ ...s.viewBtn, ...(hovered ? { opacity: 1, transform: 'translateY(0)' } : {}) }}>
            {t('home_view_details')}
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
// Features Section
// ═══════════════════════════════════════════════════════════════════════════
function FeaturesSection() {
  const { t } = useLanguage();

  const features = [
    { icon: '🔍', titleKey: 'feature1_title', descKey: 'feature1_desc' },
    { icon: '⭐', titleKey: 'feature2_title', descKey: 'feature2_desc' },
    { icon: '🎬', titleKey: 'feature3_title', descKey: 'feature3_desc' },
    { icon: '📱', titleKey: 'feature4_title', descKey: 'feature4_desc' },
  ];

  return (
    <section style={{ ...s.section, ...s.sectionAlt }}>
      <div style={s.sectionInner}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <p style={s.sectionEyebrow}>{t('features_eyebrow')}</p>
          <h2 style={s.sectionTitle}>{t('features_title')}</h2>
        </div>
        <div style={s.featuresGrid}>
          {features.map(({ icon, titleKey, descKey }) => (
            <FeatureCard key={titleKey} icon={icon} title={t(titleKey)} desc={t(descKey)} />
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
// CTA Section
// ═══════════════════════════════════════════════════════════════════════════
function CtaSection() {
  const { t } = useLanguage();
  const { user } = useAuth();
  if (user) return null;

  return (
    <section style={s.ctaSection}>
      <div style={s.ctaInner}>
        <div style={s.ctaGlow} aria-hidden="true" />
        <h2 style={s.ctaTitle}>{t('cta_title')}</h2>
        <p style={s.ctaSubtitle}>{t('cta_subtitle')}</p>
        <div style={s.ctaActions}>
          <Link to="/register" style={s.ctaBtnPrimary}>
            {t('cta_btn_primary')}
          </Link>
          <Link to="/login" style={s.ctaBtnGhost}>
            {t('cta_btn_ghost')}
          </Link>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  return (
    <main style={{ fontFamily: font }}>
      <HeroSection    />
      <TrendingSection />
      <FeaturesSection />
      <CtaSection      />
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles — aligned with project design system (green #1ed760, dark #121212)
// ═══════════════════════════════════════════════════════════════════════════
const s = {
  // ── Hero ────────────────────────────────────────────────────────────────
  hero: {
    position: 'relative',
    minHeight: '78vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '72px 24px 44px',
    background: 'var(--hero-bg)',
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
    background: 'var(--hero-glow)',
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
    background: 'rgba(30,215,96,0.08)',
    border: '1px solid rgba(30,215,96,0.2)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--accent)',
    letterSpacing: '0.5px',
    marginBottom: '24px',
    textTransform: 'uppercase',
    fontFamily: font,
  },
  heroBadgeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent)',
    animation: 'pulse 2s ease-in-out infinite',
  },
  heroTitle: {
    fontSize: 'clamp(32px, 5vw, 60px)',
    fontWeight: '800',
    color: 'var(--text-primary)',
    lineHeight: 1.1,
    letterSpacing: '-1.5px',
    margin: '0 0 26px',
    fontFamily: font,
  },
  heroSubtitle: {
    fontSize: '17px',
    color: 'var(--text-soft)',
    lineHeight: 1.7,
    maxWidth: '520px',
    margin: '0 auto 44px',
    fontFamily: font,
  },

  // Search
  searchForm: { width: '100%', maxWidth: '560px', margin: '0 auto 12px' },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
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
    color: 'var(--text-primary)',
    padding: '8px 0',
    minWidth: 0,
    fontFamily: font,
  },
  searchBtn: {
    padding: '10px 20px',
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.2s',
    fontFamily: font,
    letterSpacing: '0.3px',
  },

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
    background: 'linear-gradient(to bottom, var(--text-secondary), transparent)',
    animation: 'scrollFade 2s ease-in-out infinite',
  },

  // ── Sections layout ────────────────────────────────────────────────────
  section: {
    backgroundColor: 'var(--bg-primary)',
    padding: '80px 0',
  },
  sectionAlt: {
    backgroundColor: 'var(--bg-deep)',
    borderTop: '1px solid var(--border-alpha)',
    borderBottom: '1px solid var(--border-alpha)',
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
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    margin: '0 0 8px',
    fontFamily: font,
  },
  sectionTitle: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
    margin: 0,
    fontFamily: font,
  },

  // Tabs
  tabs: {
    display: 'flex',
    gap: '4px',
    background: 'var(--glass-tab-bg)',
    border: '1px solid var(--border-alpha)',
    borderRadius: '10px',
    padding: '4px',
  },
  tab: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-ghost)',
    background: 'none',
    border: 'none',
    borderRadius: '7px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: font,
  },
  tabActive: {
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
  },

  // Error
  errorBox: {
    padding: '14px 18px',
    background: 'rgba(243,114,127,0.1)',
    border: '1px solid rgba(243,114,127,0.2)',
    borderRadius: '10px',
    color: '#f3727f',
    fontSize: '14px',
    marginBottom: '24px',
    fontFamily: font,
  },
  retryBtn: {
    background: 'none',
    border: 'none',
    color: '#f3727f',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: '14px',
    padding: 0,
    marginLeft: '8px',
    fontFamily: font,
  },

  // ── Card grid ─────────────────────────────────────────────────────────
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
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-alpha)',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
  },
  cardHovered: {
    transform: 'translateY(-6px)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
  },
  cardImgWrap: {
    position: 'relative',
    paddingTop: '150%',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-elevated)',
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
    background: 'var(--bg-elevated)',
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
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    border: '1px solid var(--glass-border)',
    fontFamily: font,
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
    fontFamily: font,
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
  cardOverlayVisible: { background: 'rgba(0,0,0,0.55)' },
  viewBtn: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--accent)',
    opacity: 0,
    transform: 'translateY(8px)',
    transition: 'all 0.3s ease',
    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
    fontFamily: font,
    letterSpacing: '0.5px',
  },
  cardBody: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: font,
  },
  cardYear: {
    fontSize: '11px',
    color: 'var(--text-faint)',
    fontFamily: font,
  },

  // ── Skeleton ──────────────────────────────────────────────────────────
  skeleton: {
    borderRadius: '12px',
    overflow: 'hidden',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-alpha)',
    padding: '0 0 12px',
  },
  skeletonImg: {
    paddingTop: '150%',
    background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--border-subtle) 50%, var(--bg-elevated) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
  skeletonTitle: {
    height: '12px',
    borderRadius: '6px',
    background: 'var(--bg-elevated)',
    margin: '12px 12px 6px',
  },
  skeletonYear: {
    height: '10px',
    width: '40%',
    borderRadius: '6px',
    background: 'var(--bg-elevated)',
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
    background: 'var(--glass-faint)',
    border: '1px solid var(--border-alpha)',
    borderRadius: '16px',
    transition: 'all 0.25s ease',
  },
  featureCardHovered: {
    background: 'rgba(30,215,96,0.04)',
    borderColor: 'rgba(30,215,96,0.15)',
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  featureIcon: {
    fontSize: '28px',
    marginBottom: '16px',
    display: 'block',
  },
  featureTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: '0 0 8px',
    fontFamily: font,
  },
  featureDesc: {
    fontSize: '13px',
    color: 'var(--text-ghost)',
    lineHeight: 1.7,
    margin: 0,
    fontFamily: font,
  },

  // ── CTA ───────────────────────────────────────────────────────────────
  ctaSection: {
    padding: '100px 24px',
    background: 'var(--bg-deep)',
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
    background: 'var(--hero-glow)',
    pointerEvents: 'none',
  },
  ctaTitle: {
    position: 'relative',
    fontSize: 'clamp(28px, 4vw, 44px)',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-1px',
    margin: '0 0 16px',
    fontFamily: font,
  },
  ctaSubtitle: {
    position: 'relative',
    fontSize: '16px',
    color: 'var(--text-ghost)',
    margin: '0 0 40px',
    lineHeight: 1.7,
    fontFamily: font,
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
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    textDecoration: 'none',
    borderRadius: '9999px',
    fontSize: '14px',
    fontWeight: '700',
    transition: 'background 0.2s, transform 0.2s',
    fontFamily: font,
    letterSpacing: '0.3px',
  },
  ctaBtnGhost: {
    padding: '14px 28px',
    background: 'transparent',
    color: 'var(--text-dim)',
    textDecoration: 'none',
    borderRadius: '9999px',
    fontSize: '14px',
    fontWeight: '600',
    border: '1px solid var(--glass-border)',
    transition: 'all 0.2s',
    fontFamily: font,
  },
};
