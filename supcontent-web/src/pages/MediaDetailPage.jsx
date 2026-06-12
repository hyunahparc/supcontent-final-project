import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getMediaById } from '../api/media';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getCollectionStatus, upsertCollection, removeFromCollection } from '../api/collections';
import { getMyLists, addMediaToList, createList } from '../api/lists';
import ReviewsSection from '../components/ReviewsSection';
import { mediaIdHref } from '../utils/media';
import { useLanguage } from '../context/LanguageContext';
import { StarIcon } from '../components/AppIcons';

// ── Hook: sample backdrop luminosity and return the best title color ──────────
function useBackdropTextColor(backdropPath, isDark) {
    const [titleColor,  setTitleColor]  = useState('#ffffff');
    const [titleShadow, setTitleShadow] = useState('0 2px 12px rgba(0,0,0,0.8)');

    useEffect(() => {
        if (!backdropPath) {
            // No image — use theme default
            setTitleColor(isDark ? '#ffffff' : '#111111');
            setTitleShadow(isDark ? '0 2px 12px rgba(0,0,0,0.8)' : 'none');
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = `https://image.tmdb.org/t/p/w300${backdropPath}`;

        img.onload = () => {
            try {
                const W = img.naturalWidth;
                const H = img.naturalHeight;
                const canvas = document.createElement('canvas');
                canvas.width  = W;
                canvas.height = H;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // Sample the zone where the title sits (~40–70 % of height)
                const sY = Math.floor(H * 0.40);
                const sH = Math.floor(H * 0.30);
                const { data } = ctx.getImageData(0, sY, W, sH);

                let totalLum = 0;
                const count  = data.length / 4;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i]     / 255;
                    const g = data[i + 1] / 255;
                    const b = data[i + 2] / 255;
                    // Perceived luminance (WCAG)
                    totalLum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
                }
                const imgLum = totalLum / count;

                // Blend with the theme-aware overlay at ~55 % opacity at the title zone
                // Dark theme overlay ≈ lum 0.07 (#121212), light ≈ lum 0.91 (#f4f4f4)
                const overlayLum     = isDark ? 0.07 : 0.91;
                const overlayOpacity = 0.55;
                const effectiveLum   = imgLum * (1 - overlayOpacity) + overlayLum * overlayOpacity;

                if (effectiveLum > 0.5) {
                    // Effective background is LIGHT → dark text
                    setTitleColor('#111111');
                    setTitleShadow('0 1px 6px rgba(255,255,255,0.6)');
                } else {
                    // Effective background is DARK → white text
                    setTitleColor('#ffffff');
                    setTitleShadow('0 2px 12px rgba(0,0,0,0.8)');
                }
            } catch {
                // Canvas tainted by CORS — safe fallback
                setTitleColor(isDark ? '#ffffff' : '#111111');
                setTitleShadow(isDark ? '0 2px 12px rgba(0,0,0,0.8)' : 'none');
            }
        };

        img.onerror = () => {
            setTitleColor(isDark ? '#ffffff' : '#111111');
            setTitleShadow(isDark ? '0 2px 12px rgba(0,0,0,0.8)' : 'none');
        };
    }, [backdropPath, isDark]);

    return { titleColor, titleShadow };
}

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';
const PROFILE_BASE = 'https://image.tmdb.org/t/p/w185';

const STATUSES = ['To Watch', 'Watching', 'Completed', 'Dropped'];
const STATUS_LABEL_KEYS = {
    'To Watch':  'stats_to_watch',
    'Watching':  'stats_watching',
    'Completed': 'stats_completed',
    'Dropped':   'stats_dropped',
};
const NARROW_LAYOUT_WIDTH = 768;
const HERO_OVERLAP = 'clamp(120px, 14vw, 180px)';
const HERO_OVERLAP_NARROW = 'clamp(180px, 34vw, 240px)';

function getIsNarrowLayout() {
    return window.innerWidth < NARROW_LAYOUT_WIDTH;
}

