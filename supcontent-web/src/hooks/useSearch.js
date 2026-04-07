/**
 * useSearch.js — Hook de recherche avec debounce + AbortController
 *
 * Corrige la race condition du SearchBar existant :
 * chaque nouvelle saisie annule la requête précédente.
 *
 * Usage :
 *   const { results, loading, error } = useSearch(query, type);
 */
import { useState, useEffect, useRef } from 'react';
import { searchMedia } from '../api/films';

const DEBOUNCE_MS = 300;
const MIN_LENGTH  = 2;

/**
 * @param {string} query
 * @param {'all'|'Movie'|'Series'} type
 * @param {number} [limit=10]
 */
export function useSearch(query, type = 'all', limit = 10) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const abortRef   = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    // Réinitialiser si la query est trop courte
    if (!query || query.trim().length < MIN_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Annuler le timer précédent
    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      // Annuler la requête HTTP précédente
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const data = await searchMedia(query, type, limit, abortRef.current.signal);
        setResults(data);
      } catch (err) {
        // Ignorer les erreurs d'annulation volontaire
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          setError(err.message ?? 'Erreur lors de la recherche.');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceRef.current);
      // Ne pas abort ici — on veut annuler uniquement lors du prochain appel
    };
  }, [query, type, limit]);

  // Nettoyage à la destruction du composant
  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return { results, loading, error };
}