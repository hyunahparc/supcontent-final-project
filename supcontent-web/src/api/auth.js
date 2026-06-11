import api from './client';

const oauthCodeExchanges = new Map();

export const register = (data) => api.post('/auth/register', data).then(res => res.data);
export const login = (data) => api.post('/auth/login', data).then(res => res.data);

export const exchangeOAuthCode = (code) => {
    if (oauthCodeExchanges.has(code)) {
        return oauthCodeExchanges.get(code);
    }

    const exchangePromise = api
        .post('/auth/oauth/exchange', { code })
        .then(res => res.data)
        .catch((err) => {
            oauthCodeExchanges.delete(code);
            throw err;
        });

    oauthCodeExchanges.set(code, exchangePromise);
    return exchangePromise;
};

// Revoke the refresh token server-side (true logout).
export const logout = (refreshToken) =>
    api.post('/auth/logout', { refreshToken }).then(res => res.data);
