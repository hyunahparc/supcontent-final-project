import api from './client';

function authHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getReports = (status = 'pending') =>
    api.get('/moderation/reports', { params: { status }, headers: authHeader() })
        .then(res => res.data);

export const updateReportStatus = (reportId, status) =>
    api.patch(`/moderation/reports/${reportId}`, { status }, { headers: authHeader() })
        .then(res => res.data);

export const deleteReportedReview = (reviewId) =>
    api.delete(`/moderation/reviews/${reviewId}`, { headers: authHeader() })
        .then(res => res.data);

export const banUser = (userId, banned) =>
    api.patch(`/moderation/users/${userId}/ban`, { banned }, { headers: authHeader() })
        .then(res => res.data);

export const highlightReview = (reviewId) =>
    api.post('/moderation/highlights', { review_id: reviewId }, { headers: authHeader() })
        .then(res => res.data);
