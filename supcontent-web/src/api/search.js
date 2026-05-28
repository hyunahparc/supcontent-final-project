// src/api/search.js
// API functions for quick and advanced search

/**
 * Quick search (used by the header SearchBar)
 * Merges local cache and TMDB results.
 */
export async function searchMedia(query, type = 'all', limit = 10, offset = 0) {
    if (!query || query.trim().length < 2) return [];
    const params = new URLSearchParams({ q: query.trim(), type, limit, offset });
    const res = await fetch(`/api/search?${params}`);
    const data = await res.json();
    return data.results ?? [];
}

/**
 * Search platform users by username.
 */
export async function searchUsers(q, limit = 20) {
    if (!q || q.trim().length < 2) return { results: [], total: 0 };
    const params = new URLSearchParams({ q: q.trim(), limit });
    const res = await fetch(`/api/search/users?${params}`);
    if (!res.ok) return { results: [], total: 0 };
    return res.json();
}

/**
 * Search public custom lists by name.
 */
export async function searchLists(q, limit = 20) {
    if (!q || q.trim().length < 2) return { results: [], total: 0 };
    const params = new URLSearchParams({ q: q.trim(), limit });
    const res = await fetch(`/api/search/lists?${params}`);
    if (!res.ok) return { results: [], total: 0 };
    return res.json();
}

/**
 * Fetch the TMDB genres list for a given media type.
 * @param {'movie'|'tv'} type
 * @returns {Promise<Array<{id: number, name: string}>>}
 */
export async function getGenres(type = 'movie') {
    const res = await fetch(`/api/search/genres?type=${type}`);
    if (!res.ok) return [];
    return res.json();
}

/**
 * Advanced search with multiple filters.
 * Uses /discover (without text) or /search (with text) server-side.
 *
 * @param {Object} params
 * @param {string}  params.q          - Search text (optional)
 * @param {string}  params.type       - 'movie' or 'tv'
 * @param {string}  params.year       - Release year
 * @param {string}  params.genre      - TMDB genre ID
 * @param {string}  params.sort       - Sort criterion
 * @param {string}  params.min_rating - Minimum TMDB rating (0-10)
 * @param {number}  params.page       - Page number
 * @returns {Promise<{results, total_pages, total_results, page, type, query}>}
 */
export async function advancedSearch(params) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') {
            query.set(k, v);
        }
    });

    const res = await fetch(`/api/search/advanced?${query}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error while performing advanced search.');
    }
    return res.json();
}
