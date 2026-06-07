import { apiRequest } from './client';

export function getNotifications(token) {
    return apiRequest('/notifications', { token });
}

export function getUnreadCount(token) {
    return apiRequest('/notifications/unread-count', { token });
}

export function markAllRead(token) {
    return apiRequest('/notifications/read-all', {
        method: 'PATCH',
        token,
    });
}

export function markOneRead(notificationId, token) {
    return apiRequest(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
        token,
    });
}
