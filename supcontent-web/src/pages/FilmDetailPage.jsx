import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFilmById } from '../api/films';

const POSTER_BASE   = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';
const PROFILE_BASE  = 'https://image.tmdb.org/t/p/w185';

export default function FilmDetailPage() {
    const { id } = useParams();
    const [film, setFilm]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);
    const [wished, setWished]   = useState(false);

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
            <div style={{
                ...styles.backdrop,
                backgroundImage: film.backdrop_path
                    ? `url(${BACKDROP_BASE}${film.backdrop_path})`
                    : 'none',
                backgroundColor: film.backdrop_path ? undefined : '#1a1a1a',
            }}>
                <div style={styles.backdropOverlay} />
            </div>

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
                        {film.vote_average && (
                            <><span style={styles.dot}>·</span>
                            <span style={styles.rating}>⭐ {film.vote_average.toFixed(1)}</span></>
                        )}
                    </div>

                    {film.genres?.length > 0 && (
                        <div style={styles.genres}>
                            {film.genres.map(g => (
                                <span key={g.id} style={styles.genre}>{g.name}</span>
                            ))}
                        </div>
                    )}

                    <div style={styles.actions}>
                        <button style={styles.watchBtn}>▶ Regarder</button>
                        <button
                            onClick={() => setWished(w => !w)}
                            style={{ ...styles.wishBtn, borderColor: wished ? '#e50914' : 'rgba(255,255,255,0.4)' }}
                        >
                            <span style={{ color: wished ? '#e50914' : '#fff', fontSize: '18px' }}>
                                {wished ? '♥' : '♡'}
                            </span>
                        </button>
                    </div>

                    {film.director && (
                        <p style={styles.director}>
                            <span style={styles.directorLabel}>Réalisateur </span>
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
                        {film.cast.map(actor => (
                            <div key={actor.id} style={styles.castCard}>
                                {actor.profile_path ? (
                                    <img
                                        src={`${PROFILE_BASE}${actor.profile_path}`}
                                        alt={actor.name}
                                        style={styles.castAvatar}
                                    />
                                ) : (
                                    <div style={styles.castAvatarFallback}>
                                        {actor.name.charAt(0)}
                                    </div>
                                )}
                                <div style={styles.actorName}>{actor.name}</div>
                                <div style={styles.actorRole}>{actor.character}</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {film.similar?.length > 0 && (
                <section style={styles.castSection}>
                    <h2 style={styles.sectionTitle}>Films similaires</h2>
                    <div style={styles.similarGrid}>
                        {film.similar.map(m => (
                            <a key={m.id} href={`/films/${m.id}`} style={styles.similarCard}>
                                {m.poster_path ? (
                                    <img
                                        src={`${POSTER_BASE}${m.poster_path}`}
                                        alt={m.title}
                                        style={styles.similarPoster}
                                    />
                                ) : (
                                    <div style={styles.similarPosterFallback} />
                                )}
                                <div style={styles.similarTitle}>{m.title}</div>
                                {m.vote_average && (
                                    <div style={styles.similarRating}>⭐ {m.vote_average.toFixed(1)}</div>
                                )}
                            </a>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

const styles = {
    page: {
        backgroundColor: '#141414',
        minHeight: '100vh',
        color: '#fff',
        paddingBottom: '60px',
    },
    state: {
        backgroundColor: '#141414',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: '14px',
    },
    backdrop: {
        position: 'relative',
        width: '100%',
        height: '520px',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
    },
    backdropOverlay: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(20,20,20,0.2) 0%, rgba(20,20,20,0.7) 60%, rgba(20,20,20,1) 100%)',
    },
    hero: {
        maxWidth: '1200px',
        margin: '-180px auto 0',
        padding: '0 40px',
        position: 'relative',
        display: 'flex',
        gap: '40px',
        alignItems: 'flex-end',
    },
    poster: {
        width: '350px',
        flexShrink: 0,
        borderRadius: '10px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
    },
    info: {
        flex: 1,
        paddingBottom: '8px',
    },
    title: {
        margin: '0 0 10px',
        fontSize: '48px',
        fontWeight: '800',
        letterSpacing: '-0.5px',
        lineHeight: 1.1,
        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
    },
    meta: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '14px',
        color: '#aaa',
        marginBottom: '14px',
    },
    dot: {
        margin: '0 4px',
        color: '#555',
    },
    rating: {
        color: '#f5c518',
    },
    genres: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '20px',
    },
    genre: {
        padding: '4px 12px',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '20px',
        fontSize: '12px',
        color: '#ccc',
    },
    actions: {
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        alignItems: 'center',
    },
    watchBtn: {
        padding: '11px 28px',
        backgroundColor: '#e50914',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        letterSpacing: '0.3px',
    },
    wishBtn: {
        width: '42px',
        height: '42px',
        backgroundColor: 'transparent',
        border: '2px solid',
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 0.2s',
    },
    director: {
        fontSize: '14px',
        color: '#ccc',
        marginBottom: '14px',
    },
    directorLabel: {
        color: '#888',
        fontWeight: '600',
        textTransform: 'uppercase',
        fontSize: '11px',
        letterSpacing: '0.5px',
        marginRight: '6px',
    },
    overview: {
        fontSize: '15px',
        color: '#bbb',
        lineHeight: 1.7,
        margin: 0,
        maxWidth: '600px',
    },
    castSection: {
        maxWidth: '1200px',
        margin: '48px auto 0',
        padding: '0 40px',
    },
    sectionTitle: {
        margin: '0 0 20px',
        fontSize: '20px',
        fontWeight: '700',
        color: '#fff',
    },
    castGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '10px',
    },
    castCard: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1f1f1f',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid #2a2a2a',
    },
    castAvatar: {
        width: '100%',
        aspectRatio: '3/4',
        objectFit: 'cover',
    },
    castAvatarFallback: {
        width: '100%',
        aspectRatio: '3/4',
        backgroundColor: '#2a2a2a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        fontWeight: '700',
        color: '#555',
    },
    actorName: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#eee',
        padding: '8px 10px 2px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    actorRole: {
        fontSize: '11px',
        color: '#777',
        padding: '0 10px 10px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    similarGrid: {
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        flex: 1,
    },
    similarCard: {
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        width: '160px',
    },
    similarPoster: {
        width: '160px',
        height: '240px',
        objectFit: 'cover',
        borderRadius: '8px',
        display: 'block',
    },
    similarPosterFallback: {
        width: '160px',
        height: '240px',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
    },
    similarTitle: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#eee',
        marginTop: '8px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    similarRating: {
        fontSize: '11px',
        color: '#f5c518',
        marginTop: '3px',
    },
};
