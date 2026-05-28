import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getFilmById = (id) => api.get(`/films/${id}`).then(res => res.data);

export async function getTrending(type = 'all', limit = 12) {
  const params = new URLSearchParams({ type, limit });
  const res = await fetch(`/api/films/trending?${params}`);
  if (!res.ok) throw new Error('Failed to load trending content.');
  return res.json();
}
