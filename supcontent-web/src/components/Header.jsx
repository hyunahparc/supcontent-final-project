import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getNotifications, getUnreadCount, markAllRead, markOneRead } from '../api/notifications';
import { getUnreadMessageCount } from '../api/messages';
import SearchBar from './SearchBar';
import { mediaIdHref } from '../utils/media';
import { MoonIcon, SunIcon } from './AppIcons';

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days < 7 ? `${days}d ago` : new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function notifText(n) {
    if (n.type === 'like')    return `${n.source_username} liked your review`;
    if (n.type === 'comment') return `${n.source_username} commented on your review`;
    if (n.type === 'follow')  return `${n.source_username} started following you`;
    return 'New notification';
}

function notifLink(n) {
    if (n.type === 'follow') return `/users/${n.source_user_id}/profile`;
    if (n.media_id) return mediaIdHref(n.media_id, n.media_type ?? 'Movie');
    return null;
}

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";
const BREAKPOINT = 768;

function HamburgerIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6"  x2="21" y2="6"  />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    );
}

function BellIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );
}

function MessageIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
    );
}

function NotifDropdown({ notifications, loading, onNotifClick, onMarkAll, t, isMobile }) {
    return (
        <div style={{ ...styles.notifDropdown, ...(isMobile ? styles.notifDropdownMobile : {}) }}>
            <div style={styles.notifHeader}>
                <span style={styles.notifTitle}>{t('nav_notifications')}</span>
                {notifications.some(n => !n.is_read) && (
                    <button style={styles.markAllBtn} onClick={onMarkAll}>
                        {t('nav_mark_all_read')}
                    </button>
                )}
            </div>

            {loading ? (
                <p style={styles.notifEmpty}>{t('nav_loading')}</p>
            ) : notifications.length === 0 ? (
                <p style={styles.notifEmpty}>{t('nav_no_notifications')}</p>
            ) : (
                <ul style={styles.notifList}>
                    {notifications.slice(0, 6).map(n => (
                        <li
                            key={n.notification_id}
                            style={{ ...styles.notifItem, ...(n.is_read ? {} : styles.notifItemUnread) }}
                            onClick={() => onNotifClick(n)}
                        >
                            {n.source_avatar ? (
                                <img src={n.source_avatar} alt={n.source_username} style={styles.notifAvatar} />
                            ) : (
                                <div style={styles.notifAvatarFallback}>
                                    {n.source_username?.[0]?.toUpperCase()}
                                </div>
                            )}
                            <div style={styles.notifContent}>
                                <p style={styles.notifText}>{notifText(n)}</p>
                                {n.media_title && <p style={styles.notifMedia}>{n.media_title}</p>}
                                <p style={styles.notifTime}>{timeAgo(n.created_at)}</p>
                            </div>
                            {!n.is_read && <div style={styles.notifDot} />}
                        </li>
                    ))}
                </ul>
            )}

            <Link to="/notifications" style={styles.notifSeeAll}>
                {t('nav_see_all')}
            </Link>
        </div>
    );
}

function UserAvatar({ user }) {
    const destination = user.is_admin ? '/admin/moderation' : `/users/${user.user_id}/profile`;

    return (
        <Link to={destination} className="header-avatar-link" style={styles.avatarLink}>
            {user.avatar ? (
                <img src={user.avatar} alt={user.username} style={styles.avatar} />
            ) : (
                <div style={styles.avatarFallback}>
                    {user.username?.[0]?.toUpperCase()}
                </div>
            )}
        </Link>
    );
}

function MobileMenu({
    user,
    location,
    unreadMessageCount = 0,
    onMessagesOpen,
    t,
}) {
    return (
        <div style={styles.mobileDropdown}>
            <div style={styles.mobileSearch}><SearchBar /></div>
            {user ? (
                <>
                    <div style={styles.mobileDivider} />
                    <Link
                        to="/search"
                        className={'header-dropdown-link' + (location.pathname === '/search' ? ' active' : '')}
                        style={styles.mobileLink}
                    >
                        {t('nav_explore')}
                    </Link>
                    <Link
                        to="/feed"
                        className={'header-dropdown-link' + (location.pathname === '/feed' ? ' active' : '')}
                        style={styles.mobileLink}
                    >
                        {t('nav_feed')}
                    </Link>
                    <Link
                        to="/messages"
                        className={'header-dropdown-link' + (location.pathname === '/messages' ? ' active' : '')}
                        style={styles.mobileLink}
                        onClick={onMessagesOpen}
                    >
                        <span>{t('nav_messages')}</span>
                        {unreadMessageCount > 0 && <span style={styles.menuBadge}>{unreadMessageCount}</span>}
                    </Link>
                </>
            ) : (
                <>
                    <div style={styles.mobileDivider} />
                    <Link
                        to="/search"
                        className={'header-dropdown-link' + (location.pathname === '/search' ? ' active' : '')}
                        style={styles.mobileLink}
                    >
                        {t('nav_explore')}
                    </Link>
                    <Link to="/login"    style={styles.mobileLink}>{t('nav_sign_in')}</Link>
                    <Link to="/register" style={styles.mobileLink}>{t('nav_sign_up')}</Link>
                </>
            )}
        </div>
    );
}

