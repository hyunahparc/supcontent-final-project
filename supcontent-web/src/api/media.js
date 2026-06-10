import { mediaPathFromType } from '../utils/media';
import api from './client';

export const getMediaById = (id, type = 'Movie') => (
  api.get(`/media/${mediaPathFromType(type)}/${id}`).then(res => res.data)
);

export async function getTrending(type = 'all', limit = 12) {
  const params = new URLSearchParams({ type, limit });
  const res = await fetch(`/api/media/trending?${params}`);
  if (!res.ok) throw new Error('Failed to load trending content.');
  return res.json();
}
