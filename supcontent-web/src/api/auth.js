import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const register = (data) => api.post('/auth/register', data).then(res => res.data);
export const login = (data) => api.post('/auth/login', data).then(res => res.data);