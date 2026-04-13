import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMedia } from '../api/search';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w92';
const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";

export default function SearchBar() {
    const [query,   setQuery]   = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open,    setOpen]    = useState(false);
    const [type,    setType]    = useState('all');

    const debounceRef = useRef(null);
    const wrapperRef  = useRef(null);
    const navigate    = useNavigate();

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            setOpen(false);
            return;
        }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await searchMedia(query, type, 10);
                setResults(data);
                setOpen(true);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [query, type]);

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
    }

    return (
        <div ref={wrapperRef} style={styles.wrapper}>
            <div style={styles.inputRow}>
                <div style={styles.inputWrap}>
                    <svg style={styles.searchIcon} viewBox="0 0 20 20" fill="none">
                        <circle cx="9" cy="9" r="6" stroke="#b3b3b3" strokeWidth="1.8" />
                        <path d="M13.5 13.5L17 17" stroke="#b3b3b3" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search for a film or series…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => results.length > 0 && setOpen(true)}
                        style={styles.input}
                        aria-label="Recherche"
                        aria-autocomplete="list"
                        aria-expanded={open}
                    />
                    {loading && <span style={styles.spinner}>⟳</span>}
                </div>
                <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    style={styles.select}
                    aria-label="Filtrer par type"
                >
                    <option value="all">All</option>
                    <option value="Movie">Movies</option>
                    <option value="Series">Series</option>
                </select>
            </div>

            {open && (
                <ul style={styles.dropdown} role="listbox">
                    {!loading && results.length === 0 && (
                        <li style={styles.message}>No results for "{query}"</li>
                    )}
                    {!loading && results.map(item => (
                        <li
                            key={item.external_id}
                            onClick={() => handleSelect(item)}
                            style={styles.item}
                            role="option"
                            tabIndex={0}
                            onKeyDown={e => e.key === 'Enter' && handleSelect(item)}
                        >
                            {item.poster_path ? (
                                <img src={`${POSTER_BASE}${item.poster_path}`} alt={item.title} style={styles.poster} />
                            ) : (
                                <div style={styles.posterPlaceholder} />
                            )}
                            <div style={styles.info}>
                                <span style={styles.itemTitle}>{item.title}</span>
                                <span style={styles.itemMeta}>
                                    {item.media_type} · {item.release_date?.slice(0, 4) ?? '—'}
                                    {item.vote_average ? ` · ⭐ ${Number(item.vote_average).toFixed(1)}` : ''}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

const styles = {
    wrapper: {
        position: 'relative',
        width: '480px',
        fontFamily: font,
    },
    inputRow: {
        display: 'flex',
        gap: '8px',
    },
    inputWrap: {
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    searchIcon: {
        position: 'absolute',
        left: '14px',
        width: '16px',
        height: '16px',
        pointerEvents: 'none',
    },
    input: {
        width: '100%',
        padding: '10px 12px 10px 40px',
        fontSize: '14px',
        borderRadius: '500px',
        border: 'none',
        outline: 'none',
        backgroundColor: '#1f1f1f',
        color: '#fff',
        boxSizing: 'border-box',
        fontFamily: font,
    },
    spinner: {
        position: 'absolute',
        right: '14px',
        fontSize: '14px',
        color: '#b3b3b3',
    },
    select: {
        padding: '10px 14px',
        fontSize: '13px',
        borderRadius: '500px',
        border: 'none',
        backgroundColor: '#1f1f1f',
        color: '#fff',
        cursor: 'pointer',
        outline: 'none',
        fontFamily: font,
        fontWeight: '700',
    },
    dropdown: {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        right: 0,
        zIndex: 100,
        margin: 0,
        padding: '6px 0',
        listStyle: 'none',
        backgroundColor: '#181818',
        borderRadius: '8px',
        boxShadow: 'rgba(0,0,0,0.5) 0px 8px 24px',
        maxHeight: '400px',
        overflowY: 'auto',
    },
    message: {
        padding: '12px 16px',
        color: '#b3b3b3',
        fontSize: '13px',
        fontFamily: font,
    },
    item: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 14px',
        cursor: 'pointer',
    },
    poster: {
        width: '40px',
        height: '58px',
        objectFit: 'cover',
        borderRadius: '4px',
        flexShrink: 0,
    },
    posterPlaceholder: {
        width: '40px',
        height: '58px',
        borderRadius: '4px',
        backgroundColor: '#1f1f1f',
        flexShrink: 0,
    },
    info: {
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
    },
    itemTitle: {
        fontWeight: '700',
        fontSize: '13px',
        color: '#fff',
        fontFamily: font,
    },
    itemMeta: {
        fontSize: '12px',
        color: '#b3b3b3',
        fontFamily: font,
    },
};
