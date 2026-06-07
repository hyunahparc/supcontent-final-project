import { apiRequest } from './client';

export function getFeed(token, limit = 20, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest(`/feed?${params.toString()}`, { token });
}
