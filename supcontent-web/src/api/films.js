import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getFilmById = (id) => api.get(`/films/${id}`).then(res => res.data);

export async function getTrending(type = 'all', limit = 12) {
  const key = import.meta.env.VITE_TMDB_API_KEY;
  const url = `https://api.themoviedb.org/3/trending/all/week?api_key=${key}&language=fr-FR`;
  const res  = await fetch(url);
  const data = await res.json();

  let results = data.results ?? [];

  if (type === 'Movie')  results = results.filter(r => r.media_type === 'movie');
  if (type === 'Series') results = results.filter(r => r.media_type === 'tv');

  return results.slice(0, limit).map(r => ({
    external_id:  r.id,
    title:        r.title ?? r.name,
    poster_path:  r.poster_path,
    media_type:   r.media_type === 'tv' ? 'Series' : 'Movie',
    release_date: r.release_date ?? r.first_air_date,
    vote_average: r.vote_average,
  }));
}
