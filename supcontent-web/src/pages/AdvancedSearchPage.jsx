// src/pages/AdvancedSearchPage.jsx
// Advanced search — chip-based UI mirroring the mobile app's Search screen.
// Categories (Movies / Series / Users / Lists) are pills; media filters live in
// a collapsible "Filters" panel built from chips (sort, rating, genre).

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { advancedSearch, getGenres, searchUsers, searchLists } from '../api/search';
import { mediaHref } from '../utils/media';
import { useLanguage } from '../context/LanguageContext';
import { FilmIcon, ListIcon, StarIcon, UserIcon } from '../components/AppIcons';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";
const POSTER_BASE = 'https://image.tmdb.org/t/p/w300';
const DEFAULT_SORT = 'popularity.desc';

function getResultColumns() {
    if (typeof window === 'undefined') return 5;
    if (window.innerWidth >= 1024) return 5;
    if (window.innerWidth >= 760) return 4;
    if (window.innerWidth >= 560) return 3;
    return 2;
}

// ── Filter chip (sort / rating / genre) ───────────────────────────────────────
function FilterChip({ label, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{ ...s.filterChip, ...(active ? s.filterChipActive : {}) }}
        >
            {label}
        </button>
    );
}

// ── People card ──────────────────────────────────────────────────────────────
function UserCard({ user }) {
    const [hovered, setHovered] = useState(false);
    return (
        <Link
            to={`/users/${user.user_id}/profile`}
            style={{ ...s.userCard, ...(hovered ? s.userCardHovered : {}) }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {user.avatar ? (
                <img src={user.avatar} alt={user.username} style={s.userAvatar} referrerPolicy="no-referrer" />
            ) : (
                <div style={s.userAvatarFallback}>{user.username?.[0]?.toUpperCase() ?? '?'}</div>
            )}
            <div style={s.userInfo}>
                <p style={s.userName}>{user.username}</p>
                {user.bio && <p style={s.userBio}>{user.bio}</p>}
            </div>
        </Link>
    );
}

// ── List card ─────────────────────────────────────────────────────────────────
function ListCard({ list }) {
    const { t } = useLanguage();
    const [hovered, setHovered] = useState(false);
    return (
        <Link
            to={`/lists/${list.list_id}`}
            style={{ ...s.listSearchCard, ...(hovered ? s.listSearchCardHovered : {}) }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div style={s.listCardIcon}><ListIcon size={28} /></div>
            <div style={s.listCardInfo}>
                <p style={s.listCardName}>{list.name}</p>
                <p style={s.listCardMeta}>
                    by <span style={s.listCardOwner}>{list.owner_username}</span>
                    {' · '}{list.media_count} {list.media_count !== 1 ? t('search_items') : t('search_item')}
                </p>
            </div>
        </Link>
    );
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ item }) {
    const { t } = useLanguage();
    const [hovered, setHovered] = useState(false);
    const year  = item.release_date?.slice(0, 4) ?? '—';
    const score = item.vote_average ? Number(item.vote_average).toFixed(1) : null;

    return (
        <Link
            to={mediaHref(item)}
            style={{ ...s.card, ...(hovered ? s.cardHovered : {}) }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            aria-label={`${item.title} (${year})`}
        >
            <div style={s.posterWrap}>
                {item.poster_path ? (
                    <img
                        src={`${POSTER_BASE}${item.poster_path}`}
                        alt={item.title}
                        style={{ ...s.poster, ...(hovered ? s.posterHovered : {}) }}
                        loading="lazy"
                    />
                ) : (
                    <div style={s.posterFallback}><FilmIcon size={40} /></div>
                )}
                {score && <div style={s.scoreBadge}><StarIcon size={13} />{score}</div>}
                <div style={s.mediaBadge}>
                    {item.media_type === 'Series' ? t('search_tv') : t('search_movie')}
                </div>
            </div>
            <div style={s.cardInfo}>
                <p style={s.cardTitle} title={item.title}>{item.title}</p>
                <span style={s.cardYear}>{year}</span>
            </div>
        </Link>
    );
}

// ── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onPageChange }) {
    const { t } = useLanguage();
    if (totalPages <= 1) return null;

    const delta = 2;
    const range = [];
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
        range.push(i);
    }

    return (
        <nav style={s.pagination} aria-label="Pagination">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                style={{ ...s.pageBtn, ...(page <= 1 ? s.pageBtnDisabled : {}) }}
                aria-label={t('search_prev')}
            >
                ←
            </button>

            {range[0] > 1 && (
                <>
                    <button onClick={() => onPageChange(1)} style={s.pageBtn}>1</button>
                    {range[0] > 2 && <span style={s.pageEllipsis}>…</span>}
                </>
            )}

            {range.map(p => (
                <button
                    key={p}
                    onClick={() => onPageChange(p)}
                    style={{ ...s.pageBtn, ...(p === page ? s.pageBtnActive : {}) }}
                    aria-current={p === page ? 'page' : undefined}
                >
                    {p}
                </button>
            ))}

            {range[range.length - 1] < totalPages && (
                <>
                    {range[range.length - 1] < totalPages - 1 && <span style={s.pageEllipsis}>…</span>}
                    <button onClick={() => onPageChange(totalPages)} style={s.pageBtn}>{totalPages}</button>
                </>
            )}

            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                style={{ ...s.pageBtn, ...(page >= totalPages ? s.pageBtnDisabled : {}) }}
                aria-label={t('search_next')}
            >
                →
            </button>
        </nav>
    );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdvancedSearchPage() {
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();

    // Single category model (mirrors mobile): movie | tv | users | lists
    const [category,  setCategory]  = useState(searchParams.get('category') || 'movie');
    const [query,     setQuery]     = useState(searchParams.get('q')          || '');
    const [year,      setYear]      = useState(searchParams.get('year')       || '');
    const [genreId,   setGenreId]   = useState(searchParams.get('genre')      || '');
    const [sort,      setSort]      = useState(searchParams.get('sort')       || DEFAULT_SORT);
    const [minRating, setMinRating] = useState(searchParams.get('min_rating') || '');

    const [genres,       setGenres]       = useState([]);
    const [results,      setResults]      = useState([]);
    const [currentPage,  setCurrentPage]  = useState(1);
    const [totalPages,   setTotalPages]   = useState(0);
    const [totalResults, setTotalResults] = useState(0);
    const [loading,      setLoading]      = useState(false);
    const [error,        setError]        = useState(null);
    const [hasSearched,  setHasSearched]  = useState(false);
    const [showFilters,  setShowFilters]  = useState(false);
    const [resultColumns, setResultColumns] = useState(getResultColumns);

    const isMediaSearch = category === 'movie' || category === 'tv';

    // Reload genres whenever a media category is active
    useEffect(() => {
        if (!isMediaSearch) { setGenres([]); return; }
        getGenres(category).then(setGenres).catch(() => setGenres([]));
    }, [category, isMediaSearch]);

    useEffect(() => {
        const handleResize = () => setResultColumns(getResultColumns());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Media categories can show a default discover list without a text query.
    useEffect(() => {
        const cat    = searchParams.get('category')   || 'movie';
        const q      = searchParams.get('q')          || '';
        const yr     = searchParams.get('year')       || '';
        const g      = searchParams.get('genre')      || '';
        const so     = searchParams.get('sort')       || DEFAULT_SORT;
        const r      = searchParams.get('min_rating') || '';
        const p      = parseInt(searchParams.get('page') || '1');
        const media  = cat === 'movie' || cat === 'tv';

        if (media || q) {
            executeSearch({ category: cat, q, year: yr, genreId: g, sort: so, minRating: r, page: p });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function executeSearch(params) {
        const { category: cat, q, year: y, genreId: g, sort: so, minRating: r, page: p } = params;
        const media = cat === 'movie' || cat === 'tv';

        // Users / lists need a query of at least 2 characters
        if (!media && q.trim().length < 2) {
            setResults([]); setHasSearched(false); setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        setHasSearched(true);

        // Reflect the search in the URL (omit defaults to keep it clean)
        const urlParams = {};
        if (cat !== 'movie')   urlParams.category   = cat;
        if (q)                 urlParams.q          = q;
        if (media) {
            if (y)             urlParams.year       = y;
            if (g)             urlParams.genre      = g;
            if (so !== DEFAULT_SORT) urlParams.sort = so;
            if (r)             urlParams.min_rating = r;
            if (p > 1)         urlParams.page       = p;
        }
        setSearchParams(urlParams);

        try {
            if (media) {
                const data = await advancedSearch({
                    q, type: cat, year: y, genre: g, sort: so, min_rating: r, page: p,
                });
                setResults(data.results ?? []);
                setTotalPages(data.total_pages ?? 0);
                setTotalResults(data.total_results ?? 0);
                setCurrentPage(p);
            } else {
                const data = cat === 'users'
                    ? await searchUsers(q.trim(), 30)
                    : await searchLists(q.trim(), 30);
                setResults(data.results ?? []);
                setTotalPages(0);
                setTotalResults((data.results ?? []).length);
                setCurrentPage(1);
            }
        } catch (err) {
            setError(err.message || 'An error occurred.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    }

    function handleSubmit(e) {
        e.preventDefault();
        executeSearch({ category, q: query, year, genreId, sort, minRating, page: 1 });
    }

    function handlePageChange(newPage) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        executeSearch({ category, q: query, year, genreId, sort, minRating, page: newPage });
    }

    function handleCategoryChange(cat) {
        setCategory(cat);
        setGenreId('');
        setResults([]);
        setTotalPages(0);
        setTotalResults(0);
        setHasSearched(false);
        setError(null);
        setShowFilters(false);

        if (cat === 'movie' || cat === 'tv') {
            executeSearch({ category: cat, q: query, year, genreId: '', sort, minRating, page: 1 });
        } else {
            setSearchParams({ category: cat });
        }
    }

    function handleClearFilters() {
        setYear('');
        setGenreId('');
        setSort(DEFAULT_SORT);
        setMinRating('');
    }

    const CATEGORIES = [
        { id: 'movie', label: t('search_cat_movies') },
        { id: 'tv',    label: t('search_cat_series') },
        { id: 'users', label: t('search_cat_users')  },
        { id: 'lists', label: t('search_cat_lists')  },
    ];
    const SORT_OPTIONS = [
        { value: 'popularity.desc',           label: t('search_sort_popularity') },
        { value: 'vote_average.desc',         label: t('search_sort_top_rated')  },
        { value: 'primary_release_date.desc', label: t('search_sort_newest')     },
        { value: 'primary_release_date.asc',  label: t('search_sort_oldest')     },
    ];
    const RATING_OPTIONS = [
        { value: '',  label: t('search_all_ratings') },
        { value: '6', label: '6+' },
        { value: '7', label: '7+' },
        { value: '8', label: '8+' },
    ];

    const resultGridStyle = {
        ...s.grid,
        gridTemplateColumns: `repeat(${resultColumns}, minmax(0, 1fr))`,
    };

    return (
        <div style={s.page}>
            <h1 style={s.heading}>{t('search_title')}</h1>

            {/* ── Search row: input + arrow button ── */}
            <form onSubmit={handleSubmit} style={s.searchRow}>
                <div style={s.searchInputWrap}>
                    <svg style={s.searchIcon} viewBox="0 0 20 20" fill="none">
                        <circle cx="9" cy="9" r="6" stroke="var(--text-secondary)" strokeWidth="1.8" />
                        <path d="M13.5 13.5L17 17" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={category === 'users' ? t('search_user_placeholder') : category === 'lists' ? t('search_list_placeholder') : t('search_placeholder')}
                        style={s.searchInput}
                        maxLength={200}
                        aria-label={t('search_btn')}
                    />
                    {query && (
                        <button type="button" onClick={() => setQuery('')} style={s.clearQueryBtn} aria-label="Clear">✕</button>
                    )}
                </div>
                <button type="submit" style={s.arrowBtn} disabled={loading} aria-label={t('search_btn')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="M13 6l6 6-6 6" />
                    </svg>
                </button>
            </form>

            {/* ── Category pills ── */}
            <div style={s.categoryRow}>
                {CATEGORIES.map(cat => {
                    const active = category === cat.id;
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategoryChange(cat.id)}
                            style={{ ...s.categoryChip, ...(active ? s.categoryChipActive : {}) }}
                        >
                            {cat.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Collapsible filters (media only) ── */}
            {isMediaSearch && (
                <div style={s.filters}>
                    <button type="button" onClick={() => setShowFilters(v => !v)} style={s.filterHeader}>
                        <span style={s.filterHeaderTitle}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                <line x1="4" y1="6" x2="20" y2="6" /><circle cx="9" cy="6" r="2" fill="var(--bg-secondary)" />
                                <line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="2" fill="var(--bg-secondary)" />
                                <line x1="4" y1="18" x2="20" y2="18" /><circle cx="8" cy="18" r="2" fill="var(--bg-secondary)" />
                            </svg>
                            <span style={s.filterTitle}>{t('search_filters')}</span>
                        </span>
                        <span style={s.chevron}>{showFilters ? '▲' : '▼'}</span>
                    </button>

                    {showFilters && (
                        <div style={s.filterBody}>
                            <div style={s.filterTools}>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={year}
                                    onChange={e => setYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                                    placeholder={t('search_year')}
                                    style={s.yearInput}
                                />
                                <button type="button" onClick={handleClearFilters} style={s.clearBtn}>
                                    {t('search_clear')}
                                </button>
                            </div>

                            <div style={s.chipRow}>
                                {SORT_OPTIONS.map(opt => (
                                    <FilterChip key={opt.value} label={opt.label} active={sort === opt.value} onClick={() => setSort(opt.value)} />
                                ))}
                            </div>

                            <div style={s.chipRow}>
                                {RATING_OPTIONS.map(opt => (
                                    <FilterChip key={opt.value || 'any'} label={opt.label} active={minRating === opt.value} onClick={() => setMinRating(opt.value)} />
                                ))}
                            </div>

                            {genres.length > 0 && (
                                <div style={s.chipRow}>
                                    <FilterChip label={t('search_all_genres')} active={!genreId} onClick={() => setGenreId('')} />
                                    {genres.map(g => (
                                        <FilterChip key={g.id} label={g.name} active={genreId === String(g.id)} onClick={() => setGenreId(String(g.id))} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Result count ── */}
            {hasSearched && !loading && !error && (
                <p style={s.resultCount}>
                    {totalResults > 0
                        ? `${totalResults.toLocaleString()} ${t('search_results')}`
                        : (isMediaSearch ? t('search_no_results') : (category === 'users' ? t('search_no_users') : t('search_no_lists')))
                    }
                </p>
            )}

            {error && <div style={s.errorBox} role="alert">⚠️ {error}</div>}

            {/* ── Empty states (before first search) ── */}
            {!hasSearched && !loading && (
                <div style={s.emptyState}>
                    <span style={s.emptyIcon} aria-hidden="true">
                        {category === 'users' ? <UserIcon size={48} /> : category === 'lists' ? <ListIcon size={48} /> : <FilmIcon size={48} />}
                    </span>
                    <p style={s.emptyTitle}>
                        {category === 'users' ? t('search_users_title') : category === 'lists' ? t('search_lists_title') : t('search_start_title')}
                    </p>
                    <p style={s.emptyText}>
                        {category === 'users' ? t('search_users_body') : category === 'lists' ? t('search_lists_body') : t('search_start_body')}
                    </p>
                </div>
            )}

            {/* ── Loading skeletons ── */}
            {loading && isMediaSearch && (
                <div style={resultGridStyle}>
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} style={s.skeleton} aria-hidden="true">
                            <div style={s.skeletonImg} />
                            <div style={s.skeletonTitle} />
                            <div style={s.skeletonYear} />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Results ── */}
            {!loading && results.length > 0 && (
                category === 'users' ? (
                    <div style={s.peopleGrid}>
                        {results.map(u => <UserCard key={u.user_id} user={u} />)}
                    </div>
                ) : category === 'lists' ? (
                    <div style={s.listsSearchGrid}>
                        {results.map(l => <ListCard key={l.list_id} list={l} />)}
                    </div>
                ) : (
                    <>
                        <div style={resultGridStyle}>
                            {results.map(item => (
                                <ResultCard key={`${item.external_id}-${item.media_type}`} item={item} />
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <Pagination page={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                        )}
                    </>
                )
            )}
        </div>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
    page: {
        maxWidth:   '1200px',
        margin:     '0 auto',
        padding:    'clamp(24px, 5vw, 40px) clamp(16px, 5vw, 40px) 60px',
        fontFamily: font,
        color:      'var(--text-primary)',
        minHeight:  '100vh',
    },
    heading: { margin: '0 0 24px', fontSize: '24px', fontWeight: '700' },

    // ── Search row ──
    searchRow: {
        display:    'flex',
        gap:        '10px',
        alignItems: 'stretch',
        marginBottom: '18px',
    },
    searchInputWrap: {
        flex:     1,
        minWidth: 0,
        position: 'relative',
        display:  'flex',
        alignItems: 'center',
    },
    searchIcon: {
        position:      'absolute',
        left:          '15px',
        width:         '18px',
        height:        '18px',
        pointerEvents: 'none',
    },
    searchInput: {
        width:           '100%',
        height:          '52px',
        padding:         '0 40px 0 44px',
        fontSize:        '15px',
        backgroundColor: 'var(--bg-elevated)',
        border:          '1px solid var(--border-visible)',
        borderRadius:    '14px',
        color:           'var(--text-primary)',
        fontFamily:      font,
        outline:         'none',
        boxSizing:       'border-box',
    },
    clearQueryBtn: {
        position:   'absolute',
        right:      '12px',
        background: 'none',
        border:     'none',
        color:      'var(--text-muted)',
        fontSize:   '14px',
        cursor:     'pointer',
        padding:    '4px',
        lineHeight: 1,
    },
    arrowBtn: {
        width:           '52px',
        height:          '52px',
        flexShrink:      0,
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: 'var(--accent)',
        border:          'none',
        borderRadius:    '14px',
        cursor:          'pointer',
    },

    // ── Category pills ──
    categoryRow: {
        display:      'flex',
        gap:          '9px',
        overflowX:    'auto',
        paddingBottom: '4px',
        marginBottom: '18px',
        scrollbarWidth: 'none',
    },
    categoryChip: {
        padding:         '9px 18px',
        borderRadius:    '999px',
        backgroundColor: 'var(--bg-secondary)',
        border:          '1px solid var(--border)',
        color:           'var(--text-secondary)',
        fontSize:        '13px',
        fontWeight:      '700',
        cursor:          'pointer',
        whiteSpace:      'nowrap',
        fontFamily:      font,
        flexShrink:      0,
    },
    categoryChipActive: {
        backgroundColor: 'var(--accent)',
        borderColor:     'var(--accent)',
        color:           'var(--accent-text)',
    },

    // ── Filters panel ──
    filters: {
        padding:         '14px',
        borderRadius:    '10px',
        backgroundColor: 'var(--bg-secondary)',
        border:          '1px solid var(--border)',
        marginBottom:    '22px',
    },
    filterHeader: {
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        width:           '100%',
        background:      'none',
        border:          'none',
        cursor:          'pointer',
        padding:         0,
        color:           'var(--text-primary)',
        fontFamily:      font,
    },
    filterHeaderTitle: { display: 'flex', alignItems: 'center', gap: '8px' },
    filterTitle: { fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' },
    chevron: { fontSize: '11px', color: 'var(--text-secondary)' },
    filterBody: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' },
    filterTools: { display: 'flex', alignItems: 'center', gap: '10px' },
    yearInput: {
        flex:            1,
        height:          '44px',
        padding:         '0 14px',
        fontSize:        '14px',
        borderRadius:    '8px',
        backgroundColor: 'var(--bg-primary)',
        border:          '1px solid var(--border-subtle)',
        color:           'var(--text-primary)',
        fontFamily:      font,
        outline:         'none',
        boxSizing:       'border-box',
        minWidth:        0,
    },
    clearBtn: {
        height:          '44px',
        padding:         '0 16px',
        borderRadius:    '8px',
        backgroundColor: 'var(--bg-elevated)',
        border:          '1px solid var(--border)',
        color:           'var(--accent)',
        fontSize:        '12px',
        fontWeight:      '600',
        cursor:          'pointer',
        fontFamily:      font,
        flexShrink:      0,
    },
    chipRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    filterChip: {
        padding:         '8px 13px',
        borderRadius:    '999px',
        backgroundColor: 'var(--bg-elevated)',
        border:          '1px solid var(--border)',
        color:           'var(--text-secondary)',
        fontSize:        '12px',
        fontWeight:      '500',
        cursor:          'pointer',
        fontFamily:      font,
        whiteSpace:      'nowrap',
    },
    filterChipActive: {
        borderColor:     'var(--accent)',
        backgroundColor: 'rgba(30,215,96,0.14)',
        color:           'var(--accent)',
    },

    resultCount: { margin: '0 0 20px', fontSize: '16px', color: 'var(--text-primary)', fontWeight: '800' },
    errorBox: {
        padding:         '16px 20px',
        backgroundColor: 'rgba(243,114,127,0.1)',
        border:          '1px solid #f3727f',
        borderRadius:    '8px',
        color:           '#f3727f',
        fontSize:        '14px',
        marginBottom:    '24px',
    },

    emptyState: {
        textAlign:       'center',
        padding:         'clamp(44px, 10vw, 80px) clamp(18px, 5vw, 40px)',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius:    '16px',
    },
    emptyIcon:  { display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--text-muted)' },
    emptyTitle: { margin: '0 0 8px', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' },
    emptyText:  { margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 },

    grid: {
        display:             'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap:                 'clamp(10px, 3vw, 14px)',
        marginBottom:        '40px',
    },

    // ── People results ──
    peopleGrid: {
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap:                 '12px',
        marginBottom:        '40px',
    },
    userCard: {
        display:        'flex',
        alignItems:     'center',
        gap:            '14px',
        padding:        '16px',
        backgroundColor:'var(--bg-secondary)',
        borderRadius:   '12px',
        border:         '1px solid var(--glass-subtle)',
        textDecoration: 'none',
        transition:     'transform 0.2s ease, box-shadow 0.2s ease',
    },
    userCardHovered: { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' },
    userAvatar: {
        width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover',
        flexShrink: 0, border: '2px solid var(--border)',
    },
    userAvatarFallback: {
        width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--bg-elevated)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)',
        flexShrink: 0, border: '2px solid var(--border)',
    },
    userInfo: { flex: 1, minWidth: 0 },
    userName: {
        margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    },
    userBio: {
        margin: 0, fontSize: '12px', color: 'var(--text-secondary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    },

    // ── Lists results ──
    listsSearchGrid: {
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
        gap:                 '12px',
        marginBottom:        '40px',
    },
    listSearchCard: {
        display:        'flex',
        alignItems:     'center',
        gap:            '16px',
        padding:        '18px',
        backgroundColor:'var(--bg-secondary)',
        borderRadius:   '12px',
        border:         '1px solid var(--glass-subtle)',
        textDecoration: 'none',
        transition:     'transform 0.2s ease, box-shadow 0.2s ease',
    },
    listSearchCardHovered: { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' },
    listCardIcon: {
        fontSize: '28px', width: '52px', height: '52px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg-elevated)', borderRadius: '10px', flexShrink: 0,
    },
    listCardInfo:  { flex: 1, minWidth: 0 },
    listCardName:  {
        margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    },
    listCardMeta:  { margin: 0, fontSize: '12px', color: 'var(--text-secondary)' },
    listCardOwner: { color: 'var(--accent)', fontWeight: '600' },

    // ── Result card ──
    card: {
        display:        'block',
        textDecoration: 'none',
        borderRadius:   '10px',
        overflow:       'hidden',
        backgroundColor:'var(--bg-elevated)',
        border:         '1px solid var(--glass-subtle)',
        transition:     'transform 0.2s ease, box-shadow 0.2s ease',
    },
    cardHovered: { transform: 'translateY(-4px)', boxShadow: '0 12px 30px rgba(0,0,0,0.5)' },
    posterWrap: {
        position: 'relative', paddingTop: '150%', overflow: 'hidden',
        backgroundColor: 'var(--bg-secondary)',
    },
    poster: {
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', transition: 'transform 0.3s ease', display: 'block',
    },
    posterHovered: { transform: 'scale(1.04)' },
    posterFallback: {
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px',
    },
    scoreBadge: {
        position: 'absolute', top: '8px', right: '8px', padding: '3px 8px',
        backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', borderRadius: '6px',
        fontSize: '11px', fontWeight: '700', color: '#ffd700',
        display: 'flex', alignItems: 'center', gap: '4px',
    },
    mediaBadge: {
        position: 'absolute', top: '8px', left: '8px', padding: '3px 8px',
        backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', borderRadius: '6px',
        fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.85)',
        textTransform: 'uppercase', letterSpacing: '0.4px',
    },
    cardInfo:  { padding: '8px 10px' },
    cardTitle: {
        margin: '0 0 4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    },
    cardYear: { fontSize: '11px', color: 'var(--text-secondary)' },

    skeleton: {
        borderRadius: '10px', overflow: 'hidden',
        backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--glass-subtle)',
    },
    skeletonImg: {
        paddingTop: '150%',
        background: 'linear-gradient(135deg, var(--bg-secondary) 25%, var(--bg-elevated) 50%, var(--bg-secondary) 75%)',
    },
    skeletonTitle: { height: '12px', borderRadius: '6px', background: 'var(--bg-elevated)', margin: '12px 12px 6px' },
    skeletonYear:  { height: '10px', width: '40%', borderRadius: '6px', background: 'var(--bg-secondary)', margin: '0 12px 12px' },

    pagination: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        flexWrap: 'nowrap', marginTop: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none',
    },
    pageBtn: {
        minWidth: '40px', height: '40px', padding: '0 12px',
        backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px',
        color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
        fontFamily: font, whiteSpace: 'nowrap', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    },
    pageBtnActive:   { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-text)' },
    pageBtnDisabled: { opacity: 0.3, cursor: 'not-allowed' },
    pageEllipsis:    { color: 'var(--text-muted)', fontSize: '13px', padding: '0 4px', flexShrink: 0 },
};
