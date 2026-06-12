import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLibrary } from '../api/collections';
import { getUserStats } from '../api/users';
import CollectionStatusBar from '../components/library/CollectionStatusBar';
import { mediaHref } from '../utils/media';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const STATUSES = ['To Watch', 'Watching', 'Completed', 'Dropped'];

const STATUS_LABEL_KEYS = {
    'To Watch': 'stats_to_watch',
    'Watching': 'stats_watching',
    'Completed': 'stats_completed',
    'Dropped': 'stats_dropped',
};

export default function CollectionPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const { t } = useLanguage();
    const [activeStatus, setActiveStatus] = useState(null);
    const [items, setItems] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hoveredId, setHoveredId] = useState(null);

    const isOwner = user?.user_id === parseInt(id);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            getLibrary(id, activeStatus),
            getUserStats(id).catch(() => null),
        ])
            .then(([collectionItems, userStats]) => {
                setItems(collectionItems);
                setStats(userStats);
            })
            .finally(() => setLoading(false));
    }, [id, activeStatus]);

    return (
        <div style={styles.page}>
            <h1 style={styles.heading}>
                {isOwner ? t('col_title') : t('nav_collection')}
            </h1>

            <CollectionStatusBar byStatus={stats?.by_status} total={stats?.total ?? 0} />

            <div style={styles.tabs}>
                <button
                    onClick={() => setActiveStatus(null)}
                    style={{ ...styles.tab, ...(activeStatus === null ? styles.tabActive : {}) }}
                >
                    {t('col_all')}
                </button>
                {STATUSES.map(s => (
                    <button
                        key={s}
                        onClick={() => setActiveStatus(s)}
                        style={{ ...styles.tab, ...(activeStatus === s ? styles.tabActive : {}) }}
                    >
                        {t(STATUS_LABEL_KEYS[s])}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={styles.state}>{t('col_loading')}</div>
            ) : items.length === 0 ? (
                <div style={styles.state}>{t('col_empty')}</div>
            ) : (
                <div style={styles.grid}>
                    {items.map(item => (
                        <Link
                            key={item.collection_id}
                            to={mediaHref(item)}
                            style={{
                                ...styles.card,
                                opacity: hoveredId === item.collection_id ? 0.8 : 1,
                                transform: hoveredId === item.collection_id ? 'scale(1.03)' : 'scale(1)',
                                transition: 'opacity 0.15s, transform 0.15s',
                            }}
                            onMouseEnter={() => setHoveredId(item.collection_id)}
                            onMouseLeave={() => setHoveredId(null)}
                        >
                            {item.full_data?.poster_path ? (
                                <img
                                    src={`${POSTER_BASE}${item.full_data.poster_path}`}
                                    alt={item.full_data.title}
                                    style={styles.poster}
                                />
                            ) : (
                                <div style={styles.posterFallback} />
                            )}
                            <div style={styles.cardTitle}>{item.full_data?.title}</div>
                            <div style={styles.cardStatus}>{item.status}</div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

const styles = {
    page: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px clamp(14px, 4vw, 40px) 60px',
        fontFamily: font,
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100vh',
        color: 'var(--text-primary)',
    },
    heading: {
        fontSize: '24px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        margin: '0 0 24px',
    },
    tabs: {
        display: 'flex',
        gap: '8px',
        marginBottom: '32px',
        flexWrap: 'wrap',
    },
    tab: {
        padding: '8px 18px',
        borderRadius: '9999px',
        border: '1px solid var(--border-visible)',
        backgroundColor: 'transparent',
        fontSize: '13px',
        fontWeight: '700',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontFamily: font,
        letterSpacing: '0.3px',
    },
    tabActive: {
        backgroundColor: 'var(--tab-active-bg)',
        borderColor: 'var(--tab-active-bg)',
        color: 'var(--text-inverse)',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '20px',
    },
    card: {
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    poster: {
        width: '100%',
        aspectRatio: '2/3',
        objectFit: 'cover',
        borderRadius: '6px',
        display: 'block',
        boxShadow: 'var(--shadow) 0px 8px 8px',
    },
    posterFallback: {
        width: '100%',
        aspectRatio: '2/3',
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '6px',
    },
    cardTitle: {
        fontSize: '13px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    cardStatus: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
    },
    state: {
        padding: '60px 0',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: '14px',
    },
};
