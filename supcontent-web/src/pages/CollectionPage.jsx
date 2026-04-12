import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLibrary } from '../api/collections';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const STATUSES = ['À voir', 'En cours', 'Terminé', 'Abandonné'];

export default function CollectionPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [activeStatus, setActiveStatus] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const isOwner = user?.user_id === parseInt(id);

    useEffect(() => {
        setLoading(true);
        getLibrary(id, activeStatus)
            .then(setItems)
            .finally(() => setLoading(false));
    }, [id, activeStatus]);

    return (
        <div style={styles.page}>
            <h1 style={styles.heading}>
                {isOwner ? 'My Collection' : 'Collection'}
            </h1>

            {/* Status filter tabs */}
            <div style={styles.tabs}>
                <button
                    onClick={() => setActiveStatus(null)}
                    style={{ ...styles.tab, ...(activeStatus === null ? styles.tabActive : {}) }}
                >
                    All
                </button>
                {STATUSES.map(s => (
                    <button
                        key={s}
                        onClick={() => setActiveStatus(s)}
                        style={{ ...styles.tab, ...(activeStatus === s ? styles.tabActive : {}) }}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={styles.state}>Loading...</div>
            ) : items.length === 0 ? (
                <div style={styles.state}>No films in this list.</div>
            ) : (
                <div style={styles.grid}>
                    {items.map(item => (
                        <Link
                            key={item.collection_id}
                            to={`/films/${item.external_id}`}
                            style={styles.card}
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
        padding: '40px 40px 60px',
        fontFamily: font,
        backgroundColor: '#121212',
        minHeight: '100vh',
        color: '#fff',
    },
    heading: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#fff',
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
        border: '1px solid #4d4d4d',
        backgroundColor: 'transparent',
        fontSize: '13px',
        fontWeight: '700',
        color: '#b3b3b3',
        cursor: 'pointer',
        fontFamily: font,
        letterSpacing: '0.3px',
    },
    tabActive: {
        backgroundColor: '#fff',
        borderColor: '#fff',
        color: '#000',
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
        boxShadow: 'rgba(0,0,0,0.3) 0px 8px 8px',
    },
    posterFallback: {
        width: '100%',
        aspectRatio: '2/3',
        backgroundColor: '#181818',
        borderRadius: '6px',
    },
    cardTitle: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#fff',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    cardStatus: {
        fontSize: '12px',
        color: '#b3b3b3',
    },
    state: {
        padding: '60px 0',
        textAlign: 'center',
        color: '#b3b3b3',
        fontSize: '14px',
    },
};
