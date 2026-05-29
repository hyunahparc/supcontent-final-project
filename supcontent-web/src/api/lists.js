import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

function authHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Fetch the current user's lists
export const getMyLists = () =>
    api.get('/lists', { headers: authHeader() }).then(res => res.data);

// Fetch a single list with its media items (works for public lists too)
export const getListById = (listId) =>
    api.get(`/lists/${listId}`, { headers: authHeader() }).then(res => res.data);

// Create a new custom list
export const createList = (name, isPublic = false) =>
    api.post('/lists', { name, is_public: isPublic }, { headers: authHeader() }).then(res => res.data);

// Update list name or visibility
export const updateList = (listId, name, isPublic) =>
    api.put(`/lists/${listId}`, { name, is_public: isPublic }, { headers: authHeader() }).then(res => res.data);

// Delete a list
export const deleteList = (listId) =>
    api.delete(`/lists/${listId}`, { headers: authHeader() }).then(res => res.data);

// Add a media item to a list
export const addMediaToList = (listId, externalId, mediaType = 'Movie') =>
    api.post(`/lists/${listId}/media`, { external_id: externalId, media_type: mediaType }, { headers: authHeader() }).then(res => res.data);

// Remove a media item from a list
export const removeMediaFromList = (listId, externalId, mediaType = 'Movie') =>
    api.delete(`/lists/${listId}/media/${externalId}`, { params: { media_type: mediaType }, headers: authHeader() }).then(res => res.data);

// Fetch another user's public lists
export const getUserPublicLists = (userId) =>
    api.get(`/users/${userId}/lists`).then(res => res.data);
