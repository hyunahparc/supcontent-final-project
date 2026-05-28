// src/components/SearchBar.jsx
// Quick search bar with autocomplete, infinite scroll, and advanced search link

import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { searchMedia } from '../api/search';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w92';
const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";
const PAGE_SIZE = 10;

export default function SearchBar() {
    const [query,       setQuery]       = useState('');
    const [results,     setResults]     = useState([]);
    const [loading,     setLoading]     = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [open,        setOpen]        = useState(false);
    const [offset,      setOffset]      = useState(0);
    const [hasMore,     setHasMore]     = useState(false);

    const debounceRef  = useRef(null);
    const wrapperRef   = useRef(null);
    const dropdownRef  = useRef(null);
    const currentQuery = useRef('');
    const navigate     = useNavigate();

    // Trigger search with 300 ms debounce — resets pagination
    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            setOpen(false);
            setOffset(0);
            setHasMore(false);
            return;
        }

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            currentQuery.current = query;
            setLoading(true);
            setOffset(0);
            try {
                const data = await searchMedia(query, 'all', PAGE_SIZE, 0);
                setResults(data);
                setHasMore(data.length === PAGE_SIZE);
                setOffset(PAGE_SIZE);
                setOpen(true);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(debounceRef.current);
    }, [query]);

    // Fetch next batch and append to the results list
    async function loadMore() {
        if (loadingMore || !hasMore || query !== currentQuery.current) return;
        setLoadingMore(true);
        try {
            const data = await searchMedia(query, 'all', PAGE_SIZE, offset);
            setResults(prev => [...prev, ...data]);
            setHasMore(data.length === PAGE_SIZE);
            setOffset(prev => prev + PAGE_SIZE);
        } catch {
            // silently ignore
        } finally {
            setLoadingMore(false);
        }
    }

    // Trigger loadMore when the user scrolls near the bottom of the dropdown
    function handleDropdownScroll(e) {
        const el = e.currentTarget;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
            loadMore();
        }
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleSelect(item) {
        setOpen(false);
        setQuery('');
        navigate(`/films/${item.external_id}`);
    }

    function handleKeyDown(e) {
        if (e.key === 'Escape') setOpen(false);
        if (e.key === 'Enter' && query.trim().length >= 2) {
            setOpen(false);
            navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            setQuery('');
        }
    }

    const advancedSearchHref = query.trim().length >= 2
        ? `/search?q=${encodeURIComponent(query.trim())}`
        : '/search';

    return (
        <div ref={wrapperRef} style={styles.wrapper}>
            <div style={styles.inputWrap}>
                <svg style={styles.searchIcon} viewBox="0 0 20 20" fill="none">
                    <circle cx="9" cy="9" r="6" stroke="#b3b3b3" strokeWidth="1.8" />
                    <path d="M13.5 13.5L17 17" stroke="#b3b3b3" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                    type="text"
                    placeholder="Search for a movie or TV show..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    style={styles.input}
                    aria-label="Quick search"
                    aria-autocomplete="list"
                    aria-expanded={open}
                />
                {loading && <span style={styles.spinner}>...</span>}
            </div>

            {open && (
                <ul
                    ref={dropdownRef}
                    style={styles.dropdown}
                    role="listbox"
                    onScroll={handleDropdownScroll}
                >
                    {!loading && results.length === 0 && (
                        <li style={styles.message}>No results for &quot;{query}&quot;</li>
                    )}

                    {results.map(item => (
                        <li
                            key={`${item.external_id}-${item.media_type}`}
                            onClick={() => handleSelect(item)}
                            style={styles.item}
                            role="option"
                            tabIndex={0}
                            onKeyDown={e => e.key === 'Enter' && handleSelect(item)}
                        >
                            {item.poster_path ? (
                                <img
                                    src={`${POSTER_BASE}${item.poster_path}`}
                                    alt={item.title}
                                    style={styles.poster}
                                />
                            ) : (
                                <div style={styles.posterPlaceholder} />
                            )}
                            <div style={styles.info}>
                                <span style={styles.itemTitle}>{item.title}</span>
                                <span style={styles.itemMeta}>
                                    {item.media_type} · {item.release_date?.slice(0, 4) ?? '-'}
                                    {item.vote_average ? ` · ${Number(item.vote_average).toFixed(1)}` : ''}
                                </span>
                            </div>
                        </li>
                    ))}

                    {loadingMore && (
                        <li style={styles.message}>Loading more...</li>
                    )}

                    <li style={styles.advancedLinkItem}>
                        <Link
                            to={advancedSearchHref}
                            style={styles.advancedLink}
                            onClick={() => { setOpen(false); setQuery(''); }}
                        >
                            <span>Search - See all results</span>
                            <span style={styles.advancedLinkArrow}>-&gt;</span>
                        </Link>
                    </li>
                </ul>
            )}
        </div>
    );
}

const styles = {
    wrapper: {
        position:   'relative',
        width:      '100%',
        fontFamily: font,
    },
    inputWrap: {
        flex:       1,
        position:   'relative',
        display:    'flex',
        alignItems: 'center',
    },
    searchIcon: {
        position:      'absolute',
        left:          '14px',
        width:         '16px',
        height:        '16px',
        pointerEvents: 'none',
    },
    input: {
        width:           '100%',
        padding:         '10px 12px 10px 40px',
        fontSize:        '14px',
        borderRadius:    '500px',
        border:          'none',
        outline:         'none',
        backgroundColor: '#1f1f1f',
        color:           '#fff',
        boxSizing:       'border-box',
        fontFamily:      font,
    },
    spinner: {
        position: 'absolute',
        right:    '14px',
        fontSize: '14px',
        color:    '#b3b3b3',
    },
    dropdown: {
        position:        'absolute',
        top:             'calc(100% + 8px)',
        left:            0,
        right:           0,
        zIndex:          100,
        margin:          0,
        padding:         '6px 0',
        listStyle:       'none',
        backgroundColor: '#181818',
        borderRadius:    '8px',
        boxShadow:       '0 8px 24px rgba(0,0,0,0.5)',
        maxHeight:       '400px',
        overflowY:       'auto',
    },
    message: {
        padding:    '12px 16px',
        color:      '#b3b3b3',
        fontSize:   '13px',
        fontFamily: font,
    },
    item: {
        display:    'flex',
        alignItems: 'center',
        gap:        '12px',
        padding:    '8px 14px',
        cursor:     'pointer',
    },
    poster: {
        width:        '40px',
        height:       '58px',
        objectFit:    'cover',
        borderRadius: '4px',
        flexShrink:   0,
    },
    posterPlaceholder: {
        width:           '40px',
        height:          '58px',
        borderRadius:    '4px',
        backgroundColor: '#1f1f1f',
        flexShrink:      0,
    },
    info: {
        display:       'flex',
        flexDirection: 'column',
        gap:           '3px',
    },
    itemTitle: {
        fontWeight: '700',
        fontSize:   '13px',
        color:      '#fff',
        fontFamily: font,
    },
    itemMeta: {
        fontSize:   '12px',
        color:      '#b3b3b3',
        fontFamily: font,
    },
    advancedLinkItem: {
        borderTop:  '1px solid #2a2a2a',
        marginTop:  '4px',
        paddingTop: '4px',
    },
    advancedLink: {
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '10px 14px',
        fontSize:       '12px',
        fontWeight:     '600',
        color:          '#1ed760',
        textDecoration: 'none',
        fontFamily:     font,
    },
    advancedLinkArrow: {
        color: '#4d4d4d',
    },
};
