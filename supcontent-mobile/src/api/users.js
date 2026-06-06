import { apiRequest } from './client';

export function getUserProfile(userId, token) {
  return apiRequest(`/users/${userId}/profile`, { token });
}
