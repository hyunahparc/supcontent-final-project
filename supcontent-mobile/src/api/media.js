import { apiRequest } from './client';

export function getTrending(type = 'all', limit = 12) {
  const params = new URLSearchParams({ type, limit: String(limit) });

  return apiRequest(`/media/trending?${params.toString()}`);
}
