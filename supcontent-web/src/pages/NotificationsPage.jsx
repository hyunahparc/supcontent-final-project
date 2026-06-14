import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getNotifications, markAllRead, markOneRead } from '../api/notifications';
import { mediaIdHref } from '../utils/media';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

function timeAgo(dateStr, t, language) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return t('feed_just_now');
    if (mins < 60) return `${mins}${t('feed_min_ago')}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}${t('feed_hour_ago')}`;
    const days = Math.floor(hrs / 24);
    if (days < 7)  return `${days}${t('feed_day_ago')}`;
    return new Date(dateStr).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' });
}

function notificationText(n, t) {
    if (n.type === 'like')    return `${n.source_username} ${t('notif_liked')}`;
    if (n.type === 'comment') return `${n.source_username} ${t('notif_commented')}`;
    if (n.type === 'follow')  return `${n.source_username} ${t('notif_following')}`;
    return '';
}

function notificationLink(n) {
    if (n.type === 'follow') return `/users/${n.source_user_id}/profile`;
    if (n.media_id)          return mediaIdHref(n.media_id, n.media_type ?? 'Movie');
    return null;
}

export default function NotificationsPage() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState(null);

    useEffect(() => {
        if (!user) return;
        getNotifications()
            .then(setNotifications)
            .catch(() => setError(t('notif_error')))
            .finally(() => setLoading(false));
    }, [user]);

    async function handleMarkAllRead() {
        await markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }

    async function handleClick(n) {
        if (!n.is_read) {
            await markOneRead(n.notification_id);
            setNotifications(prev =>
                prev.map(x => x.notification_id === n.notification_id ? { ...x, is_read: true } : x)
            );
        }
        const link = notificationLink(n);
        if (link) navigate(link);
    }

    if (!user)   return <Navigate to="/login" replace />;
    if (loading) return <div style={s.state}>{t('notif_loading')}</div>;
    if (error)   return <div style={s.state}>{error}</div>;

    const hasUnread = notifications.some(n => !n.is_read);

    return (
        <div style={s.page}>
            <div style={s.header}>
                <h1 style={s.heading}>{t('notif_title')}</h1>
                {hasUnread && (
                    <button style={s.markAllBtn} onClick={handleMarkAllRead}>
                        {t('notif_mark_all_read')}
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div style={s.emptyBox}>
                    <p style={s.emptyTitle}>{t('notif_empty_title')}</p>
                    <p style={s.emptyHint}>{t('notif_empty_body')}</p>
                </div>
            ) : (
                <div style={s.list}>
                    {notifications.map(n => (
                        <div
                            key={n.notification_id}
                            style={{ ...s.card, ...(n.is_read ? {} : s.cardUnread) }}
                            onClick={() => handleClick(n)}
                        >
                            <Link
                                to={`/users/${n.source_user_id}/profile`}
                                style={s.avatarLink}
                                onClick={e => e.stopPropagation()}
                            >
                                {n.source_avatar ? (
                                    <img src={n.source_avatar} alt={n.source_username} style={s.avatar} referrerPolicy="no-referrer" />
                                ) : (
                                    <div style={s.avatarFallback}>
                                        {n.source_username?.charAt(0).toUpperCase() ?? '?'}
                                    </div>
                                )}
                            </Link>

                            <div style={s.content}>
                                <p style={s.text}>{notificationText(n, t)}</p>
                                {n.media_title && (
                                    <p style={s.mediaTitle}>{n.media_title}</p>
                                )}
                                <p style={s.time}>{timeAgo(n.created_at, t, language)}</p>
                            </div>

                            {!n.is_read && <div style={s.dot} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const s = {
    page: {
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px clamp(14px, 4vw, 40px) 60px',
        fontFamily: font,
        color: 'var(--text-primary)',
        minHeight: '100vh',
    },
    state: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        fontSize: '14px',
        fontFamily: font,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px',
    },
    heading: {
        margin: 0,
        fontSize: '24px',
        fontWeight: '700',
    },
    markAllBtn: {
        padding: '8px 18px',
        border: '1px solid var(--border-visible)',
        borderRadius: '9999px',
        backgroundColor: 'transparent',
        color: 'var(--text-secondary)',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: font,
    },
    emptyBox: {
        padding: '60px 40px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '16px',
        textAlign: 'center',
    },
    emptyTitle: {
        margin: '0 0 8px',
        fontSize: '18px',
        fontWeight: '700',
        color: 'var(--text-primary)',
    },
    emptyHint: {
        margin: 0,
        fontSize: '14px',
        color: 'var(--text-muted)',
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    card: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 20px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '16px',
        cursor: 'pointer',
    },
    cardUnread: {
        backgroundColor: '#1a2a1a',
    },
    avatarLink: {
        flexShrink: 0,
        textDecoration: 'none',
    },
    avatar: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'block',
        border: '2px solid var(--border)',
    },
    avatarFallback: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '17px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        border: '2px solid var(--border)',
        flexShrink: 0,
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
    text: {
        margin: '0 0 2px',
        fontSize: '14px',
        fontWeight: '600',
        color: 'var(--text-primary)',
        lineHeight: 1.4,
    },
    mediaTitle: {
        margin: '0 0 4px',
        fontSize: '13px',
        color: 'var(--text-secondary)',
    },
    time: {
        margin: 0,
        fontSize: '12px',
        color: 'var(--text-muted)',
    },
    dot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: 'var(--accent)',
        flexShrink: 0,
    },
};
