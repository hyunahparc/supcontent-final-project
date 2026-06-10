// Centralized API client for the mobile app
// This module provides functions to construct API URLs and make requests to the backend server.
// It uses the EXPO_PUBLIC_API_URL environment variable to determine the base URL for API requests.
// The apiRequest function handles making fetch requests, including setting headers and parsing responses.

export const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function getApiUrl(path) {
  return buildUrl(path);
}

function buildUrl(path) {
  if (!API_URL) {
    throw new Error('Missing EXPO_PUBLIC_API_URL. Add it to supcontent-mobile/.env.');
  }

  const normalizedBase = API_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest(path, options = {}) {
  const { token, headers, ...fetchOptions } = options;
  const isFormData = fetchOptions.body instanceof FormData;

  const response = await fetch(buildUrl(path), {
    ...fetchOptions,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const message = data?.message || data?.error || 'Request failed.';
    throw new Error(message);
  }

  return data;
}
