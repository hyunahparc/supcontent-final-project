import axios from 'axios';

// Shared axios instance used by every API module.
// to expired/invalid tokens consistently across the whole app.
const api = axios.create({ baseURL: '/api' });

// Auto-logout on an expired or invalid session.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isUnauthorized = error.response?.status === 401;
        const hadToken = Boolean(localStorage.getItem('token'));

        if (isUnauthorized && hadToken) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Avoid a redirect loop if the failing request came from the login page itself.
            if (window.location.pathname !== '/login') {
                window.location.assign('/login?session=expired');
            }
        }

        return Promise.reject(error);
    }
);

export default api;
