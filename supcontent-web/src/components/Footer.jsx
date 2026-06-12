import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";
const BREAKPOINT = 768;
const YEAR = new Date().getFullYear();

export default function Footer() {
    const [isMobile, setIsMobile] = useState(window.innerWidth < BREAKPOINT);
    const { user } = useAuth();
    const { t } = useLanguage();
    const isLoggedIn = Boolean(user);
    const userId = user?.user_id;

    const NAV_SECTIONS = [
        {
            title: t('footer_discover'),
            links: isLoggedIn ? [
                { label: t('nav_explore'),    to: '/search' },
                { label: t('nav_feed'),        to: '/feed' },
                { label: t('nav_collection'),  to: userId ? `/users/${userId}/collection` : '/search' },
                { label: t('nav_lists'),       to: '/lists' },
            ] : [
                { label: t('nav_explore'),    to: '/search' },
            ],
        },
        {
            title: t('footer_account'),
            links: isLoggedIn ? [
                { label: t('nav_profile'), to: userId ? `/users/${userId}/profile` : '/' },
            ] : [
                { label: t('nav_sign_up'),     to: '/register' },
            ],
        },
    ];

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < BREAKPOINT);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return (
        <footer
            style={{
                ...styles.footer,
                padding: isMobile ? '24px 0 18px' : '28px 0 20px',
            }}
        >
            <div
                style={{
                    ...styles.inner,
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '32px' : '40px',
                }}
            >
                {/* Brand */}
                <div style={styles.brand}>
                    <Link to="/" style={styles.logo}>
                        <img src="/moviemovie_logo_icon_transparent.png" alt="" className="brand-logo" style={styles.logoMark} />
                        <span>moviemovie</span>
                    </Link>
                    <p style={styles.tagline}>{t('footer_desc')}</p>
                </div>

                {/* Nav columns */}
                <div
                    style={{
                        ...styles.sections,
                        justifyContent: isMobile ? 'flex-start' : 'flex-end',
                        gap: isMobile ? '32px' : 'clamp(24px, 4vw, 56px)',
                    }}
                >
                    {NAV_SECTIONS.map(section => (
                        <div key={section.title} style={styles.section}>
                            <span style={styles.sectionTitle}>{section.title}</span>
                            <ul style={styles.linkList}>
                                {section.links.map(link => (
                                    <li key={link.to}>
                                        <Link
                                            to={link.to}
                                            className="footer-link"
                                            style={styles.link}
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom bar */}
            <div
                style={{
                    ...styles.bottom,
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: isMobile ? '12px' : '16px',
                }}
            >
                <span style={styles.copyright}>
                    © {YEAR} Moviemovie.
                </span>
            </div>
        </footer>
    );
}

const styles = {
    footer: {
        width: '100%',
        backgroundColor: 'var(--bg-deep)',
        borderTop: '1px solid var(--border)',
        fontFamily: font,
        boxSizing: 'border-box',
    },
    inner: {
        display: 'flex',
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '16px',
        padding: '0 clamp(16px, 5vw, 24px)',
    },
    brand: {
        flexShrink: 0,
        maxWidth: '260px',
    },
    logo: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: "'Fraunces', Georgia, serif",
        fontSize: '22px',
        fontWeight: '500',
        color: 'var(--text-primary)',
        textDecoration: 'none',
        letterSpacing: '0',
        marginBottom: '10px',
        transform: 'translateY(-1px)',
    },
    logoMark: {
        width: '28px',
        height: '28px',
        objectFit: 'contain',
        flexShrink: 0,
    },
    tagline: {
        margin: 0,
        fontSize: '13px',
        color: 'var(--text-muted)',
        lineHeight: 1.65,
        maxWidth: '220px',
    },
    sections: {
        display: 'flex',
        flex: 1,
        flexWrap: 'wrap',
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    sectionTitle: {
        fontSize: '11px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
    },
    linkList: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    link: {
        fontSize: '13px',
        fontWeight: '600',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
    },
    bottom: {
        display: 'flex',
        justifyContent: 'space-between',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '4px clamp(16px, 5vw, 24px) 0',
    },
    copyright: {
        fontSize: '12px',
        color: 'var(--text-muted)',
        fontWeight: '400',
    },
};
