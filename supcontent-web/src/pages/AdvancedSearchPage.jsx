// src/pages/AdvancedSearchPage.jsx
// Advanced search page — multiple filters with TMDB Discover & Search

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { advancedSearch, getGenres } from '../api/search';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";
const POSTER_BASE = 'https://image.tmdb.org/t/p/w300';

// Sorting criteria available (values matching TMDB API)
const SORT_OPTIONS = [
    { value: 'popularity.desc',           label: 'Popularity'               },
    { value: 'vote_average.desc',         label: 'Top Rated'                },
    { value: 'primary_release_date.desc', label: 'Release Date (Newest)'    },
    { value: 'primary_release_date.asc',  label: 'Release Date (Oldest)'    },
    { value: 'revenue.desc',              label: 'Box Office'               },
];

// Minimum rating options (TMDB 0-10)
const RATING_OPTIONS = [
    { value: '',  label: 'All ratings' },
    { value: '5', label: '≥ 5.0 / 10'  },
    { value: '6', label: '≥ 6.0 / 10'  },
    { value: '7', label: '≥ 7.0 / 10'  },
    { value: '8', label: '≥ 8.0 / 10'  },
    { value: '9', label: '≥ 9.0 / 10'  },
];

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ item }) {
    const [hovered, setHovered] = useState(false);
    const year  = item.release_date?.slice(0, 4) ?? '—';
    const score = item.vote_average ? Number(item.vote_average).toFixed(1) : null;

    return (
        <Link
            to={`/films/${item.external_id}`}
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
                    <div style={s.posterFallback}>🎬</div>
                )}
                {score && <div style={s.scoreBadge}>⭐ {score}</div>}
                <div style={s.mediaBadge}>
                    {item.media_type === 'Series' ? 'TV Show' : 'Movie'}
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
            >
                ← Previous
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
            >
                Next →
            </button>
        </nav>
    );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdvancedSearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [query,     setQuery]     = useState(searchParams.get('q')          || '');
    const [type,      setType]      = useState(searchParams.get('type')       || 'movie');
    const [year,      setYear]      = useState(searchParams.get('year')       || '');
    const [genreId,   setGenreId]   = useState(searchParams.get('genre')      || '');
    const [sort,      setSort]      = useState(searchParams.get('sort')       || 'popularity.desc');
    const [minRating, setMinRating] = useState(searchParams.get('min_rating') || '');

    const [genres,       setGenres]       = useState([]);
    const [results,      setResults]      = useState([]);
    const [currentPage,  setCurrentPage]  = useState(1);
    const [totalPages,   setTotalPages]   = useState(0);
    const [totalResults, setTotalResults] = useState(0);
    const [loading,      setLoading]      = useState(false);
    const [error,        setError]        = useState(null);
    const [hasSearched,  setHasSearched]  = useState(false);

    // Load genres whenever type changes
    useEffect(() => {
        getGenres(type).then(setGenres).catch(() => setGenres([]));
    }, [type]);

    // Auto-run search if URL contains filters
    useEffect(() => {
        const initialQ      = searchParams.get('q')          || '';
        const initialType   = searchParams.get('type')       || 'movie';
        const initialYear   = searchParams.get('year')       || '';
        const initialGenre  = searchParams.get('genre')      || '';
        const initialSort   = searchParams.get('sort')       || 'popularity.desc';
        const initialRating = searchParams.get('min_rating') || '';
        const initialPage   = parseInt(searchParams.get('page') || '1');

        if (initialQ || initialYear || initialGenre || initialRating) {
            executeSearch({
                q: initialQ, type: initialType, year: initialYear,
                genreId: initialGenre, sort: initialSort,
                minRating: initialRating, page: initialPage,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function executeSearch(params) {
        const { q, type: t, year: y, genreId: g, sort: so, minRating: r, page: p } = params;

        setLoading(true);
        setError(null);
        setHasSearched(true);

        const urlParams = {};
        if (q)              urlParams.q         = q;
        if (t !== 'movie')  urlParams.type      = t;
        if (y)              urlParams.year      = y;
        if (g)              urlParams.genre     = g;
        if (so !== 'popularity.desc') urlParams.sort = so;
        if (r)              urlParams.min_rating = r;
        if (p > 1)          urlParams.page      = p;
        setSearchParams(urlParams);

        try {
            const data = await advancedSearch({
                q, type: t, year: y, genre: g, sort: so, min_rating: r, page: p,
            });
            setResults(data.results ?? []);
            setTotalPages(data.total_pages ?? 0);
            setTotalResults(data.total_results ?? 0);
            setCurrentPage(p);
        } catch (err) {
            setError(err.message || 'An error occurred.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    }

    function handleSubmit(e) {
        e.preventDefault();
        executeSearch({ q: query, type, year, genreId, sort, minRating, page: 1 });
    }

    function handlePageChange(newPage) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        executeSearch({ q: query, type, year, genreId, sort, minRating, page: newPage });
    }

    function handleTypeChange(newType) {
        setType(newType);
        setGenreId('');
    }

    function handleReset() {
        setQuery('');
        setYear('');
        setGenreId('');
        setSort('popularity.desc');
        setMinRating('');
    }

    const currentYear = new Date().getFullYear();

    return (
        <div style={s.page}>
            <div style={s.pageHeader}>
                <h1 style={s.heading}>Advanced Search</h1>
                <p style={s.subtitle}>
                    Explore movies and TV shows using advanced filters.
                    Leave the text field empty to discover content by genre, year, or rating.
                </p>
            </div>

            <form onSubmit={handleSubmit} style={s.form}>
                <div style={s.searchRow}>
                    <div style={s.searchInputWrap}>
                        <svg style={s.searchIcon} viewBox="0 0 20 20" fill="none">
                            <circle cx="9" cy="9" r="6" stroke="#b3b3b3" strokeWidth="1.8" />
                            <path d="M13.5 13.5L17 17" stroke="#b3b3b3" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="A movie or TV show title… (optional)"
                            style={s.searchInput}
                            maxLength={200}
                            aria-label="Search by title"
                        />
                    </div>
                    <button type="submit" style={s.submitBtn} disabled={loading}>
                        {loading ? 'Searching…' : 'Search'}
                    </button>
                </div>

                <div style={s.filtersRow}>
                    <div style={s.filterGroup}>
                        <span style={s.filterLabel}>Type</span>
                        <div style={s.typeToggle}>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('movie')}
                                style={{ ...s.typeBtn, ...(type === 'movie' ? s.typeBtnActive : {}) }}
                            >
                                🎬 Movie
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('tv')}
                                style={{ ...s.typeBtn, ...(type === 'tv' ? s.typeBtnActive : {}) }}
                            >
                                📺 TV Show
                            </button>
                        </div>
                    </div>

                    <div style={s.filterGroup}>
                        <label style={s.filterLabel} htmlFor="filter-year">Year</label>
                        <input
                            id="filter-year"
                            type="number"
                            value={year}
                            onChange={e => setYear(e.target.value)}
                            placeholder={`Ex: ${currentYear}`}
                            min={1888}
                            max={currentYear + 2}
                            style={s.numberInput}
                        />
                    </div>

                    <div style={s.filterGroup}>
                        <label style={s.filterLabel} htmlFor="filter-genre">Genre</label>
                        <select
                            id="filter-genre"
                            value={genreId}
                            onChange={e => setGenreId(e.target.value)}
                            style={s.select}
                        >
                            <option value="">All genres</option>
                            {genres.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={s.filterGroup}>
                        <label style={s.filterLabel} htmlFor="filter-rating">Min Rating</label>
                        <select
                            id="filter-rating"
                            value={minRating}
                            onChange={e => setMinRating(e.target.value)}
                            style={s.select}
                        >
                            {RATING_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div style={s.filterGroup}>
                        <label style={s.filterLabel} htmlFor="filter-sort">Sort By</label>
                        <select
                            id="filter-sort"
                            value={sort}
                            onChange={e => setSort(e.target.value)}
                            style={s.select}
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ ...s.filterGroup, justifyContent: 'flex-end' }}>
                        <span style={{ ...s.filterLabel, visibility: 'hidden' }}>—</span>
                        <button type="button" onClick={handleReset} style={s.resetBtn}>
                            Reset
                        </button>
                    </div>
                </div>
            </form>

            <div>
                {hasSearched && !loading && !error && (
                    <p style={s.resultCount}>
                        {totalResults > 0
                            ? `${totalResults.toLocaleString('en-US')} result${totalResults > 1 ? 's' : ''} found`
                            : 'No results found for these filters. Try adjusting your search.'
                        }
                    </p>
                )}

                {error && (
                    <div style={s.errorBox} role="alert">
                        ⚠️ {error}
                    </div>
                )}

                {!hasSearched && !loading && (
                    <div style={s.emptyState}>
                        <span style={s.emptyIcon} aria-hidden="true">🎬</span>
                        <p style={s.emptyTitle}>Start Exploring</p>
                        <p style={s.emptyText}>
                            Enter a title or choose filters above,<br />
                            then click <strong style={{ color: '#1ed760' }}>Search</strong>.
                        </p>
                    </div>
                )}

                {loading && (
                    <div style={s.grid}>
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} style={s.skeleton} aria-hidden="true">
                                <div style={s.skeletonImg} />
                                <div style={s.skeletonTitle} />
                                <div style={s.skeletonYear} />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && results.length > 0 && (
                    <div style={s.grid}>
                        {results.map(item => (
                            <ResultCard
                                key={`${item.external_id}-${item.media_type}`}
                                item={item}
                            />
                        ))}
                    </div>
                )}

                {!loading && totalPages > 1 && (
                    <Pagination
                        page={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>
        </div>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
    page: {
        maxWidth:   '1400px',
        margin:     '0 auto',
        padding:    '40px 32px 80px',
        fontFamily: font,
        color:      '#fff',
        minHeight:  '100vh',
    },

    pageHeader: { marginBottom: '28px' },
    heading:    { margin: '0 0 8px', fontSize: '28px', fontWeight: '700', letterSpacing: '-0.3px' },
    subtitle:   { margin: 0, fontSize: '14px', color: '#b3b3b3', lineHeight: 1.6, maxWidth: '640px' },

    form: {
        backgroundColor: '#1e1e1e',
        borderRadius:    '12px',
        padding:         '24px',
        marginBottom:    '28px',
        border:          '1px solid #2a2a2a',
    },

    searchRow: {
        display:      'flex',
        gap:          '12px',
        marginBottom: '20px',
        flexWrap:     'wrap',
    },
    searchInputWrap: {
        flex:     1,
        minWidth: '240px',
        position: 'relative',
        display:  'flex',
        alignItems: 'center',
    },
    searchIcon: {
        position:      'absolute',
        left:          '14px',
        width:         '16px',
        height:        '16px',
        pointerEvents: 'none',
        flexShrink:    0,
    },
    searchInput: {
        width:           '100%',
        padding:         '11px 14px 11px 42px',
        fontSize:        '14px',
        backgroundColor: '#121212',
        border:          '1px solid #3a3a3a',
        borderRadius:    '8px',
        color:           '#fff',
        fontFamily:      font,
        outline:         'none',
        boxSizing:       'border-box',
    },
    submitBtn: {
        padding:         '11px 28px',
        backgroundColor: '#1ed760',
        color:           '#000',
        border:          'none',
        borderRadius:    '8px',
        fontSize:        '14px',
        fontWeight:      '700',
        cursor:          'pointer',
        fontFamily:      font,
        flexShrink:      0,
    },

    filtersRow: {
        display:    'flex',
        gap:        '16px',
        flexWrap:   'wrap',
        alignItems: 'flex-end',
    },
    filterGroup: {
        display:       'flex',
        flexDirection: 'column',
        gap:           '6px',
    },
    filterLabel: {
        fontSize:      '11px',
        fontWeight:    '700',
        color:         '#b3b3b3',
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
    },

    typeToggle: {
        display:         'flex',
        gap:             '3px',
        backgroundColor: '#121212',
        padding:         '3px',
        borderRadius:    '8px',
        border:          '1px solid #3a3a3a',
    },
    typeBtn: {
        padding:         '7px 14px',
        fontSize:        '13px',
        fontWeight:      '600',
        border:          'none',
        borderRadius:    '6px',
        cursor:          'pointer',
        fontFamily:      font,
        backgroundColor: 'transparent',
        color:           '#b3b3b3',
        transition:      'all 0.15s',
        whiteSpace:      'nowrap',
    },
    typeBtnActive: {
        backgroundColor: '#1ed760',
        color:           '#000',
    },

    numberInput: {
        padding:         '8px 12px',
        fontSize:        '13px',
        backgroundColor: '#121212',
        border:          '1px solid #3a3a3a',
        borderRadius:    '8px',
        color:           '#fff',
        fontFamily:      font,
        outline:         'none',
        width:           '110px',
        boxSizing:       'border-box',
    },
    select: {
        padding:         '8px 12px',
        fontSize:        '13px',
        backgroundColor: '#121212',
        border:          '1px solid #3a3a3a',
        borderRadius:    '8px',
        color:           '#fff',
        fontFamily:      font,
        outline:         'none',
        cursor:          'pointer',
        minWidth:        '160px',
    },
    resetBtn: {
        padding:         '8px 16px',
        backgroundColor: 'transparent',
        border:          '1px solid #4d4d4d',
        borderRadius:    '8px',
        color:           '#b3b3b3',
        fontSize:        '12px',
        fontWeight:      '600',
        cursor:          'pointer',
        fontFamily:      font,
    },

    resultCount: { margin: '0 0 20px', fontSize: '14px', color: '#b3b3b3', fontWeight: '600' },
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
        padding:         '80px 40px',
        backgroundColor: '#1e1e1e',
        borderRadius:    '16px',
    },
    emptyIcon:  { fontSize: '48px', display: 'block', marginBottom: '16px' },
    emptyTitle: { margin: '0 0 8px', fontSize: '20px', fontWeight: '700', color: '#fff' },
    emptyText:  { margin: 0, fontSize: '14px', color: '#b3b3b3', lineHeight: 1.7 },

    grid: {
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
        gap:                 '14px',
        marginBottom:        '40px',
    },

    card: {
        display:        'block',
        textDecoration: 'none',
        borderRadius:   '10px',
        overflow:       'hidden',
        backgroundColor:'#181818',
        border:         '1px solid rgba(255,255,255,0.05)',
        transition:     'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
    },
    cardHovered: {
        transform:    'translateY(-4px)',
        boxShadow:    '0 12px 30px rgba(0,0,0,0.5)',
        borderColor:  'rgba(30,215,96,0.3)',
    },
    posterWrap: {
        position:        'relative',
        paddingTop:      '150%',
        overflow:        'hidden',
        backgroundColor: '#1a1a1a',
    },
    poster: {
        position:   'absolute',
        inset:      0,
        width:      '100%',
        height:     '100%',
        objectFit:  'cover',
        transition: 'transform 0.3s ease',
        display:    'block',
    },
    posterHovered: { transform: 'scale(1.04)' },
    posterFallback: {
        position:       'absolute',
        inset:          0,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       '40px',
    },
    scoreBadge: {
        position:        'absolute',
        top:             '8px',
        right:           '8px',
        padding:         '3px 8px',
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter:  'blur(4px)',
        borderRadius:    '6px',
        fontSize:        '11px',
        fontWeight:      '700',
        color:           '#ffd700',
    },
    mediaBadge: {
        position:        'absolute',
        top:             '8px',
        left:            '8px',
        padding:         '3px 8px',
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter:  'blur(4px)',
        borderRadius:    '6px',
        fontSize:        '10px',
        fontWeight:      '700',
        color:           'rgba(255,255,255,0.8)',
        textTransform:   'uppercase',
        letterSpacing:   '0.4px',
    },
    cardInfo:  { padding: '8px 10px' },
    cardTitle: {
        margin:        '0 0 4px',
        fontSize:      '12px',
        fontWeight:    '600',
        color:         '#fff',
        overflow:      'hidden',
        textOverflow:  'ellipsis',
        whiteSpace:    'nowrap',
    },
    cardYear: { fontSize: '11px', color: '#b3b3b3' },

    skeleton: {
        borderRadius:    '10px',
        overflow:        'hidden',
        backgroundColor: '#181818',
        border:          '1px solid rgba(255,255,255,0.05)',
    },
    skeletonImg: {
        paddingTop:  '150%',
        background:  'linear-gradient(135deg, #1e1e1e 25%, #2a2a2a 50%, #1e1e1e 75%)',
    },
    skeletonTitle: {
        height:       '12px',
        borderRadius: '6px',
        background:   '#242424',
        margin:       '12px 12px 6px',
    },
    skeletonYear: {
        height:       '10px',
        width:        '40%',
        borderRadius: '6px',
        background:   '#1e1e1e',
        margin:       '0 12px 12px',
    },

    pagination: {
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '6px',
        flexWrap:       'wrap',
        marginTop:      '8px',
    },
    pageBtn: {
        padding:         '8px 14px',
        backgroundColor: '#1e1e1e',
        border:          '1px solid #3a3a3a',
        borderRadius:    '8px',
        color:           '#fff',
        fontSize:        '13px',
        fontWeight:      '600',
        cursor:          'pointer',
        fontFamily:      font,
    },
    pageBtnActive: {
        backgroundColor: '#1ed760',
        borderColor:     '#1ed760',
        color:           '#000',
    },
    pageBtnDisabled: { opacity: 0.3, cursor: 'not-allowed' },
    pageEllipsis:    { color: '#4d4d4d', fontSize: '13px', padding: '0 4px' },
};
