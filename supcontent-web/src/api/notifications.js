import api from './client';

function authHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getNotifications = () =>
    api.get('/notifications', { headers: authHeader() }).then(res => res.data);

export const getUnreadCount = () =>
    api.get('/notifications/unread-count', { headers: authHeader() }).then(res => res.data);

export const markAllRead = () =>
    api.patch('/notifications/read-all', {}, { headers: authHeader() }).then(res => res.data);

export const markOneRead = (id) =>
    api.patch(`/notifications/${id}/read`, {}, { headers: authHeader() }).then(res => res.data);
