import axios from 'axios';

// En dev, Vite proxie /api → localhost:3000 (vite.config.js)
// En prod, définir VITE_API_URL dans .env
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Injecte le JWT dans chaque requête
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalise les erreurs + gère le 401
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message ?? error.message ?? 'Erreur réseau';

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:logout'));
    }

    const err = new Error(message);
    err.status = status;
    return Promise.reject(err);
  }
);

export default client;