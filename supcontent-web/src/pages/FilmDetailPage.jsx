import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFilmById } from '../api/films';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

export default function FilmDetailPage() {
    const { id } = useParams();
    const [film, setFilm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        getFilmById(id)
            .then(setFilm)
            .catch(err => setError(err.response?.data?.message || 'Failed to load film.'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div style={styles.state}>Chargement...</div>;
    if (error)   return <div style={styles.state}>{error}</div>;
    if (!film)   return null;

    return (
        <div style={styles.page}>
            <div style={styles.hero}>
                {film.poster_path && (
                    <img
                        src={`${POSTER_BASE}${film.poster_path}`}
                        alt={film.title}
                        style={styles.poster}
                    />
                )}
                <div style={styles.info}>
                    <h1 style={styles.title}>{film.title}</h1>

                    <div style={styles.meta}>
                        {film.release_date?.slice(0, 4)}
                        {film.runtime && <><span style={styles.dot}>·</span>{film.runtime} min</>}
                        {film.vote_average && <><span style={styles.dot}>·</span>⭐ {film.vote_average.toFixed(1)}</>}
                    </div>

                    {film.genres?.length > 0 && (
                        <div style={styles.genres}>
                            {film.genres.map(g => (
                                <span key={g.id} style={styles.genre}>{g.name}</span>
                            ))}
                        </div>
                    )}

                    {film.director && (
                        <p style={styles.director}>
                            <span style={styles.directorLabel}>Réalisateur</span>
                            {film.director}
                        </p>
                    )}

                    {film.overview && (
                        <p style={styles.overview}>{film.overview}</p>
                    )}
                </div>
            </div>

            {film.cast?.length > 0 && (
                <section style={styles.castSection}>
                    <h2 style={styles.sectionTitle}>Distribution</h2>
                    <div style={styles.castGrid}>
                        {film.cast.slice(0, 10).map(actor => (
                            <div key={actor.id} style={styles.castCard}>
                                <span style={styles.actorName}>{actor.name}</span>
                                <span style={styles.actorRole}>{actor.character}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

const styles = {
    page: {
        maxWidth: '960px',
        margin: '0 auto',
        padding: '40px 24px 60px',
    },
    state: {
        padding: '60px 24px',
        textAlign: 'center',
        color: '#999',
        fontSize: '14px',
    },
    hero: {
        display: 'flex',
        gap: '40px',
        alignItems: 'flex-start',
    },
    poster: {
        width: '240px',
        flexShrink: 0,
        borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    },
    info: {
        flex: 1,
        paddingTop: '8px',
    },
    title: {
        margin: '0 0 12px',
        fontSize: '32px',
        fontWeight: '700',
        color: '#111',
        letterSpacing: '-0.5px',
        lineHeight: 1.2,
    },
    meta: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '14px',
        color: '#888',
        marginBottom: '16px',
    },
    dot: {
        margin: '0 4px',
        color: '#ccc',
    },
    genres: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '20px',
    },
    genre: {
        padding: '4px 12px',
        backgroundColor: '#f3f3f3',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '500',
        color: '#555',
    },
    director: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '14px',
        color: '#333',
        marginBottom: '16px',
    },
    directorLabel: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    overview: {
        fontSize: '15px',
        color: '#555',
        lineHeight: 1.7,
        margin: 0,
    },
    castSection: {
        marginTop: '48px',
    },
    sectionTitle: {
        margin: '0 0 20px',
        fontSize: '18px',
        fontWeight: '700',
        color: '#111',
        letterSpacing: '-0.3px',
    },
    castGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '12px',
    },
    castCard: {
        padding: '14px 16px',
        backgroundColor: '#fafafa',
        border: '1px solid #f0f0f0',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    actorName: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#111',
    },
    actorRole: {
        fontSize: '12px',
        color: '#999',
    },
};