export default function Header() {
    const { user } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessageCount, setUnreadMessageCount] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < BREAKPOINT);
    const [menuOpen, setMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);

    const menuRef = useRef(null);
    const notifRef = useRef(null);

    useEffect(() => {
        if (!user) {
            setUnreadCount(0);
            setUnreadMessageCount(0);
            return;
        }

        const fetchCount = () => {
            getUnreadCount().then(d => setUnreadCount(d.count)).catch(() => {});
            getUnreadMessageCount().then(d => setUnreadMessageCount(d.count)).catch(() => {});
        };

        fetchCount();
        const id = setInterval(fetchCount, 30000);
        return () => clearInterval(id);
    }, [user]);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < BREAKPOINT);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    useEffect(() => {
        if (!menuOpen) return;
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    useEffect(() => {
        if (!notifOpen) return;
        const handleClick = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [notifOpen]);

    async function toggleNotif() {
        if (notifOpen) { setNotifOpen(false); return; }
        setNotifOpen(true);
        setNotifLoading(true);
        try {
            const data = await getNotifications();
            setNotifications(data);
            setUnreadCount(0);
        } finally {
            setNotifLoading(false);
        }
    }

    async function handleNotifClick(n) {
        if (!n.is_read) {
            await markOneRead(n.notification_id);
            setNotifications(prev =>
                prev.map(x => x.notification_id === n.notification_id ? { ...x, is_read: true } : x)
            );
        }
        const link = notifLink(n);
        if (link) { setNotifOpen(false); navigate(link); }
    }

    async function handleMarkAll() {
        await markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    }

    const navLinkClass = (path) =>
        'header-nav-link' + (location.pathname === path ? ' active' : '');
    // Notifications now have their own bell in the mobile header; the hamburger
    // only summarizes what remains inside the menu (messages).
    const mobileUnreadCount = unreadMessageCount;

    return (
        <header style={styles.header}>
            <div style={{ ...styles.headerInner, ...(isMobile ? styles.headerInnerMobile : {}) }}>
                <div style={{ ...styles.left, ...(isMobile ? styles.leftMobile : {}) }}>
                    {/* Logo — desktop: image + wordmark; mobile (narrow): wordmark only, larger */}
                    <Link to="/" style={isMobile ? { ...styles.logo, ...styles.logoMobileLeft } : styles.logo} aria-label="moviemovie">
                        <img src="/moviemovie_logo_icon_transparent.png" alt="" className="brand-logo" style={isMobile ? styles.logoMarkMobile : styles.logoMark} />
                        {!isMobile && <span>moviemovie</span>}
                    </Link>

                    {!isMobile && (
                        <nav style={styles.mainNav}>
                            <Link to="/search" className={navLinkClass('/search')} style={styles.navLink}>
                                {t('nav_explore')}
                            </Link>
                            {user && (
                                <Link to="/feed" className={navLinkClass('/feed')} style={styles.navLink}>
                                    {t('nav_feed')}
                                </Link>
                            )}
                        </nav>
                    )}
                </div>

                <div style={{ ...styles.right, ...(isMobile ? styles.rightMobile : {}) }}>
                    {!isMobile && (
                        <div style={styles.searchWrap}>
                            <SearchBar />
                        </div>
                    )}

                    {isMobile ? (
                        /* Mobile order: dark mode → notification → menu → profile */
                        <div style={styles.userActions}>
                            <button
                                onClick={toggleTheme}
                                style={styles.themeBtn}
                                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                                title={isDark ? 'Light mode' : 'Dark mode'}
                            >
                                {isDark ? <SunIcon /> : <MoonIcon />}
                            </button>

                            {user && (
                                <div style={styles.notifWrap} ref={notifRef}>
                                    <button style={styles.iconBtn} onClick={toggleNotif} aria-label={t('nav_notifications')}>
                                        <BellIcon />
                                        {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
                                    </button>
                                    {notifOpen && (
                                        <NotifDropdown
                                            notifications={notifications}
                                            loading={notifLoading}
                                            onNotifClick={handleNotifClick}
                                            onMarkAll={handleMarkAll}
                                            t={t}
                                            isMobile
                                        />
                                    )}
                                </div>
                            )}

                            <div ref={menuRef} style={styles.menuWrap}>
                                <button style={styles.iconBtn} onClick={() => setMenuOpen(v => !v)} aria-label="Open menu">
                                    <HamburgerIcon />
                                    {user && !menuOpen && mobileUnreadCount > 0 && <span style={styles.badge}>{mobileUnreadCount}</span>}
                                </button>
                                {menuOpen && (
                                    <MobileMenu
                                        user={user}
                                        location={location}
                                        unreadMessageCount={unreadMessageCount}
                                        onMessagesOpen={() => setUnreadMessageCount(0)}
                                        t={t}
                                    />
                                )}
                            </div>

                            {user && <UserAvatar user={user} />}
                        </div>
                    ) : user ? (
                        <div style={styles.userActions}>
                            <div style={styles.notifWrap} ref={notifRef}>
                                <Link
                                    style={styles.iconBtn}
                                    to="/messages"
                                    aria-label="Messages"
                                    onClick={() => setUnreadMessageCount(0)}
                                >
                                    <MessageIcon />
                                    {unreadMessageCount > 0 && <span style={styles.badge}>{unreadMessageCount}</span>}
                                </Link>

                                <button style={styles.iconBtn} onClick={toggleNotif} aria-label="Notifications">
                                    <BellIcon />
                                    {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
                                </button>

                                {notifOpen && (
                                    <NotifDropdown
                                        notifications={notifications}
                                        loading={notifLoading}
                                        onNotifClick={handleNotifClick}
                                        onMarkAll={handleMarkAll}
                                        t={t}
                                    />
                                )}
                            </div>

                            <button
                                onClick={toggleTheme}
                                style={styles.themeBtn}
                                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                                title={isDark ? 'Light mode' : 'Dark mode'}
                            >
                                {isDark ? <SunIcon /> : <MoonIcon />}
                            </button>

                            <UserAvatar user={user} />
                        </div>
                    ) : (
                        <>
                            <Link to="/login"    style={styles.signIn}>{t('nav_sign_in')}</Link>
                            <Link to="/register" style={styles.signUp}>{t('nav_sign_up')}</Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

const styles = {
    header: {
        width: '100%',
        height: '64px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-header)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxSizing: 'border-box',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        fontFamily: font,
    },
    headerInner: {
        height: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 clamp(16px, 5vw, 24px)',
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(8px, 1.4vw, 16px)',
        minWidth: 0,
        position: 'relative',
    },
    headerInnerMobile: {
        justifyContent: 'space-between',
        gap: 0,
    },
    left: {
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(12px, 2vw, 24px)',
        flexShrink: 0,
    },
    leftMobile: {
        flex: '0 0 auto',
        gap: '4px',
        zIndex: 2,
    },
    logo: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: "'Fraunces', Georgia, serif",
        fontSize: '21px',
        fontWeight: '500',
        color: 'var(--text-primary)',
        textDecoration: 'none',
        letterSpacing: '0',
        flexShrink: 0,
        // Serif baseline sits a touch low — nudge up to align with the nav links
        lineHeight: 1,
        transform: 'translateY(-2px)',
    },
    logoMark: {
        width: '30px',
        height: '30px',
        objectFit: 'contain',
        flexShrink: 0,
        transform: 'translateY(1px)',
    },
    // Narrow header: image-only logo, a bit larger than the desktop mark.
    logoMarkMobile: {
        width: '38px',
        height: '38px',
        objectFit: 'contain',
        flexShrink: 0,
    },
    // Narrow header: wordmark logo on the left.
    logoMobileLeft: {
        fontSize: '22px',
        transform: 'none',
    },
    mainNav: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    navLink: {
        fontSize: '13px',
        fontWeight: '700',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        letterSpacing: '0.2px',
        padding: '6px 10px',
        borderRadius: '6px',
    },
    searchWrap: {
        flex: '1 1 clamp(180px, 34vw, 500px)',
        minWidth: '180px',
        maxWidth: '500px',
    },
    right: {
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(8px, 1.6vw, 18px)',
        flex: 1,
        justifyContent: 'flex-end',
        minWidth: 0,
    },
    rightMobile: {
        flex: '0 0 auto',
        justifyContent: 'flex-end',
        zIndex: 2,
    },
    iconBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: '6px',
        width: '32px',
        height: '32px',
        flexShrink: 0,
    },
    userActions: {
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(6px, 1.1vw, 12px)',
        flexShrink: 0,
    },
    notifWrap: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(6px, 1.1vw, 12px)',
        flexShrink: 0,
    },
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--accent)',
        color: 'var(--text-inverse)',
        fontSize: '10px',
        fontWeight: '700',
        borderRadius: '9999px',
        minWidth: '16px',
        height: '16px',
        padding: '0 4px',
        position: 'absolute',
        top: '1px',
        right: '1px',
    },
    notifDropdown: {
        position: 'absolute',
        top: 'calc(100% + 12px)',
        right: 0,
        width: 'min(340px, calc(100vw - 32px))',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 300,
        overflow: 'hidden',
    },
    // Mobile: anchor to the viewport (not the bell) so it never gets clipped —
    // a full-width sheet just below the 64px header.
    notifDropdownMobile: {
        position: 'fixed',
        top: '72px',
        left: '12px',
        right: '12px',
        width: 'auto',
    },
    notifHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px 10px',
        borderBottom: '1px solid var(--border)',
    },
    notifTitle: {
        fontSize: '14px',
        fontWeight: '700',
        color: 'var(--text-primary)',
    },
    markAllBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '12px',
        color: 'var(--accent)',
        fontWeight: '600',
        fontFamily: font,
        padding: 0,
    },
    notifEmpty: {
        padding: '24px 16px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '13px',
        margin: 0,
    },
    notifList: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        maxHeight: '360px',
        overflowY: 'auto',
    },
    notifItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border)',
    },
    notifItemUnread: {
        backgroundColor: '#1a2a1a',
    },
    notifAvatar: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
    },
    notifAvatarFallback: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        flexShrink: 0,
    },
    notifContent: {
        flex: 1,
        minWidth: 0,
    },
    notifText: {
        margin: '0 0 2px',
        fontSize: '13px',
        fontWeight: '600',
        color: 'var(--text-primary)',
        lineHeight: 1.4,
    },
    notifMedia: {
        margin: '0 0 2px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    notifTime: {
        margin: 0,
        fontSize: '11px',
        color: 'var(--text-muted)',
    },
    notifSeeAll: {
        display: 'block',
        textAlign: 'center',
        padding: '12px',
        fontSize: '13px',
        fontWeight: '600',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        borderTop: '1px solid var(--border)',
    },
    notifDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: 'var(--accent)',
        flexShrink: 0,
    },
    avatarLink: {
        display: 'flex',
        textDecoration: 'none',
        flexShrink: 0,
        marginLeft: '4px',
    },
    avatar: {
        width: '34px',
        height: '34px',
        objectFit: 'cover',
        borderRadius: '50%',
    },
    avatarFallback: {
        width: '34px',
        height: '34px',
        borderRadius: '50%',
        backgroundColor: 'var(--accent)',
        color: 'var(--text-inverse)',
        fontSize: '14px',
        fontWeight: '900',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: font,
    },
    themeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px',
        fontSize: '16px',
        lineHeight: 1,
        borderRadius: '6px',
        color: 'var(--text-secondary)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        flexShrink: 0,
    },
    signIn: {
        fontSize: '13px',
        fontWeight: '600',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        padding: '6px 12px',
        borderRadius: '6px',
    },
    signUp: {
        fontSize: '13px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        textDecoration: 'none',
        padding: '6px 16px',
        border: '1px solid var(--border-visible)',
        borderRadius: '9999px',
        letterSpacing: '0.2px',
    },
    menuWrap: {
        position: 'relative',
    },
    mobileDropdown: {
        position: 'fixed',
        top: '64px',
        left: 0,
        right: 0,
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        padding: '16px 20px',
        zIndex: 200,
    },
    mobileSearch: {
        marginBottom: '4px',
    },
    mobileDivider: {
        height: '1px',
        backgroundColor: 'var(--bg-elevated)',
        margin: '12px 0',
    },
    mobileLink: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '10px 12px',
        fontSize: '14px',
        fontWeight: '700',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        borderRadius: '8px',
    },
    menuBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '18px',
        height: '18px',
        padding: '0 6px',
        borderRadius: '9999px',
        backgroundColor: 'var(--accent)',
        color: 'var(--text-inverse)',
        fontSize: '10px',
        fontWeight: '800',
        flexShrink: 0,
    },
};
