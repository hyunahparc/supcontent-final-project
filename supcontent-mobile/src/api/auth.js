import { apiRequest } from './client';

export function login({ email, password }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register({ email, username, password }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
  });
}
