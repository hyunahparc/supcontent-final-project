import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

const GRAIN_BG =
    'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.04\'/%3E%3C/svg%3E")';

function SearchOffIcon() {
    return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle
                cx="26" cy="26" r="17"
                stroke="var(--border-visible)"
                strokeWidth="2"
                strokeDasharray="5 3"
            />
            <path
                d="M39 39L54 54"
                stroke="var(--border-visible)"
                strokeWidth="3"
                strokeLinecap="round"
            />
            <path
                d="M20 20l12 12M32 20L20 32"
                stroke="var(--text-muted)"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function NotFoundPage() {
    const { t } = useLanguage();

    return (
        <main style={s.page}>
            <div style={s.grain} aria-hidden="true" />
            <div style={s.glow}  aria-hidden="true" />

            <div style={s.content}>
                <div style={s.badge}>
                    <span style={s.badgeDot} />
                    {t('notfound_error')}
                </div>

                <SearchOffIcon />

                <p style={s.code}>404</p>
                <h1 style={s.title}>{t('notfound_title')}</h1>
                <p style={s.message}>{t('notfound_body')}</p>

                <div style={s.actions}>
                    <Link to="/"       style={s.btnPrimary}>{t('notfound_home')}</Link>
                    <Link to="/search" style={s.btnGhost}>{t('notfound_explore')}</Link>
                </div>
            </div>
        </main>
    );
}

const s = {
    page: {
        position: 'relative',
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px 60px',
        background: 'var(--hero-bg)',
        overflow: 'hidden',
        fontFamily: font,
        textAlign: 'center',
    },
    grain: {
        position: 'absolute',
        inset: 0,
        backgroundImage: GRAIN_BG,
        pointerEvents: 'none',
        opacity: 0.5,
    },
    glow: {
        position: 'absolute',
        top: '-10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '300px',
        background: 'var(--hero-glow)',
        pointerEvents: 'none',
    },
    content: {
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        maxWidth: '520px',
    },
    badge: {
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
        textTransform: 'uppercase',
        fontFamily: font,
    },
    badgeDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: 'var(--accent)',
        flexShrink: 0,
    },
    code: {
        margin: '8px 0 0',
        fontSize: 'clamp(88px, 18vw, 144px)',
        fontWeight: '900',
        color: 'var(--accent)',
        lineHeight: 1,
        letterSpacing: '-4px',
        fontFamily: font,
    },
    title: {
        margin: '0 0 4px',
        fontSize: 'clamp(20px, 4vw, 28px)',
        fontWeight: '700',
        color: 'var(--text-primary)',
        letterSpacing: '-0.5px',
        fontFamily: font,
    },
    message: {
        margin: '0 0 8px',
        fontSize: '15px',
        color: 'var(--text-secondary)',
        lineHeight: 1.65,
        maxWidth: '380px',
        fontFamily: font,
    },
    actions: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: '8px',
    },
    btnPrimary: {
        padding: '14px 28px',
        background: 'var(--accent)',
        color: 'var(--text-inverse)',
        textDecoration: 'none',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: '700',
        fontFamily: font,
        letterSpacing: '0.3px',
        transition: 'background 0.2s',
    },
    btnGhost: {
        padding: '14px 28px',
        background: 'transparent',
        color: 'var(--text-dim)',
        textDecoration: 'none',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: '600',
        border: '1px solid var(--glass-border)',
        fontFamily: font,
        transition: 'all 0.2s',
    },
};
