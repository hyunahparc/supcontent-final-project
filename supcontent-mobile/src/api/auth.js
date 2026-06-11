import { apiRequest } from './client';

const oauthCodeExchanges = new Map();

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

export function exchangeOAuthCode(code) {
  if (oauthCodeExchanges.has(code)) {
    return oauthCodeExchanges.get(code);
  }

  const exchangePromise = apiRequest('/auth/oauth/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  }).catch((err) => {
    oauthCodeExchanges.delete(code);
    throw err;
  });

  oauthCodeExchanges.set(code, exchangePromise);
  return exchangePromise;
}

// Exchange a refresh token for a new access token (and a rotated refresh token).
// No `token` option: identity is proven by the refresh token in the body.
export function refreshSession(refreshToken) {
  return apiRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

// Revoke the refresh token server-side (true logout).
export function logout(refreshToken) {
  return apiRequest('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}
