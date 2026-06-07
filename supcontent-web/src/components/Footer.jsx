import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";
const BREAKPOINT = 768;
const YEAR = new Date().getFullYear();

const NAV_SECTIONS = [
    {
        title: 'Discover',
        links: [
            { label: 'Explore',    to: '/search' },
            { label: 'Feed',       to: '/feed' },
            { label: 'Lists',      to: '/lists' },
        ],
    },
    {
        title: 'Account',
        links: [
            { label: 'Sign in',    to: '/login' },
            { label: 'Sign up',    to: '/register' },
            { label: 'Settings',   to: '/settings/profile' },
        ],
    },
];

const LEGAL_LINKS = [
    { label: 'Privacy Policy',   to: '/privacy' },
    { label: 'Terms of Service', to: '/terms' },
    { label: 'Legal Notice',     to: '/legal' },
];

export default function Footer() {
    const [isMobile, setIsMobile] = useState(window.innerWidth < BREAKPOINT);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < BREAKPOINT);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return (
        <footer
            style={{
                ...styles.footer,
                padding: isMobile ? '40px 16px 24px' : '48px 32px 28px',
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
                    <Link to="/" style={styles.logo}>SUPCONTENT</Link>
                    <p style={styles.tagline}>
                        Track, discover, and share your favourite films and series.
                    </p>
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
                    © {YEAR} Supcontent. All rights reserved.
                </span>
                <div style={styles.legalLinks}>
                    {LEGAL_LINKS.map((link, i) => (
                        <span key={link.to} style={styles.legalItem}>
                            {i > 0 && <span style={styles.dot} aria-hidden="true">·</span>}
                            <Link
                                to={link.to}
                                className="footer-link"
                                style={styles.link}
                            >
                                {link.label}
                            </Link>
                        </span>
                    ))}
                </div>
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
        marginBottom: '36px',
    },
    brand: {
        flexShrink: 0,
        maxWidth: '260px',
    },
    logo: {
        display: 'inline-block',
        fontSize: '13px',
        fontWeight: '900',
        color: 'var(--accent)',
        textDecoration: 'none',
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        marginBottom: '10px',
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
        paddingTop: '20px',
        borderTop: '1px solid var(--border)',
    },
    copyright: {
        fontSize: '12px',
        color: 'var(--text-muted)',
        fontWeight: '400',
    },
    legalLinks: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
    },
    legalItem: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
    },
    dot: {
        fontSize: '12px',
        color: 'var(--text-muted)',
        userSelect: 'none',
    },
};
