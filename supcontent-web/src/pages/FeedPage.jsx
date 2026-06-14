import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getFeed } from '../api/feed';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { mediaHref } from '../utils/media';
import { StarIcon } from '../components/AppIcons';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w185';
const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

export default function FeedPage() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) return;
        handleLoadFeed();
    }, [user]);

    async function handleLoadFeed() {
        setLoading(true);
        setError(null);

        try {
            const data = await getFeed();
            setActivities(data.results ?? []);
        } catch {
            setError(t('feed_error'));
        } finally {
            setLoading(false);
        }
    }

    function formatDate(value) {
        const diff = Date.now() - new Date(value).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1)  return t('feed_just_now');
        if (mins < 60) return `${mins}${t('feed_min_ago')}`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24)  return `${hrs}${t('feed_hour_ago')}`;
        const days = Math.floor(hrs / 24);
        if (days < 7)  return `${days}${t('feed_day_ago')}`;
        return new Date(value).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' });
    }

    if (!user) return <Navigate to="/login" replace />;
    if (loading) return <div style={styles.state}>{t('feed_loading')}</div>;
    if (error) return <div style={styles.state}>{error}</div>;

    return (
        <div style={styles.page}>
            <h1 style={styles.heading}>{t('feed_title')}</h1>

            {activities.length === 0 ? (
                <div style={styles.emptyBox}>
                    <p style={styles.emptyTitle}>{t('feed_empty_title')}</p>
                    <p style={styles.emptyHint}>{t('feed_empty_body')}</p>
                </div>
            ) : (
                <div style={styles.list}>
                    {activities.map(activity => {
                        const poster = activity.full_data?.poster_path;
                        const title = activity.full_data?.title ?? activity.full_data?.name ?? t('feed_unknown_title');
                        const isMediaActivity = activity.external_id;
                        const reviewRating = activity.metadata?.rating ?? activity.rating;
                        const reviewComment = activity.metadata?.comment ?? activity.comment;
                        const status = activity.metadata?.status;

                        return (
                            <article key={activity.activity_id} style={styles.card}>
                                <Link to={`/users/${activity.actor_id}/profile`} style={styles.avatarLink}>
                                    {activity.actor_avatar ? (
                                        <img
                                            src={activity.actor_avatar}
                                            alt={activity.actor_username}
                                            style={styles.avatar}
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div style={styles.avatarFallback}>
                                            {activity.actor_username?.charAt(0).toUpperCase() ?? '?'}
                                        </div>
                                    )}
                                </Link>

                                <div style={styles.content}>
                                    <div style={styles.cardHeader}>
                                        <p style={styles.text}>
                                            <Link to={`/users/${activity.actor_id}/profile`} style={styles.usernameLink}>
                                                {activity.actor_username}
                                            </Link>
                                            {' '}
                                            <span style={styles.actionLabel}>
                                                {activity.activity_type === 'review' && t('feed_reviewed')}
                                                {activity.activity_type === 'collection' && (
                                                    status
                                                        ? <>{t('feed_added_to')} <span style={styles.statusBadge}>{status}</span></>
                                                        : t('feed_updated')
                                                )}
                                            </span>
                                        </p>
                                        <span style={styles.date}>{formatDate(activity.created_at)}</span>
                                    </div>

                                    {isMediaActivity && (
                                        <Link to={mediaHref(activity)} style={styles.mediaRow}>
                                            <div style={styles.posterWrap}>
                                                {poster ? (
                                                    <img
                                                        src={`${POSTER_BASE}${poster}`}
                                                        alt={title}
                                                        style={styles.poster}
                                                    />
                                                ) : (
                                                    <div style={styles.posterFallback} />
                                                )}
                                            </div>
                                            <div style={styles.mediaInfo}>
                                                <p style={styles.mediaTitle}>{title}</p>
                                                {activity.activity_type === 'review' && reviewRating && (
                                                    <div style={styles.rating}>
                                                        {[1,2,3,4,5].map(i => {
                                                            const val = Number(reviewRating);
                                                            const type = val >= i ? 'full' : val >= i - 0.5 ? 'half' : 'empty';
                                                            return (
                                                                <div key={i} style={{ position: 'relative', width: 15, height: 15, fontSize: 15, lineHeight: 1, flexShrink: 0 }}>
                                                                    <StarIcon size={15} filled={false} style={{ color: 'var(--bg-elevated)', position: 'absolute', left: 0, top: 0 }} />
                                                                    {type !== 'empty' && (
                                                                        <span style={{ color: '#f5c518', position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: type === 'half' ? '50%' : '100%', display: 'block', whiteSpace: 'nowrap' }}>
                                                                            <StarIcon size={15} />
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        <span style={styles.ratingNum}>{Number(reviewRating).toFixed(1)}</span>
                                                    </div>
                                                )}
                                                {activity.activity_type === 'review' && reviewComment && (
                                                    <p style={styles.comment}>{reviewComment}</p>
                                                )}
                                            </div>
                                        </Link>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const styles = {
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
    heading: {
        margin: '0 0 28px',
        fontSize: '24px',
        fontWeight: '700',
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
        gap: '12px',
    },
    card: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        padding: '20px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '16px',
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
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '12px',
    },
    text: {
        margin: 0,
        fontSize: '14px',
        lineHeight: 1.5,
        color: 'var(--text-primary)',
    },
    usernameLink: {
        fontWeight: '700',
        color: 'var(--text-primary)',
        textDecoration: 'none',
        fontSize: '17px',
    },
    actionLabel: {
        color: 'var(--text-secondary)',
        fontWeight: '400',
        fontSize: '14px',
    },
    statusBadge: {
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '9999px',
        backgroundColor: 'var(--glass-bg)',
        color: 'var(--text-primary)',
        fontSize: '12px',
        fontWeight: '700',
        verticalAlign: 'middle',
    },
    date: {
        flexShrink: 0,
        marginTop: '2px',
        fontSize: '12px',
        color: 'var(--text-muted)',
    },
    mediaRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        textDecoration: 'none',
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '10px',
        padding: '12px',
    },
    posterWrap: {
        flexShrink: 0,
    },
    poster: {
        width: '52px',
        height: '78px',
        objectFit: 'cover',
        borderRadius: '6px',
        display: 'block',
        boxShadow: 'var(--shadow) 0px 4px 8px',
    },
    posterFallback: {
        width: '52px',
        height: '78px',
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '6px',
    },
    mediaInfo: {
        flex: 1,
        minWidth: 0,
        paddingTop: '2px',
    },
    mediaTitle: {
        margin: '0 0 8px',
        fontSize: '14px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    rating: {
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        fontSize: '15px',
        marginBottom: '8px',
    },
    ratingNum: {
        marginLeft: '6px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        fontWeight: '600',
    },
    comment: {
        margin: 0,
        fontSize: '13px',
        color: 'var(--text-secondary)',
        lineHeight: 1.55,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    },
};
