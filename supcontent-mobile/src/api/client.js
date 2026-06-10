// Centralized API client for the mobile app
// provides functions to construct API URLs and make requests to the backend server.

export const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Callback fired when an authenticated request is rejected with 401.
// The auth layer registers it to clear the stored session and redirect to login.
let onUnauthorized = null;
// Guards against firing the handler repeatedly when several authenticated
// requests (e.g. the unread-count pollers) all get a 401 at once.
let isHandlingUnauthorized = false;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
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
    // An authenticated request rejected with 401 means the token is expired or
    // invalid. Notify the auth layer once so it can sign the user out.
    if (response.status === 401 && token && onUnauthorized && !isHandlingUnauthorized) {
      isHandlingUnauthorized = true;
      Promise.resolve(onUnauthorized()).finally(() => {
        isHandlingUnauthorized = false;
      });
    }

    const message = data?.message || data?.error || 'Request failed.';
    throw new Error(message);
  }

  return data;
}
