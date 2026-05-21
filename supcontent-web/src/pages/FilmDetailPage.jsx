import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFilmById } from '../api/films';
import { useAuth } from '../context/AuthContext';
import { getCollectionStatus, upsertCollection, removeFromCollection } from '../api/collections';
import { getMyLists, addFilmToList, createList } from '../api/lists';
import ReviewsSection from '../components/ReviewsSection';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';
const PROFILE_BASE = 'https://image.tmdb.org/t/p/w185';

const STATUSES = ['To Watch', 'Watching', 'Completed', 'Dropped'];

export default function FilmDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [film, setFilm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [collectionStatus, setCollectionStatus] = useState(null);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [myLists, setMyLists] = useState([]);
    const [showListMenu, setShowListMenu] = useState(false);
    const [listFeedback, setListFeedback] = useState(null);
    const [newListName, setNewListName] = useState('');

    // Fetch film data
    useEffect(() => {
        setLoading(true);
        setError(null);
        getFilmById(id)
            .then(setFilm)
            .catch(err => setError(err.response?.data?.message || 'Failed to load film.'))
            .finally(() => setLoading(false));
    }, [id]);

    // Fetch current collection status and user's lists if logged in
    useEffect(() => {
        if (user) {
            getCollectionStatus(id).then(setCollectionStatus);
            getMyLists().then(setMyLists).catch(() => {});
        } else {
            setCollectionStatus(null);
            setMyLists([]);
        }
    }, [id, user]);

    async function handleAddToList(listId) {
        try {
            await addFilmToList(listId, id);
            setListFeedback('Added!');
        } catch {
            setListFeedback('Already in list.');
        }
        setShowListMenu(false);
        setTimeout(() => setListFeedback(null), 2000);
    }

    async function handleCreateList(e) {
        e.preventDefault();
        if (!newListName.trim()) return;
        const created = await createList(newListName.trim(), false);
        setMyLists(prev => [created, ...prev]);
        setNewListName('');
    }

    async function handleStatusSelect(status) {
        // Clicking the active status removes the film from the collection
        if (status === collectionStatus) {
            await removeFromCollection(id);
            setCollectionStatus(null);
        } else {
            await upsertCollection(id, status);
            setCollectionStatus(status);
        }
        setShowStatusMenu(false);
    }

    if (loading) return <div style={styles.state}>Loading...</div>;
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
                        <button style={styles.watchBtn}>▶ Watch</button>

                        {/* Collection status button — disabled for guests */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => user && setShowStatusMenu(m => !m)}
                                style={{
                                    ...styles.collectionBtn,
                                    backgroundColor: collectionStatus ? '#fff' : 'transparent',
                                    color: collectionStatus ? '#111' : '#fff',
                                    opacity: user ? 1 : 0.4,
                                    cursor: user ? 'pointer' : 'default',
                                }}
                            >
                                {collectionStatus ?? '+ Collection'}
                            </button>
                            {showStatusMenu && (
                                <div style={styles.statusMenu}>
                                    {STATUSES.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => handleStatusSelect(s)}
                                            style={{
                                                ...styles.statusOption,
                                                backgroundColor: s === collectionStatus ? '#333' : 'transparent',
                                            }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add to list button — logged-in users only */}
                        {user && (
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowListMenu(m => !m)}
                                    style={styles.collectionBtn}
                                >
                                    {listFeedback ?? '+ List'}
                                </button>
                                {showListMenu && (
                                    <div style={styles.statusMenu}>
                                        {myLists.map(list => (
                                            <button
                                                key={list.list_id}
                                                onClick={() => handleAddToList(list.list_id)}
                                                style={styles.statusOption}
                                            >
                                                {list.name}
                                            </button>
                                        ))}
                                        {/* Inline create new list */}
                                        <form onSubmit={handleCreateList} style={styles.inlineForm}>
                                            <input
                                                style={styles.inlineInput}
                                                placeholder="New list…"
                                                value={newListName}
                                                onChange={e => setNewListName(e.target.value)}
                                            />
                                            <button type="submit" style={styles.inlineBtn}>+</button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {film.director && (
                        <p style={styles.director}>
                            <span style={styles.directorLabel}>Director </span>
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
                    <h2 style={styles.sectionTitle}>Cast</h2>
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
                    <h2 style={styles.sectionTitle}>Similar Films</h2>
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

            <ReviewsSection externalId={id} />
        </div>
    );
}

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

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
        background: 'linear-gradient(to bottom, rgba(18,18,18,0.2) 0%, rgba(18,18,18,0.7) 60%, rgba(18,18,18,1) 100%)',
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
        borderRadius: '8px',
        boxShadow: 'rgba(0,0,0,0.5) 0px 8px 24px',
    },
    info: {
        flex: 1,
        paddingBottom: '8px',
    },
    title: {
        margin: '0 0 10px',
        fontSize: '48px',
        fontWeight: '700',
        letterSpacing: '-0.5px',
        lineHeight: 1.1,
        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
    },
    meta: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '14px',
        color: '#b3b3b3',
        marginBottom: '14px',
    },
    dot: {
        margin: '0 4px',
        color: '#4d4d4d',
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
        border: '1px solid #4d4d4d',
        borderRadius: '9999px',
        fontSize: '12px',
        color: '#b3b3b3',
    },
    actions: {
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        alignItems: 'center',
    },
    watchBtn: {
        padding: '11px 28px',
        backgroundColor: '#1ed760',
        color: '#000',
        border: 'none',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        letterSpacing: '1.4px',
        textTransform: 'uppercase',
    },
    collectionBtn: {
        padding: '11px 24px',
        border: '1px solid #7c7c7c',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: '700',
        letterSpacing: '1.4px',
        textTransform: 'uppercase',
        transition: 'border-color 0.15s',
    },
    statusMenu: {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        backgroundColor: '#181818',
        boxShadow: 'rgba(0,0,0,0.5) 0px 8px 24px',
        borderRadius: '8px',
        overflow: 'hidden',
        zIndex: 100,
        minWidth: '180px',
    },
    statusOption: {
        display: 'block',
        width: '100%',
        padding: '12px 16px',
        textAlign: 'left',
        border: 'none',
        backgroundColor: 'transparent',
        color: '#fff',
        fontSize: '14px',
        fontWeight: '400',
        cursor: 'pointer',
        fontFamily: font,
    },
    inlineForm: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        borderTop: '1px solid #2a2a2a',
    },
    inlineInput: {
        flex: 1,
        padding: '6px 10px',
        backgroundColor: '#222',
        border: '1px solid #444',
        borderRadius: '6px',
        color: '#fff',
        fontSize: '13px',
        fontFamily: font,
        outline: 'none',
    },
    inlineBtn: {
        padding: '6px 12px',
        backgroundColor: '#1ed760',
        color: '#000',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: font,
    },
    director: {
        fontSize: '14px',
        color: '#b3b3b3',
        marginBottom: '14px',
    },
    directorLabel: {
        color: '#b3b3b3',
        fontWeight: '700',
        textTransform: 'uppercase',
        fontSize: '11px',
        letterSpacing: '1.4px',
        marginRight: '8px',
    },
    overview: {
        fontSize: '14px',
        color: '#b3b3b3',
        lineHeight: 1.6,
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
        fontSize: '24px',
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
        backgroundColor: '#181818',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: 'rgba(0,0,0,0.3) 0px 8px 8px',
    },
    castAvatar: {
        width: '100%',
        aspectRatio: '3/4',
        objectFit: 'cover',
    },
    castAvatarFallback: {
        width: '100%',
        aspectRatio: '3/4',
        backgroundColor: '#1f1f1f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        fontWeight: '700',
        color: '#4d4d4d',
    },
    actorName: {
        fontSize: '12px',
        fontWeight: '700',
        color: '#fff',
        padding: '8px 10px 2px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    actorRole: {
        fontSize: '11px',
        color: '#b3b3b3',
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
        borderRadius: '6px',
        display: 'block',
        boxShadow: 'rgba(0,0,0,0.3) 0px 8px 8px',
    },
    similarPosterFallback: {
        width: '160px',
        height: '240px',
        backgroundColor: '#181818',
        borderRadius: '6px',
    },
    similarTitle: {
        fontSize: '12px',
        fontWeight: '700',
        color: '#fff',
        marginTop: '8px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    similarRating: {
        fontSize: '11px',
        color: '#b3b3b3',
        marginTop: '3px',
    },
};
