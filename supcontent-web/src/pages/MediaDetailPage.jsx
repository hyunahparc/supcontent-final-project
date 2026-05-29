import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getMediaById } from '../api/media';
import { useAuth } from '../context/AuthContext';
import { getCollectionStatus, upsertCollection, removeFromCollection } from '../api/collections';
import { getMyLists, addMediaToList, createList } from '../api/lists';
import ReviewsSection from '../components/ReviewsSection';
import { mediaIdHref } from '../utils/media';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';
const PROFILE_BASE = 'https://image.tmdb.org/t/p/w185';

const STATUSES = ['To Watch', 'Watching', 'Completed', 'Dropped'];
const NARROW_LAYOUT_WIDTH = 768;
const HERO_OVERLAP = 'clamp(120px, 14vw, 180px)';

function getIsNarrowLayout() {
    return window.innerWidth < NARROW_LAYOUT_WIDTH;
}

export default function MediaDetailPage({ mediaType: routeMediaType }) {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const mediaType = routeMediaType ?? (searchParams.get('type') === 'Series' ? 'Series' : 'Movie');
    const { user } = useAuth();
    const [media, setMedia] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [collectionStatus, setCollectionStatus] = useState(null);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [myLists, setMyLists] = useState([]);
    const [showListMenu, setShowListMenu] = useState(false);
    const [listFeedback, setListFeedback] = useState(null);
    const [newListName, setNewListName] = useState('');
    const [isNarrow, setIsNarrow] = useState(getIsNarrowLayout);
    const similarGridRef = useRef(null);

    // Fetch media data
    useEffect(() => {
        setLoading(true);
        setError(null);
        getMediaById(id, mediaType)
            .then(setMedia)
            .catch(err => setError(err.response?.data?.message || 'Failed to load media.'))
            .finally(() => setLoading(false));
    }, [id, mediaType]);

    // Fetch current collection status and user's lists if logged in
    useEffect(() => {
        if (user) {
            getCollectionStatus(id, mediaType).then(setCollectionStatus);
            getMyLists().then(setMyLists).catch(() => {});
        } else {
            setCollectionStatus(null);
            setMyLists([]);
        }
    }, [id, mediaType, user]);

    useEffect(() => {
        const handleResize = () => setIsNarrow(getIsNarrowLayout());
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    async function handleAddToList(listId) {
        try {
            await addMediaToList(listId, id, mediaType);
            setListFeedback('Added!');
        } catch (err) {
            setListFeedback(err.response?.data?.message ?? 'Unable to add.');
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
        // Clicking the active status removes the media from the collection
        if (status === collectionStatus) {
            await removeFromCollection(id, mediaType);
            setCollectionStatus(null);
        } else {
            await upsertCollection(id, mediaType, status);
            setCollectionStatus(status);
        }
        setShowStatusMenu(false);
    }

    function handleSimilarScroll(direction) {
        similarGridRef.current?.scrollBy({
            left: direction * 344,
            behavior: 'smooth',
        });
    }

    if (loading) return <div style={styles.state}>Loading...</div>;
    if (error)   return <div style={styles.state}>{error}</div>;
    if (!media)   return null;

    return (
        <div style={styles.page}>
            <div style={styles.heroStage}>
                <div style={{
                    ...styles.backdrop,
                    backgroundImage: media.backdrop_path
                        ? `url(${BACKDROP_BASE}${media.backdrop_path})`
                        : 'none',
                    backgroundColor: media.backdrop_path ? undefined : '#1a1a1a',
                }}>
                    <div style={styles.backdropOverlay} />
                </div>

                <div style={{ ...styles.hero, ...(isNarrow ? styles.heroNarrow : {}) }}>
                    {media.poster_path && (
                        <img
                            src={`${POSTER_BASE}${media.poster_path}`}
                            alt={media.title}
                            style={{ ...styles.poster, ...(isNarrow ? styles.posterNarrow : {}) }}
                        />
                    )}
                    <div style={{ ...styles.info, ...(isNarrow ? styles.infoNarrow : {}) }}>
                        <h1 style={{ ...styles.title, ...(isNarrow ? styles.titleNarrow : {}) }}>{media.title}</h1>

                        <div style={styles.meta}>
                            {media.release_date?.slice(0, 4)}
                            {media.runtime && <><span style={styles.dot}>·</span>{media.runtime} min</>}
                            {media.vote_average && (
                                <><span style={styles.dot}>·</span>
                                <span style={styles.rating}>�?{media.vote_average.toFixed(1)}</span></>
                            )}
                        </div>

                        {media.genres?.length > 0 && (
                            <div style={styles.genres}>
                                {media.genres.map(g => (
                                    <span key={g.id} style={styles.genre}>{g.name}</span>
                                ))}
                            </div>
                        )}

                        <div style={styles.actions}>
                            <button style={styles.watchBtn}>Watch</button>

                            {/* Collection status button ??disabled for guests */}
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

                            {/* Add to list button ??logged-in users only */}
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
                                            {myLists.length === 0 && (
                                                <div style={styles.emptyMenuText}>No lists yet.</div>
                                            )}
                                            {myLists.map(list => {
                                                const listId = list.list_id ?? list.id;
                                                return (
                                                <button
                                                    key={listId}
                                                    onClick={() => handleAddToList(listId)}
                                                    style={styles.statusOption}
                                                >
                                                    {list.name}
                                                </button>
                                                );
                                            })}
                                            <form onSubmit={handleCreateList} style={styles.inlineForm}>
                                                <input
                                                    value={newListName}
                                                    onChange={(e) => setNewListName(e.target.value)}
                                                    placeholder="New list"
                                                    style={styles.inlineInput}
                                                />
                                                <button type="submit" style={styles.inlineBtn}>+</button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {media.director && (
                            <div style={styles.director}>
                                <span style={styles.directorLabel}>Director</span>
                                {media.director}
                            </div>
                        )}

                        {media.overview && (
                            <p style={styles.overview}>{media.overview}</p>
                        )}
                    </div>
                </div>
            </div>

            {media.cast?.length > 0 && (
                <section style={styles.castSection}>
                    <h2 style={styles.sectionTitle}>Cast</h2>
                    <div style={styles.castGrid}>
                        {media.cast.map(actor => (
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

            {media.similar?.length > 0 && (
                <section style={styles.castSection}>
                    <h2 style={styles.sectionTitle}>You May Also Like</h2>
                    <div style={styles.similarSlider}>
                        <button
                            type="button"
                            onClick={() => handleSimilarScroll(-1)}
                            style={{ ...styles.sliderButton, ...styles.sliderButtonLeft }}
                            aria-label="Scroll similar films left"
                        >
                            &lt;
                        </button>
                        <div ref={similarGridRef} style={styles.similarGrid}>
                            {media.similar.map(m => (
                                <Link
                                    key={m.id}
                                    to={mediaIdHref(m.id, m.media_type ?? mediaType)}
                                    style={styles.similarCard}
                                >
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
                                        <div style={styles.similarRating}>�?{m.vote_average.toFixed(1)}</div>
                                    )}
                                </Link>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => handleSimilarScroll(1)}
                            style={{ ...styles.sliderButton, ...styles.sliderButtonRight }}
                            aria-label="Scroll similar films right"
                        >
                            &gt;
                        </button>
                    </div>
                </section>
            )}

            <ReviewsSection externalId={id} mediaType={mediaType} />
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
    heroStage: {
        position: 'relative',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '400px',
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
        margin: '0 auto',
        padding: `calc(400px - ${HERO_OVERLAP}) 40px 0`,
        position: 'relative',
        display: 'flex',
        gap: '40px',
        alignItems: 'flex-start',
    },
    heroNarrow: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        padding: `calc(400px - ${HERO_OVERLAP}) 20px 0`,
    },
    poster: {
        width: '350px',
        maxWidth: '100%',
        flexShrink: 0,
        borderRadius: '8px',
        boxShadow: 'rgba(0,0,0,0.5) 0px 8px 24px',
    },
    posterNarrow: {
        width: 'min(280px, 72vw)',
        order: 1,
    },
    info: {
        flex: 1,
        width: '100%',
        minWidth: 0,
        paddingBottom: '8px',
    },
    infoNarrow: {
        flex: 'initial',
        paddingTop: '0',
        paddingBottom: 0,
        order: 2,
    },
    title: {
        margin: '0 0 10px',
        fontSize: '48px',
        fontWeight: '700',
        letterSpacing: '-0.5px',
        lineHeight: 1.1,
        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
    },
    titleNarrow: {
        fontSize: '32px',
        lineHeight: 1.15,
        textAlign: 'left',
    },
    meta: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
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
        flexWrap: 'wrap',
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
        overflowWrap: 'anywhere',
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
        fontSize: '17px',
        color: '#b3b3b3',
        lineHeight: 1.6,
        margin: 0,
        maxWidth: '600px',
        overflowWrap: 'anywhere',
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
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
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
    similarSlider: {
        position: 'relative',
    },
    sliderButton: {
        position: 'absolute',
        top: '120px',
        zIndex: 2,
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: '#fff',
        fontSize: '22px',
        fontWeight: '700',
        cursor: 'pointer',
        lineHeight: 1,
        transform: 'translateY(-50%)',
        boxShadow: 'rgba(0,0,0,0.35) 0px 4px 12px',
    },
    sliderButtonLeft: {
        left: '8px',
    },
    sliderButtonRight: {
        right: '8px',
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
