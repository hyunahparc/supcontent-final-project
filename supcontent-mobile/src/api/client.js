// Centralized API client for the mobile app
// provides functions to construct API URLs and make requests to the backend server.

export const API_URL = process.env.EXPO_PUBLIC_API_URL;

// The auth layer registers this. It refreshes the access token and returns the
// new one, or throws (after signing out) if refreshing is not possible.
let refreshHandler = null;
// Single-flight: concurrent 401s share one refresh call.
let refreshPromise = null;

export function setRefreshHandler(handler) {
  refreshHandler = handler;
}

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

// Build and send one fetch with the given access token.
function sendRequest(path, token, headers, fetchOptions) {
  const isFormData = fetchOptions.body instanceof FormData;

  return fetch(buildUrl(path), {
    ...fetchOptions,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
}

export async function apiRequest(path, options = {}) {
  const { token, headers, ...fetchOptions } = options;

  let response = await sendRequest(path, token, headers, fetchOptions);

  // On 401 for an authenticated request: refresh the access token once, then
  // replay the request with the new token. A retried request that 401s again
  // simply falls through to the error below (no loop).
  if (response.status === 401 && token && refreshHandler) {
    try {
      if (!refreshPromise) {
        refreshPromise = Promise.resolve(refreshHandler())
          .finally(() => { refreshPromise = null; });
      }
      const newToken = await refreshPromise;
      response = await sendRequest(path, newToken, headers, fetchOptions);
    } catch {
      // Refresh failed; the handler has already signed the user out.
    }
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    const message = data?.message || data?.error || 'Request failed.';
    throw new Error(message);
  }

  return data;
}
