import axios from 'axios';

// Shared instance used by every API module (has the refresh-retry interceptor).
const api = axios.create({ baseURL: '/api' });

// Bare instance with NO interceptor, used only to call /auth/refresh, so a failed
// refresh never re-enters the interceptor and loops.
const bareApi = axios.create({ baseURL: '/api' });

// Holds the in-flight refresh so concurrent 401s share one refresh call.
let refreshPromise = null;

function clearSessionAndRedirect() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    if (window.location.pathname !== '/login') {
        window.location.assign('/login?session=expired');
    }
}

// Exchange the stored refresh token for a new access token (and a rotated refresh
// token). Returns the new access token, or rejects if refreshing is not possible.
function refreshAccessToken() {
    if (!refreshPromise) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return Promise.reject(new Error('No refresh token.'));

        refreshPromise = bareApi
            .post('/auth/refresh', { refreshToken })
            .then((res) => {
                const data = res.data;
                localStorage.setItem('token', data.token);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('user', JSON.stringify(data.user));
                return data.token;
            })
            .finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
}

// On 401 for an authenticated request: try to refresh once, then retry the request.
// If the refresh fails, clear the session and send the user to login.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        const isUnauthorized = error.response?.status === 401;
        const hadToken = Boolean(localStorage.getItem('token'));

        if (isUnauthorized && hadToken && original && !original._retried) {
            original._retried = true;
            try {
                const newToken = await refreshAccessToken();
                original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
                return api(original);
            } catch {
                clearSessionAndRedirect();
            }
        }

        return Promise.reject(error);
    }
);

export default api;
