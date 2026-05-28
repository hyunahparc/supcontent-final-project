const db = require('../config/db');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const CACHE_TTL_DAYS = 7;

const getFilmById = async (id) => {
    // Check cache first
    const { rows } = await db.query(
        `SELECT full_data FROM media_cache
         WHERE external_id = $1
           AND full_data IS NOT NULL
           AND updated_at > NOW() - INTERVAL '${CACHE_TTL_DAYS} days'`,
        [id]
    );

    if (rows.length > 0) {
        return rows[0].full_data;
    }

    // Fetch from TMDB
    const url = `${TMDB_BASE}/movie/${id}?api_key=${process.env.TMDB_API_KEY}&language=en-US&append_to_response=credits,similar`;
    const response = await fetch(url);

    if (response.status === 404) {
        const err = new Error('Film not found on TMDB.');
        err.status = 404;
        throw err;
    }
    if (!response.ok) {
        const err = new Error('TMDB API error.');
        err.status = response.status;
        throw err;
    }

    const data = await response.json();

    // Keep only fields needed for the detail page (no full dump)
    const cached = {
        id:            data.id,
        title:         data.title,
        overview:      data.overview,
        poster_path:   data.poster_path,
        backdrop_path: data.backdrop_path,
        release_date:  data.release_date,
        runtime:       data.runtime,
        genres:        data.genres,
        vote_average:  data.vote_average,
        director: data.credits?.crew?.find(c => c.job === 'Director')?.name ?? null,
        cast: data.credits?.cast?.slice(0, 10).map(a => ({ id: a.id, name: a.name, character: a.character, profile_path: a.profile_path ?? null })) ?? [],
        similar: data.similar?.results?.slice(0, 10).map(m => ({ id: m.id, title: m.title, poster_path: m.poster_path ?? null, vote_average: m.vote_average ?? null })) ?? [],
    };

    // Upsert into cache
    await db.query(
        `INSERT INTO media_cache (external_id, media_type, full_data)
         VALUES ($1, 'Movie', $2)
         ON CONFLICT (external_id) DO UPDATE SET
             full_data  = EXCLUDED.full_data,
             updated_at = NOW()`,
        [cached.id, JSON.stringify(cached)]
    );

    return cached;
};

const getTrending = async (type = 'all', limit = 12) => {
    const mediaType = type === 'Movie' ? 'movie' : type === 'Series' ? 'tv' : 'all';
    const lim = Math.min(Math.max(1, parseInt(limit) || 12), 50);

    const url = `${TMDB_BASE}/trending/${mediaType}/week?api_key=${process.env.TMDB_API_KEY}&language=en-US`;
    const response = await fetch(url);

    if (!response.ok) {
        const err = new Error('TMDB trending error.');
        err.status = response.status;
        throw err;
    }

    const data = await response.json();

    return (data.results ?? []).slice(0, lim).map(r => ({
        external_id:  r.id,
        title:        r.title ?? r.name ?? null,
        poster_path:  r.poster_path ?? null,
        media_type:   r.media_type === 'tv' || type === 'Series' ? 'Series' : 'Movie',
        release_date: r.release_date ?? r.first_air_date ?? null,
        vote_average: r.vote_average ?? null,
    }));
};

module.exports = { getFilmById, getTrending };
