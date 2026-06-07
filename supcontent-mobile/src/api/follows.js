import { apiRequest } from './client';

export function followUser(userId, token) {
  return apiRequest(`/follows/${userId}`, {
    method: 'POST',
    token,
  });
}

export function unfollowUser(userId, token) {
  return apiRequest(`/follows/${userId}`, {
    method: 'DELETE',
    token,
  });
}

export function getFollowers(userId) {
  return apiRequest(`/follows/${userId}/followers`);
}

export function getFollowing(userId) {
  return apiRequest(`/follows/${userId}/following`);
}
