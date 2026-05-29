// src/controllers/search.controller.js
// Simple and advanced search via TMDB + local cache

const pool = require('../config/db');

const TMDB_BASE = 'https://api.themoviedb.org/3';

// Whitelist of allowed sorts (URL injection protection)
const VALID_SORTS = [
    'popularity.desc',
    'vote_average.desc',
    'primary_release_date.desc',
    'primary_release_date.asc',
    'revenue.desc',
];

// ── Internal utility: TMDB /search call ──────────────────────────────────────
async function searchTMDB(q, type) {
    const mediaType = type === 'Series' ? 'tv' : 'movie';
    const url = `${TMDB_BASE}/search/${mediaType}?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(q)}&language=en-US`;
    const res = await fetch(url);
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

// ── GET /api/search?q=&type=&limit=&offset= ──────────────────────────────────
// Quick search: local cache + TMDB merge (used by SearchBar)
exports.search = async (req, res) => {
    const { q, type = 'all', limit = 10, offset = 0 } = req.query;

    if (!q || q.trim().length < 2) {
        return res.status(400).json({
            error: 'The "q" parameter must contain at least 2 characters.',
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

        // Search local cache first
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
                CASE WHEN full_data->>'title' ILIKE $${prefixIdx} THEN 0 ELSE 1 END,
                (full_data->>'vote_average')::numeric DESC
            LIMIT ${lim} OFFSET ${off}
        `;

        const { rows } = await pool.query(query, params);

        // Complete with TMDB for items not already in cache
        let tmdbResults = [];
        if (type === 'all') {
            const [movies, series] = await Promise.all([
                searchTMDB(q, 'Movie'),
                searchTMDB(q, 'Series'),
            ]);
            const maxLen = Math.max(movies.length, series.length);
            for (let i = 0; i < maxLen; i++) {
                if (movies[i]) tmdbResults.push(movies[i]);
                if (series[i]) tmdbResults.push(series[i]);
            }
        } else {
            tmdbResults = await searchTMDB(q, type);
        }

        // Deduplicate: local cache has priority
        const cachedIds = new Set(rows.map(r => String(r.external_id)));
        const merged = [
            ...rows,
            ...tmdbResults.filter(r => !cachedIds.has(String(r.external_id))),
        ].slice(0, lim);

        return res.json({
            query: q.trim(),
            type,
            source: 'merged',
            total: merged.length,
            limit: lim,
            offset: off,
            results: merged,
        });

    } catch (err) {
        console.error('[search]', err.message);
        return res.status(500).json({ error: 'Server error while searching.' });
    }
};

// ── GET /api/search/users?q=&limit= ──────────────────────────────────────────
exports.searchUsers = async (req, res) => {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
        return res.status(400).json({ error: 'The "q" parameter must contain at least 2 characters.' });
    }

    const lim = Math.min(Math.max(1, parseInt(limit) || 10), 50);

    try {
        const { rows } = await pool.query(
            `SELECT user_id, username, avatar, bio
             FROM users
             WHERE username ILIKE $1
             ORDER BY username
             LIMIT $2`,
            [`%${q.trim()}%`, lim]
        );
        return res.json({ results: rows, total: rows.length });
    } catch (err) {
        console.error('[searchUsers]', err.message);
        return res.status(500).json({ error: 'Server error.' });
    }
};

// ── GET /api/search/lists?q=&limit= ──────────────────────────────────────────
exports.searchLists = async (req, res) => {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
        return res.status(400).json({ error: 'The "q" parameter must contain at least 2 characters.' });
    }

    const lim = Math.min(Math.max(1, parseInt(limit) || 10), 50);

    try {
        const { rows } = await pool.query(
            `SELECT cl.list_id, cl.name, cl.created_at,
                    u.user_id AS owner_id, u.username AS owner_username,
                    COUNT(cli.external_id)::int AS media_count
             FROM custom_lists cl
             JOIN users u ON u.user_id = cl.user_id
             LEFT JOIN custom_list_items cli ON cli.list_id = cl.list_id
             WHERE cl.is_public = TRUE AND cl.name ILIKE $1
             GROUP BY cl.list_id, u.user_id
             ORDER BY cl.name
             LIMIT $2`,
            [`%${q.trim()}%`, lim]
        );
        return res.json({ results: rows, total: rows.length });
    } catch (err) {
        console.error('[searchLists]', err.message);
        return res.status(500).json({ error: 'Server error.' });
    }
};

// ── GET /api/search/genres?type=movie|tv ─────────────────────────────────────
// Returns the TMDB genre list for a media type
exports.getGenres = async (req, res) => {
    const { type = 'movie' } = req.query;

    // Strict validation to avoid arbitrary content in the TMDB URL
    const mediaType = type === 'tv' ? 'tv' : 'movie';

    try {
        const url = `${TMDB_BASE}/genre/${mediaType}/list?api_key=${process.env.TMDB_API_KEY}&language=en-US`;
        const response = await fetch(url);

        if (!response.ok) {
            return res.status(502).json({ error: 'Unable to fetch TMDB genres.' });
        }

        const data = await response.json();
        return res.json(data.genres ?? []);
    } catch (err) {
        console.error('[getGenres]', err.message);
        return res.status(500).json({ error: 'Server error.' });
    }
};

// ── GET /api/search/advanced?q=&type=&year=&genre=&sort=&min_rating=&page= ───
// Advanced search: uses /discover (without text) or /search (with text)
exports.advancedSearch = async (req, res) => {
    const {
        q          = '',
        type       = 'movie',
        year,
        genre,
        sort       = 'popularity.desc',
        min_rating,
        page       = 1,
    } = req.query;

    // Type: only 'movie' or 'tv'
    const mediaType = type === 'tv' ? 'tv' : 'movie';

    // Sort: validate against whitelist, then adapt for TV
    let sanitizedSort = VALID_SORTS.includes(sort) ? sort : 'popularity.desc';
    if (mediaType === 'tv') {
        sanitizedSort = sanitizedSort.replace('primary_release_date', 'first_air_date');
    }

    // Page: integer between 1 and 500 (TMDB limit)
    const sanitizedPage = Math.min(Math.max(1, parseInt(page) || 1), 500);

    // Year: realistic 4-digit integer
    const currentYear = new Date().getFullYear();
    let sanitizedYear = null;
    if (year) {
        const parsedYear = parseInt(year);
        if (!isNaN(parsedYear) && parsedYear >= 1888 && parsedYear <= currentYear + 2) {
            sanitizedYear = parsedYear;
        }
    }

    // Genre: positive integer only
    let sanitizedGenre = null;
    if (genre) {
        const parsedGenre = parseInt(genre);
        if (!isNaN(parsedGenre) && parsedGenre > 0) sanitizedGenre = parsedGenre;
    }

    // Minimum rating: number between 0 and 10
    let sanitizedMinRating = null;
    if (min_rating) {
        const parsedRating = parseFloat(min_rating);
        if (!isNaN(parsedRating) && parsedRating >= 0 && parsedRating <= 10) {
            sanitizedMinRating = parsedRating;
        }
    }

    // Search text: trim and limit length
    const trimmedQuery = q.trim().slice(0, 200);

    try {
        let url;

        if (trimmedQuery.length >= 2) {
            // Text search mode: /search
            url = `${TMDB_BASE}/search/${mediaType}?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(trimmedQuery)}&language=en-US&page=${sanitizedPage}&include_adult=false`;
            if (sanitizedYear) {
                const yearParam = mediaType === 'tv' ? 'first_air_date_year' : 'year';
                url += `&${yearParam}=${sanitizedYear}`;
            }
        } else {
            // Discover mode: /discover with full filters
            url = `${TMDB_BASE}/discover/${mediaType}?api_key=${process.env.TMDB_API_KEY}&language=en-US&sort_by=${sanitizedSort}&page=${sanitizedPage}&include_adult=false`;
            if (sanitizedYear) {
                const yearParam = mediaType === 'tv' ? 'first_air_date_year' : 'primary_release_year';
                url += `&${yearParam}=${sanitizedYear}`;
            }
            if (sanitizedGenre) url += `&with_genres=${sanitizedGenre}`;
            // Require at least 50 votes to make average rating more reliable
            if (sanitizedMinRating !== null) url += `&vote_average.gte=${sanitizedMinRating}&vote_count.gte=50`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            return res.status(502).json({ error: 'Error while requesting TMDB.' });
        }

        const data = await response.json();

        // Normalize output format to match the rest of the app
        const results = (data.results ?? []).map(item => ({
            external_id:   item.id,
            media_type:    mediaType === 'tv' ? 'Series' : 'Movie',
            title:         item.title ?? item.name ?? null,
            poster_path:   item.poster_path ?? null,
            backdrop_path: item.backdrop_path ?? null,
            overview:      item.overview ?? null,
            release_date:  item.release_date ?? item.first_air_date ?? null,
            vote_average:   item.vote_average ?? null,
            vote_count:    item.vote_count ?? null,
            genre_ids:     item.genre_ids ?? [],
        }));

        return res.json({
            query:         trimmedQuery || null,
            type:          mediaType === 'tv' ? 'Series' : 'Movie',
            page:          sanitizedPage,
            total_pages:   Math.min(data.total_pages ?? 1, 500),
            total_results: data.total_results ?? 0,
            results,
        });

    } catch (err) {
        console.error('[advancedSearch]', err.message);
        return res.status(500).json({ error: 'Server error during advanced search.' });
    }
};
