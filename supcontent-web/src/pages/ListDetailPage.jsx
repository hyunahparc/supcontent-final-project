import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getListById, removeFilmFromList } from '../api/lists';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w300';
const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

export default function ListDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();

    const [list, setList] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hoveredId, setHoveredId] = useState(null);

    useEffect(() => {
        setLoading(true);
        getListById(id)
            .then(setList)
            .catch(err => setError(err.response?.data?.message || 'Failed to load list.'))
            .finally(() => setLoading(false));
    }, [id]);

    async function handleRemove(externalId) {
        if (!window.confirm('Remove this film from the list?')) return;
        await removeFilmFromList(id, externalId);
        setList(prev => ({
            ...prev,
            films: prev.films.filter(f => f.external_id !== externalId),
        }));
    }

    if (loading) return <div style={styles.state}>Loading...</div>;
    if (error)   return <div style={styles.state}>{error}</div>;
    if (!list)   return null;

    const isOwner = user?.user_id === list.user_id;

    return (
        <div style={styles.page}>
            <div style={styles.inner}>
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.heading}>{list.name}</h1>
                        <div style={styles.meta}>
                            <span style={styles.badge}>
                                {list.is_public ? '🌐 Public' : '🔒 Private'}
                            </span>
                            <span style={styles.count}>{list.films?.length ?? 0} films</span>
                        </div>
                    </div>
                    {isOwner && (
                        <Link to="/lists" style={styles.backBtn}>← My Lists</Link>
                    )}
                </div>

                {!list.films || list.films.length === 0 ? (
                    <p style={styles.empty}>No films in this list yet.</p>
                ) : (
                    <div style={styles.grid}>
                        {list.films.map(film => {
                            const data = film.full_data ?? {};
                            const title = data.title ?? 'Unknown';
                            const posterPath = data.poster_path;
                            const year = data.release_date?.slice(0, 4) ?? '';
                            const rating = data.vote_average;

                            return (
                                <div
                                    key={film.external_id}
                                    style={{
                                        ...styles.card,
                                        opacity: hoveredId === film.external_id ? 0.8 : 1,
                                        transform: hoveredId === film.external_id ? 'scale(1.03)' : 'scale(1)',
                                        transition: 'opacity 0.15s, transform 0.15s',
                                    }}
                                    onMouseEnter={() => setHoveredId(film.external_id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                >
                                    <Link to={`/films/${film.external_id}`} style={styles.cardLink}>
                                        {posterPath ? (
                                            <img
                                                src={`${POSTER_BASE}${posterPath}`}
                                                alt={title}
                                                style={styles.poster}
                                            />
                                        ) : (
                                            <div style={styles.posterFallback}>🎬</div>
                                        )}
                                        <div style={styles.cardInfo}>
                                            <div style={styles.filmTitle}>{title}</div>
                                            {year && <div style={styles.filmYear}>{year}</div>}
                                            {rating && (
                                                <div style={styles.filmRating}>⭐ {Number(rating).toFixed(1)}</div>
                                            )}
                                        </div>
                                    </Link>
                                    {isOwner && (
                                        <button
                                            style={styles.removeBtn}
                                            onClick={() => handleRemove(film.external_id)}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: {
        backgroundColor: '#121212',
        minHeight: '100vh',
        color: '#fff',
        fontFamily: font,
        paddingBottom: '60px',
    },
    state: {
        backgroundColor: '#121212',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#b3b3b3',
        fontSize: '14px',
        fontFamily: font,
    },
    inner: {
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '48px 40px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '36px',
    },
    heading: {
        fontSize: '32px',
        fontWeight: '700',
        margin: '0 0 10px',
    },
    meta: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
    },
    badge: {
        fontSize: '13px',
        color: '#b3b3b3',
    },
    count: {
        fontSize: '13px',
        color: '#4d4d4d',
    },
    backBtn: {
        fontSize: '13px',
        color: '#b3b3b3',
        textDecoration: 'none',
        padding: '8px 16px',
        border: '1px solid #333',
        borderRadius: '9999px',
    },
    empty: {
        color: '#4d4d4d',
        fontSize: '14px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '20px',
    },
    card: {
        position: 'relative',
        backgroundColor: '#181818',
        borderRadius: '8px',
        overflow: 'hidden',
    },
    cardLink: {
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
    },
    poster: {
        width: '100%',
        aspectRatio: '2/3',
        objectFit: 'cover',
        display: 'block',
    },
    posterFallback: {
        width: '100%',
        aspectRatio: '2/3',
        backgroundColor: '#1f1f1f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '40px',
    },
    cardInfo: {
        padding: '10px 12px',
    },
    filmTitle: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#fff',
        marginBottom: '4px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    filmYear: {
        fontSize: '11px',
        color: '#b3b3b3',
        marginBottom: '2px',
    },
    filmRating: {
        fontSize: '11px',
        color: '#f5c518',
    },
    removeBtn: {
        position: 'absolute',
        top: '6px',
        right: '6px',
        width: '26px',
        height: '26px',
        borderRadius: '50%',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: '#fff',
        border: 'none',
        fontSize: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: font,
    },
};
