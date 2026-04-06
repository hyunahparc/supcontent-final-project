import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMedia } from '../api/search';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w92';

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
                        <circle cx="9" cy="9" r="6" stroke="#bbb" strokeWidth="1.8" />
                        <path d="M13.5 13.5L17 17" stroke="#bbb" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Rechercher un film, une série…"
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
                    <option value="all">Tout</option>
                    <option value="Movie">Films</option>
                    <option value="Series">Séries</option>
                </select>
            </div>

            {open && (
                <ul style={styles.dropdown} role="listbox">
                    {!loading && results.length === 0 && (
                        <li style={styles.message}>Aucun résultat pour « {query} »</li>
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
        maxWidth: '560px',
        width: '100%',
        margin: '0 auto',
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
        left: '12px',
        width: '16px',
        height: '16px',
        pointerEvents: 'none',
    },
    input: {
        width: '100%',
        padding: '9px 12px 9px 36px',
        fontSize: '14px',
        borderRadius: '10px',
        border: '1.5px solid #e5e5e5',
        outline: 'none',
        backgroundColor: '#fafafa',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
    },
    spinner: {
        position: 'absolute',
        right: '12px',
        fontSize: '14px',
        color: '#bbb',
        animation: 'spin 1s linear infinite',
    },
    select: {
        padding: '9px 12px',
        fontSize: '13px',
        borderRadius: '10px',
        border: '1.5px solid #e5e5e5',
        backgroundColor: '#fafafa',
        color: '#555',
        cursor: 'pointer',
        outline: 'none',
    },
    dropdown: {
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        right: 0,
        zIndex: 100,
        margin: 0,
        padding: '6px 0',
        listStyle: 'none',
        backgroundColor: '#fff',
        border: '1px solid #f0f0f0',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        maxHeight: '400px',
        overflowY: 'auto',
    },
    message: {
        padding: '12px 16px',
        color: '#aaa',
        fontSize: '13px',
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
        borderRadius: '6px',
        flexShrink: 0,
    },
    posterPlaceholder: {
        width: '40px',
        height: '58px',
        borderRadius: '6px',
        backgroundColor: '#f0f0f0',
        flexShrink: 0,
    },
    info: {
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
    },
    itemTitle: {
        fontWeight: '600',
        fontSize: '13px',
        color: '#111',
    },
    itemMeta: {
        fontSize: '12px',
        color: '#999',
    },
};
