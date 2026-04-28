// API client — follow/unfollow between users
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

function authHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export const followUser = (userId) =>
    api.post(`/follows/${userId}`, {}, { headers: authHeader() })
        .then(res => res.data);

export const unfollowUser = (userId) =>
    api.delete(`/follows/${userId}`, { headers: authHeader() })
        .then(res => res.data);

export const getFollowers = (userId) =>
    api.get(`/follows/${userId}/followers`)
        .then(res => res.data);

export const getFollowing = (userId) =>
    api.get(`/follows/${userId}/following`)
        .then(res => res.data);
