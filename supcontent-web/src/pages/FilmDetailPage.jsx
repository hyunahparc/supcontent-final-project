import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
            .catch(err => setError(err.message || 'Impossible de charger ce film.'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div style={styles.state}>Chargement...</div>;

    if (error) return (
        <div style={styles.errorPage}>
            <div style={styles.errorBox}>
                <span style={styles.errorIcon}>⚠️</span>
                <h2 style={styles.errorTitle}>Impossible de charger ce film</h2>
                <p style={styles.errorMsg}>{error}</p>
                <p style={styles.errorHint}>
                    Vérifie que le backend est lancé et que la clé TMDB est configurée dans <code>.env</code>.
                </p>
                <Link to="/" style={styles.backBtn}>← Retour à l'accueil</Link>
            </div>
        </div>
    );

    if (!film) return null;

    return (
        <div style={styles.page}>
            <div style={styles.hero}>
                {film.poster_path && (
                    <img
                        src={`${POSTER_BASE}${film.poster_path}`}
                        alt={film.title}
                        style={styles.poster}
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                )}
                <div style={styles.info}>
                    <h1 style={styles.title}>{film.title}</h1>

                    <div style={styles.meta}>
                        {film.release_date?.slice(0, 4)}
                        {film.runtime && <><span style={styles.dot}>·</span>{film.runtime} min</>}
                        {film.vote_average && <><span style={styles.dot}>·</span>⭐ {Number(film.vote_average).toFixed(1)}</>}
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
    page: { maxWidth: '960px', margin: '0 auto', padding: '40px 24px 60px' },
    state: { padding: '60px 24px', textAlign: 'center', color: '#999', fontSize: '14px' },
    errorPage: {
        maxWidth: '560px',
        margin: '80px auto',
        padding: '0 24px',
    },
    errorBox: {
        background: 'rgba(229,9,20,0.06)',
        border: '1px solid rgba(229,9,20,0.2)',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
    },
    errorIcon: { fontSize: '36px' },
    errorTitle: { color: '#fff', fontSize: '20px', fontWeight: '700', margin: 0 },
    errorMsg: { color: '#ff6b6b', fontSize: '14px', margin: 0, fontFamily: 'monospace' },
    errorHint: { color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0, lineHeight: 1.6 },
    backBtn: {
        marginTop: '8px',
        padding: '10px 20px',
        background: '#e50914',
        color: '#fff',
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: '600',
    },
    hero: { display: 'flex', gap: '40px', alignItems: 'flex-start' },
    poster: { width: '240px', flexShrink: 0, borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
    info: { flex: 1, paddingTop: '8px' },
    title: { margin: '0 0 12px', fontSize: '32px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.2 },
    meta: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#888', marginBottom: '16px' },
    dot: { margin: '0 4px', color: '#ccc' },
    genres: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' },
    genre: { padding: '4px 12px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '20px', fontSize: '12px', fontWeight: '500', color: '#ccc' },
    director: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#ccc', marginBottom: '16px' },
    directorLabel: { fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' },
    overview: { fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: 0 },
    castSection: { marginTop: '48px' },
    sectionTitle: { margin: '0 0 20px', fontSize: '18px', fontWeight: '700', color: '#fff', letterSpacing: '-0.3px' },
    castGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' },
    castCard: { padding: '14px 16px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' },
    actorName: { fontSize: '13px', fontWeight: '600', color: '#fff' },
    actorRole: { fontSize: '12px', color: '#666' },
};