export default function MediaDetailPage({ mediaType: routeMediaType }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mediaType = routeMediaType ?? (searchParams.get('type') === 'Series' ? 'Series' : 'Movie');
    const { user }   = useAuth();
    const { isDark } = useTheme();
    const { t } = useLanguage();
    const [media, setMedia] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [collectionStatus, setCollectionStatus] = useState(null);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [myLists, setMyLists] = useState([]);
    const [showListMenu, setShowListMenu] = useState(false);
    const [listFeedback, setListFeedback] = useState(null);
    const [newListName, setNewListName] = useState('');
    const [showTrailer, setShowTrailer] = useState(false);
    const [isNarrow, setIsNarrow] = useState(getIsNarrowLayout);
    const similarGridRef = useRef(null);

    // Dynamic title color based on backdrop brightness + theme
    const { titleColor, titleShadow } = useBackdropTextColor(
        media?.backdrop_path ?? null,
        isDark
    );

    // Fetch media data
    useEffect(() => {
        setLoading(true);
        setError(null);
        getMediaById(id, mediaType)
            .then(setMedia)
            .catch(err => setError(err.response?.data?.message || 'Failed to load media.'))
            .finally(() => setLoading(false));
    }, [id, mediaType]);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0 });
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
            setListFeedback(t('media_added'));
        } catch (err) {
            setListFeedback(err.response?.data?.message ?? t('media_error_add'));
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

    function handleCollectionClick() {
        if (!user) {
            navigate('/login');
            return;
        }
        setShowStatusMenu(m => !m);
    }

    function handleSimilarScroll(direction) {
        similarGridRef.current?.scrollBy({
            left: direction * 344,
            behavior: 'smooth',
        });
    }

    if (loading) return <div style={styles.state}>{t('media_loading')}</div>;
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
                    backgroundColor: media.backdrop_path ? undefined : 'var(--bg-secondary)',
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
                        <h1 style={{
                            ...styles.title,
                            ...(isNarrow ? styles.titleNarrow : {}),
                            color:      titleColor,
                            textShadow: titleShadow,
                        }}>
                            {media.title}
                        </h1>

                        <div style={styles.meta}>
                            {media.release_date?.slice(0, 4)}
                            {media.runtime && <><span style={styles.dot}>·</span>{media.runtime} min</>}
                            {media.vote_average && (
                                <><span style={styles.dot}>·</span>
                                <span style={styles.rating}><StarIcon size={14} />{media.vote_average.toFixed(1)}</span></>
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
                            {media.trailer && (
                                <button
                                    type="button"
                                    onClick={() => setShowTrailer(true)}
                                    style={styles.watchBtn}
                                >
                                    {t('media_watch_trailer')}
                                </button>
                            )}

                            {/* Collection status button ??disabled for guests */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={handleCollectionClick}
                                    style={{
                                        ...styles.collectionBtn,
                                        backgroundColor: collectionStatus ? 'var(--tab-active-bg)' : 'transparent',
                                        color: collectionStatus ? 'var(--tab-active-text)' : 'var(--text-primary)',
                                        opacity: 1,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {collectionStatus ? t(STATUS_LABEL_KEYS[collectionStatus]) : t('media_add_collection')}
                                </button>
                                {showStatusMenu && (
                                    <div style={styles.statusMenu}>
                                        {STATUSES.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => handleStatusSelect(s)}
                                                style={{
                                                    ...styles.statusOption,
                                                    backgroundColor: s === collectionStatus ? 'var(--bg-elevated)' : 'transparent',
                                                }}
                                            >
                                                {t(STATUS_LABEL_KEYS[s])}
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
                                        {listFeedback ?? t('media_add_list')}
                                    </button>
                                    {showListMenu && (
                                        <div style={styles.statusMenu}>
                                            {myLists.length === 0 && (
                                                <div style={styles.emptyMenuText}>{t('media_no_lists')}</div>
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
                                                    placeholder={t('media_new_list')}
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
                                <span style={styles.directorLabel}>{t('media_director')}</span>
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
                    <h2 style={styles.sectionTitle}>{t('media_cast')}</h2>
                    <div style={{ ...styles.castGrid, ...(isNarrow ? styles.castGridNarrow : {}) }}>
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
                    <h2 style={styles.sectionTitle}>{t('media_similar')}</h2>
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
                                        <div style={styles.similarRating}><StarIcon size={12} />{m.vote_average.toFixed(1)}</div>
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

            {showTrailer && media.trailer && (
                <div style={styles.trailerOverlay} onClick={() => setShowTrailer(false)}>
                    <div style={styles.trailerModal} onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setShowTrailer(false)}
                            style={styles.trailerClose}
                            aria-label="Close trailer"
                        >
                            ×
                        </button>
                        <iframe
                            title={media.trailer.name ?? 'Trailer'}
                            src={`https://www.youtube.com/embed/${media.trailer.key}?autoplay=1`}
                            style={styles.trailerFrame}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

const styles = {
    page: {
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100vh',
        color: 'var(--text-primary)',
        fontFamily: font,
        paddingBottom: '60px',
    },
    state: {
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
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
        background: 'var(--backdrop-overlay)',
    },
    hero: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: `calc(400px - ${HERO_OVERLAP}) clamp(20px, 5vw, 40px) 0`,
        position: 'relative',
        display: 'flex',
        gap: '40px',
        alignItems: 'flex-start',
    },
    heroNarrow: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        padding: `calc(400px - ${HERO_OVERLAP_NARROW}) 20px 0`,
    },
    poster: {
        width: '350px',
        maxWidth: '100%',
        flexShrink: 0,
        borderRadius: '8px',
        boxShadow: 'var(--shadow) 0px 8px 24px',
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
        letterSpacing: '0',
        lineHeight: 1.1,
        transition: 'color 0.3s ease, text-shadow 0.3s ease',
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
        color: 'var(--text-secondary)',
        marginBottom: '14px',
    },
    dot: {
        margin: '0 4px',
        color: 'var(--text-muted)',
    },
    rating: {
        color: '#f5c518',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
    },
    genres: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '20px',
    },
    genre: {
        padding: '4px 12px',
        border: '1px solid var(--border-visible)',
        borderRadius: '9999px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
    },
    actions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
        alignItems: 'center',
    },
    watchBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '11px clamp(18px, 5vw, 28px)',
        backgroundColor: 'var(--accent)',
        color: 'var(--text-inverse)',
        border: 'none',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        letterSpacing: '0.6px',
        textTransform: 'uppercase',
        textDecoration: 'none',
        maxWidth: '100%',
    },
    trailerOverlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'rgba(0,0,0,0.78)',
    },
    trailerModal: {
        position: 'relative',
        width: 'min(960px, 100%)',
        aspectRatio: '16 / 9',
        backgroundColor: '#000',
        borderRadius: '8px',
        boxShadow: 'rgba(0,0,0,0.55) 0 18px 48px',
    },
    trailerClose: {
        position: 'absolute',
        top: '-42px',
        right: 0,
        width: '34px',
        height: '34px',
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.35)',
        backgroundColor: 'rgba(0,0,0,0.65)',
        color: '#ffffff',
        fontSize: '24px',
        lineHeight: 1,
        cursor: 'pointer',
    },
    trailerFrame: {
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: '8px',
        display: 'block',
    },
    collectionBtn: {
        padding: '11px clamp(16px, 5vw, 24px)',
        border: '1px solid var(--border-visible)',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: '700',
        letterSpacing: '0.6px',
        textTransform: 'uppercase',
        transition: 'border-color 0.15s',
        maxWidth: '100%',
    },
    statusMenu: {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow) 0px 8px 24px',
        borderRadius: '8px',
        overflow: 'hidden',
        zIndex: 100,
        minWidth: '180px',
        maxWidth: 'calc(100vw - 40px)',
    },
    statusOption: {
        display: 'block',
        width: '100%',
        padding: '12px 16px',
        textAlign: 'left',
        border: 'none',
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
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
        borderTop: '1px solid var(--border)',
    },
    inlineInput: {
        flex: 1,
        minWidth: 0,
        padding: '6px 10px',
        backgroundColor: 'var(--bg-input)',
        border: '1px solid var(--border-visible)',
        borderRadius: '6px',
        color: 'var(--text-primary)',
        fontSize: '13px',
        fontFamily: font,
        outline: 'none',
    },
    inlineBtn: {
        padding: '6px 12px',
        backgroundColor: 'var(--accent)',
        color: 'var(--text-inverse)',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: font,
    },
    director: {
        fontSize: '14px',
        color: 'var(--text-secondary)',
        marginBottom: '14px',
        overflowWrap: 'anywhere',
    },
    directorLabel: {
        color: 'var(--text-secondary)',
        fontWeight: '700',
        textTransform: 'uppercase',
        fontSize: '11px',
        letterSpacing: '1.4px',
        marginRight: '8px',
    },
    overview: {
        fontSize: '17px',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        margin: 0,
        maxWidth: '600px',
        overflowWrap: 'anywhere',
    },
    castSection: {
        maxWidth: '1200px',
        margin: '48px auto 0',
        padding: '0 clamp(20px, 5vw, 40px)',
    },
    sectionTitle: {
        margin: '0 0 20px',
        fontSize: '24px',
        fontWeight: '700',
        color: 'var(--text-primary)',
    },
    castGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '10px',
    },
    castGridNarrow: {
        display: 'flex',
        gridTemplateColumns: 'none',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        paddingBottom: '4px',
    },
    castCard: {
        display: 'flex',
        flexDirection: 'column',
        flex: '0 0 120px',
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow) 0px 8px 8px',
    },
    castAvatar: {
        width: '100%',
        aspectRatio: '3/4',
        objectFit: 'cover',
        flexShrink: 0,
    },
    castAvatarFallback: {
        width: '100%',
        aspectRatio: '3/4',
        backgroundColor: 'var(--bg-input)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        fontWeight: '700',
        color: 'var(--text-muted)',
    },
    actorName: {
        fontSize: '12px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        padding: '8px 10px 2px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    actorRole: {
        fontSize: '11px',
        color: 'var(--text-secondary)',
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
        color: '#ffffff',
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
        width: 'clamp(132px, 38vw, 160px)',
    },
    similarPoster: {
        width: '100%',
        aspectRatio: '2 / 3',
        height: 'auto',
        objectFit: 'cover',
        borderRadius: '6px',
        display: 'block',
        boxShadow: 'var(--shadow) 0px 8px 8px',
    },
    similarPosterFallback: {
        width: '100%',
        aspectRatio: '2 / 3',
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '6px',
    },
    similarTitle: {
        fontSize: '12px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        marginTop: '8px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    similarRating: {
        fontSize: '11px',
        color: 'var(--text-secondary)',
        marginTop: '3px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
};
