import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getFilmById = (id) => api.get(`/films/${id}`).then(res => res.data);
