import { apiRequest } from './client';

export function getMyLists(token) {
  return apiRequest('/lists', { token });
}
