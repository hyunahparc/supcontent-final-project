import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

function authHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Fetch the current collection status for a film (called when FilmDetailPage loads)
export const getCollectionStatus = (externalId) =>
    api.get(`/collections/${externalId}`, { headers: authHeader() })
        .then(res => res.data.status)
        .catch(() => null);

// Add a film to the collection or update its status
export const upsertCollection = (externalId, status) =>
    api.post('/collections', { external_id: externalId, status }, { headers: authHeader() })
        .then(res => res.data);

// Remove a film from the collection
export const removeFromCollection = (externalId) =>
    api.delete(`/collections/${externalId}`, { headers: authHeader() })
        .then(res => res.data);

// Fetch a user's library, optionally filtered by status
export const getLibrary = (userId, status = null) => {
    const params = status ? { status } : {};
    return api.get(`/users/${userId}/collection`, { params, headers: authHeader() })
        .then(res => res.data);
};
