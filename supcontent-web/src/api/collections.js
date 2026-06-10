import api from './client';

function authHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Fetch the current collection status for a media item.
export const getCollectionStatus = (externalId, mediaType = 'Movie') =>
    api.get(`/collections/${externalId}`, { params: { media_type: mediaType }, headers: authHeader() })
        .then(res => res.data.status)
        .catch(() => null);

// Add a film to the collection or update its status
export const upsertCollection = (externalId, mediaType = 'Movie', status) =>
    api.post('/collections', { external_id: externalId, media_type: mediaType, status }, { headers: authHeader() })
        .then(res => res.data);

// Remove a film from the collection
export const removeFromCollection = (externalId, mediaType = 'Movie') =>
    api.delete(`/collections/${externalId}`, { params: { media_type: mediaType }, headers: authHeader() })
        .then(res => res.data);

// Fetch a user's library, optionally filtered by status
export const getLibrary = (userId, status = null) => {
    const params = status ? { status } : {};
    return api.get(`/users/${userId}/collection`, { params, headers: authHeader() })
        .then(res => res.data);
};
