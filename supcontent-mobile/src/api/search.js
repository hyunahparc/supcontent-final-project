import { apiRequest } from './client';

export function searchMedia(query, type = 'all', limit = 20, offset = 0) {
    if (!query || query.trim().length < 2) return Promise.resolve({ results: [], total: 0 });

    const params = new URLSearchParams({
        q: query.trim(),
        type,
        limit: String(limit),
        offset: String(offset),
    });

    return apiRequest(`/search?${params.toString()}`);
}

export function searchUsers(query, limit = 20) {
    if (!query || query.trim().length < 2) return Promise.resolve({ results: [], total: 0 });

    const params = new URLSearchParams({
        q: query.trim(),
        limit: String(limit),
    });

    return apiRequest(`/search/users?${params.toString()}`);
}

export function searchLists(query, limit = 20) {
    if (!query || query.trim().length < 2) return Promise.resolve({ results: [], total: 0 });

    const params = new URLSearchParams({
        q: query.trim(),
        limit: String(limit),
    });

    return apiRequest(`/search/lists?${params.toString()}`);
}

export function getGenres(type = 'movie') {
    const params = new URLSearchParams({ type });

    return apiRequest(`/search/genres?${params.toString()}`);
}

export function advancedSearch(params = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            query.set(key, String(value));
        }
    });

    return apiRequest(`/search/advanced?${query.toString()}`);
}
