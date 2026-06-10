import api from './client';

function authHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getFeed = (limit = 20, offset = 0) =>
    api.get('/feed', {
        params: { limit, offset },
        headers: authHeader(),
    }).then(res => res.data);
