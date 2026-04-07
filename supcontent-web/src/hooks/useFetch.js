import { useState, useEffect, useCallback } from 'react';

export function useFetch(fetchFn, args = [], { immediate = true } = {}) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error,   setError]   = useState(null);

  const argsKey = args.join(',');

  useEffect(() => {
    if (!immediate) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    console.log('[useFetch] calling', fetchFn.name || 'fetchFn', 'with', args);
    fetchFn(...args)
      .then(result => {
        console.log('[useFetch] result', result);
        if (!cancelled) { setData(result); setLoading(false); }
      })
      .catch(err => {
        console.log('[useFetch] error', err);
        if (!cancelled) { setError(err.message ?? 'Erreur'); setLoading(false); }
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey, immediate]);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchFn(...args)
      .then(result => { setData(result); setLoading(false); })
      .catch(err   => { setError(err.message ?? 'Erreur'); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey]);

  return { data, loading, error, refetch };
}