import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

function authHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getConversations = () =>
    api.get('/messages/conversations', { headers: authHeader() }).then(res => res.data);

export const getUnreadMessageCount = () =>
    api.get('/messages/unread-count', { headers: authHeader() }).then(res => res.data);

export const getMessagesWithUser = (userId) =>
    api.get(`/messages/${userId}`, { headers: authHeader() }).then(res => res.data);

export const sendMessage = (userId, content) =>
    api.post(`/messages/${userId}`, { content }, { headers: authHeader() }).then(res => res.data);
