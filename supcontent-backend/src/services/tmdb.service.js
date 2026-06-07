const db = require('../config/db');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const CACHE_TTL_DAYS = 7;

function normalizeType(type) {
    return type === 'Series' || type === 'tv' ? 'Series' : 'Movie';
}

const getMediaById = async (id, type = 'Movie') => {
    const mediaType = normalizeType(type);
    const tmdbType = mediaType === 'Series' ? 'tv' : 'movie';

    // Check cache first
    const { rows } = await db.query(
        `SELECT media_type, full_data FROM media_cache
         WHERE external_id = $1
           AND media_type = $2
           AND full_data IS NOT NULL
           AND updated_at > NOW() - INTERVAL '${CACHE_TTL_DAYS} days'`,
        [id, mediaType]
    );

    if (rows.length > 0) {
        return rows[0].full_data;
    }

    // Fetch from TMDB
    const url = `${TMDB_BASE}/${tmdbType}/${id}?api_key=${process.env.TMDB_API_KEY}&language=en-US&append_to_response=credits,recommendations,similar,videos`;
    const response = await fetch(url);

    if (response.status === 404) {
        const err = new Error('Media not found on TMDB.');
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
    const runtime = mediaType === 'Series'
        ? data.episode_run_time?.[0] ?? null
        : data.runtime ?? null;
    const director = mediaType === 'Series'
        ? data.created_by?.map(c => c.name).filter(Boolean).join(', ') || null
        : data.credits?.crew?.find(c => c.job === 'Director')?.name ?? null;
    const videos = data.videos?.results ?? [];
    const trailer =
        videos.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ??
        videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') ??
        videos.find(v => v.site === 'YouTube' && v.type === 'Teaser') ??
        null;
    const related = data.recommendations?.results?.length
        ? data.recommendations.results
        : data.similar?.results ?? [];

    const cached = {
        id:            data.id,
        media_type:    mediaType,
        title:         data.title ?? data.name ?? null,
        overview:      data.overview,
        poster_path:   data.poster_path,
        backdrop_path: data.backdrop_path,
        release_date:  data.release_date ?? data.first_air_date ?? null,
        runtime,
        genres:        data.genres,
        vote_average:  data.vote_average,
        director,
        trailer: trailer ? {
            key: trailer.key,
            name: trailer.name,
            site: trailer.site,
            type: trailer.type,
            official: trailer.official ?? false,
            url: `https://www.youtube.com/watch?v=${trailer.key}`,
        } : null,
        cast: data.credits?.cast?.slice(0, 10).map(a => ({ id: a.id, name: a.name, character: a.character, profile_path: a.profile_path ?? null })) ?? [],
        similar: related.slice(0, 10).map(m => ({
            id: m.id,
            media_type: mediaType,
            title: m.title ?? m.name ?? null,
            poster_path: m.poster_path ?? null,
            vote_average: m.vote_average ?? null,
        })) ?? [],
    };

    // Upsert into cache
    await db.query(
        `INSERT INTO media_cache (external_id, media_type, full_data)
         VALUES ($1, $2, $3)
         ON CONFLICT (external_id, media_type) DO UPDATE SET
             full_data  = EXCLUDED.full_data,
             updated_at = NOW()`,
        [cached.id, mediaType, JSON.stringify(cached)]
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

module.exports = { getMediaById, getTrending };
