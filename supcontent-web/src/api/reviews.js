import api from './client';

function authHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Get all reviews for a film (public, liked_by_me resolved if logged in)
export const getReviews = (externalId, mediaType = 'Movie') =>
    api.get(`/reviews/${externalId}`, { params: { media_type: mediaType }, headers: authHeader() })
        .then(res => res.data);

// Get the current user's own review for a film
export const getMyReview = (externalId, mediaType = 'Movie') =>
    api.get(`/reviews/${externalId}/my`, { params: { media_type: mediaType }, headers: authHeader() })
        .then(res => res.data)
        .catch(() => null);

// Create or update own review
export const upsertReview = (externalId, mediaType = 'Movie', rating, comment) =>
    api.post('/reviews', { external_id: externalId, media_type: mediaType, rating, comment }, { headers: authHeader() })
        .then(res => res.data);

// Delete own review
export const deleteReview = (reviewId) =>
    api.delete(`/reviews/${reviewId}`, { headers: authHeader() })
        .then(res => res.data);

// Toggle like on a review
export const toggleLike = (reviewId) =>
    api.post(`/reviews/${reviewId}/like`, {}, { headers: authHeader() })
        .then(res => res.data);

// Get comments on a review
export const getComments = (reviewId) =>
    api.get(`/reviews/${reviewId}/comments`)
        .then(res => res.data);

// Add a comment to a review
export const addComment = (reviewId, content) =>
    api.post(`/reviews/${reviewId}/comments`, { content }, { headers: authHeader() })
        .then(res => res.data);

// Delete own comment
export const deleteComment = (reviewId, commentId) =>
    api.delete(`/reviews/${reviewId}/comments/${commentId}`, { headers: authHeader() })
        .then(res => res.data);
