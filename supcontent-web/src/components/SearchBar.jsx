// src/components/SearchBar.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMedia } from '../api/search';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w92'; // small thumbnails

export default function SearchBar() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [type,    setType]    = useState('all'); // 'all' | 'Movie' | 'Series'

  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);
  const navigate    = useNavigate();

  // Live search — triggers after 300ms of no typing, min 2 chars
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
  }

  return (
    <div ref={wrapperRef} style={styles.wrapper}>

      {/* ── Search input + type filter ── */}
      <div style={styles.inputRow}>
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

      {/* ── Dropdown results ── */}
      {open && (
        <ul style={styles.dropdown} role="listbox">

          {loading && (
            <li style={styles.message}>Recherche en cours…</li>
          )}

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
              {/* Poster thumbnail */}
              {item.poster_path ? (
                <img
                  src={`${POSTER_BASE}${item.poster_path}`}
                  alt={item.title}
                  style={styles.poster}
                />
              ) : (
                <div style={styles.posterPlaceholder} />
              )}

              {/* Info */}
              <div style={styles.info}>
                <span style={styles.title}>{item.title}</span>
                <span style={styles.meta}>
                  {item.media_type} ·{' '}
                  {item.release_date?.slice(0, 4) ?? '—'}{' '}
                  {item.vote_average
                    ? `· ⭐ ${Number(item.vote_average).toFixed(1)}`
                    : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Inline styles (swap for your CSS / Tailwind if preferred) ──────────────
const styles = {
  wrapper: {
    position:  'relative',
    width:     '100%',
  },
  inputRow: {
    display:  'flex',
    gap:      8,
  },
  input: {
    flex:        1,
    padding:     '8px 12px',
    fontSize:    15,
    borderRadius: 6,
    border:      '1px solid #ccc',
    outline:     'none',
  },
  select: {
    padding:     '8px 10px',
    fontSize:    14,
    borderRadius: 6,
    border:      '1px solid #ccc',
    cursor:      'pointer',
  },
  dropdown: {
    position:        'absolute',
    top:             '100%',
    left:            0,
    right:           0,
    zIndex:          100,
    margin:          '4px 0 0',
    padding:         0,
    listStyle:       'none',
    background:      '#fff',
    border:          '1px solid #ddd',
    borderRadius:    8,
    boxShadow:       '0 4px 16px rgba(0,0,0,0.12)',
    maxHeight:       400,
    overflowY:       'auto',
  },
  message: {
    padding:   '12px 16px',
    color:     '#888',
    fontSize:  14,
  },
  item: {
    display:    'flex',
    alignItems: 'center',
    gap:        12,
    padding:    '8px 12px',
    cursor:     'pointer',
    transition: 'background 0.15s',
  },
  poster: {
    width:        46,
    height:       68,
    objectFit:   'cover',
    borderRadius: 4,
    flexShrink:   0,
  },
  posterPlaceholder: {
    width:        46,
    height:       68,
    borderRadius: 4,
    background:   '#eee',
    flexShrink:   0,
  },
  info: {
    display:       'flex',
    flexDirection: 'column',
    gap:           2,
  },
  title: {
    fontWeight: 600,
    fontSize:   14,
  },
  meta: {
    fontSize: 12,
    color:    '#666',
  },
};
