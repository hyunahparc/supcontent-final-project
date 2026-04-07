/**
 * SearchResultsPage.jsx
 *
 * Gère la navigation depuis la barre de recherche du Hero (?q=...).
 * Affiche les résultats de recherche dans une grille.
 * Le backend doit être lancé pour que les résultats s'affichent.
 */
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchMedia } from '../api/films';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const type  = searchParams.get('type') ?? 'all';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);

    searchMedia(query, type, 20, abortRef.current.signal)
      .then(data  => { setResults(data); setLoading(false); })
      .catch(err  => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          setError('Le backend doit être lancé pour afficher les résultats.');
          setLoading(false);
        }
      });

    return () => abortRef.current?.abort();
  }, [query, type]);

  function handleTypeChange(newType) {
    setSearchParams({ q: query, type: newType });
  }

  return (
    <div style={s.page}>
      {/* En-tête */}
      <div style={s.header}>
        <h1 style={s.title}>
          {query
            ? <>Résultats pour <span style={s.queryText}>« {query} »</span></>
            : 'Recherche'}
        </h1>

        {/* Filtre type */}
        <div style={s.tabs}>
          {['all', 'Movie', 'Series'].map(t => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              style={{ ...s.tab, ...(type === t ? s.tabActive : {}) }}
            >
              {{ all: 'Tout', Movie: 'Films', Series: 'Séries' }[t]}
            </button>
          ))}
        </div>
      </div>

      {/* États */}
      {loading && <p style={s.state}>Recherche en cours…</p>}
      {error   && <p style={{ ...s.state, color: '#e50914' }}>{error}</p>}
      {!loading && !error && results.length === 0 && query.length >= 2 && (
        <p style={s.state}>Aucun résultat pour « {query} ».</p>
      )}

      {/* Grille de résultats */}
      {!loading && results.length > 0 && (
        <div style={s.grid}>
          {results.map(item => (
            <Link
              key={item.external_id}
              to={`/films/${item.external_id}`}
              style={s.card}
            >
              <div style={s.posterWrap}>
                {item.poster_path ? (
                  <img
                    src={`${POSTER_BASE}${item.poster_path}`}
                    alt={item.title}
                    style={s.poster}
                    loading="lazy"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div style={s.posterFallback}>🎬</div>
                )}
                <span style={{ ...s.badge, ...(item.media_type === 'Series' ? s.badgeSeries : {}) }}>
                  {item.media_type === 'Series' ? 'Série' : 'Film'}
                </span>
              </div>
              <div style={s.cardBody}>
                <p style={s.cardTitle}>{item.title}</p>
                <p style={s.cardMeta}>
                  {item.release_date?.slice(0, 4) ?? '—'}
                  {item.vote_average ? ` · ⭐ ${Number(item.vote_average).toFixed(1)}` : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  page: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 24px 80px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '40px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#fff',
    letterSpacing: '-0.5px',
    margin: 0,
  },
  queryText: { color: '#e50914' },
  tabs: {
    display: 'flex',
    gap: '4px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px',
    padding: '4px',
  },
  tab: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    background: 'none',
    border: 'none',
    borderRadius: '7px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: { background: '#e50914', color: '#fff' },
  state: {
    textAlign: 'center',
    padding: '60px 0',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '15px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '16px',
  },
  card: {
    display: 'block',
    textDecoration: 'none',
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#111',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  posterWrap: {
    position: 'relative',
    paddingTop: '150%',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  poster: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  posterFallback: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
  },
  badge: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    padding: '3px 8px',
    background: 'rgba(0,0,0,0.75)',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  badgeSeries: { color: '#60b3ff' },
  cardBody: { padding: '12px' },
  cardTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    margin: '0 0 4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardMeta: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 },
};