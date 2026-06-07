import { apiRequest } from './client';

export function getConversations(token) {
    return apiRequest('/messages/conversations', { token });
}

export function getUnreadMessageCount(token) {
    return apiRequest('/messages/unread-count', { token });
}

export function getMessagesWithUser(userId, token) {
    return apiRequest(`/messages/${userId}`, { token });
}

export function sendMessage(userId, content, token) {
    return apiRequest(`/messages/${userId}`, {
        method: 'POST',
        token,
        body: JSON.stringify({ content }),
    });
}
