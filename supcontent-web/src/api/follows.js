// API client — follow/unfollow between users
import api from './client';

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
