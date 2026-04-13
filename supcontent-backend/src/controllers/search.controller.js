// src/controllers/search.controller.js
const pool = require('../config/db');

const TMDB_BASE = 'https://api.themoviedb.org/3';

// Search TMDB directly
async function searchTMDB(q, type) {
  const mediaType = type === 'Series' ? 'tv' : 'movie';
  const url = `${TMDB_BASE}/search/${mediaType}?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(q)}&language=en-US`;
  const res  = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).slice(0, 10).map(item => ({
    external_id:  item.id,
    media_type:   type === 'Series' ? 'Series' : 'Movie',
    title:        item.title ?? item.name ?? null,
    poster_path:  item.poster_path ?? null,
    overview:     item.overview ?? null,
    release_date: item.release_date ?? item.first_air_date ?? null,
    vote_average: item.vote_average ?? null,
    from_tmdb:    true,
  }));
}

exports.search = async (req, res) => {
  const { q, type = 'all', limit = 10, offset = 0 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      error: 'Le paramètre "q" doit contenir au moins 2 caractères.'
    });
  }

  const term = `%${q.trim()}%`;
  const lim  = parseInt(Math.min(Number(limit) || 10, 50));
  const off  = parseInt(Number(offset) || 0);

  try {
    const params = [term, term];
    let typeFilter = '';

    if (type === 'Movie' || type === 'Series') {
      typeFilter = `AND media_type = $${params.length + 1}`;
      params.push(type);
    }

    const startPrefix = `${q.trim()}%`;
    params.push(startPrefix);
    const prefixIdx = params.length;

    // 1. Search local cache first (PostgreSQL JSON operators)
    const query = `
      SELECT
        external_id,
        media_type,
        full_data->>'title'        AS title,
        full_data->>'poster_path'  AS poster_path,
        full_data->>'overview'     AS overview,
        full_data->>'release_date' AS release_date,
        full_data->>'vote_average' AS vote_average
      FROM media_cache
      WHERE (
        full_data->>'title'    ILIKE $1
        OR
        full_data->>'overview' ILIKE $2
      )
      ${typeFilter}
      ORDER BY
        CASE
          WHEN full_data->>'title' ILIKE $${prefixIdx} THEN 0
          ELSE 1
        END,
        (full_data->>'vote_average')::numeric DESC
      LIMIT ${lim} OFFSET ${off}
    `;

    const { rows } = await pool.query(query, params);

    // 2. If local cache has results, return them
    if (rows.length > 0) {
      return res.json({
        query:   q.trim(),
        type,
        source:  'cache',
        total:   rows.length,
        limit:   lim,
        offset:  off,
        results: rows,
      });
    }

    // 3. Nothing in cache — fall back to TMDB
    let tmdbResults = [];
    if (type === 'all') {
      const [movies, series] = await Promise.all([
        searchTMDB(q, 'Movie'),
        searchTMDB(q, 'Series'),
      ]);
      const maxLen = Math.max(movies.length, series.length);
      for (let i = 0; i < maxLen; i++) {
        if (movies[i])  tmdbResults.push(movies[i]);
        if (series[i])  tmdbResults.push(series[i]);
      }
      tmdbResults = tmdbResults.slice(0, lim);
    } else {
      tmdbResults = await searchTMDB(q, type);
    }

    return res.json({
      query:   q.trim(),
      type,
      source:  'tmdb',
      total:   tmdbResults.length,
      limit:   lim,
      offset:  off,
      results: tmdbResults,
    });

  } catch (err) {
    console.error('❌ Erreur recherche :', err.message);
    return res.status(500).json({ error: 'Erreur serveur lors de la recherche.' });
  }
};
