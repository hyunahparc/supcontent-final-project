// API front-end — opérations sur le profil utilisateur
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

/** Retourne l'en-tête d'autorisation Bearer si un token est présent */
function authHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Récupère le profil public d'un utilisateur.
 * @param {number|string} userId
 */
export const getUserProfile = (userId) =>
    api.get(`/users/${userId}/profile`)
        .then(res => res.data);

/**
 * Récupère les statistiques de collection d'un utilisateur.
 * @param {number|string} userId
 * @returns {Promise<Record<string,number>>}  ex: { "Terminé": 12, "À voir": 5 }
 */
export const getUserStats = (userId) =>
    api.get(`/users/${userId}/stats`)
        .then(res => res.data);

/**
 * Met à jour le username et/ou la bio de l'utilisateur connecté.
 * @param {{ username?: string, bio?: string }} data
 */
export const updateMyProfile = (data) =>
    api.put('/users/me/profile', data, { headers: authHeader() })
        .then(res => res.data);

/**
 * Upload une nouvelle photo de profil.
 * @param {File} file  — objet File issu d'un <input type="file">
 */
export const uploadAvatar = (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/users/me/avatar', formData, {
        headers: {
            ...authHeader(),
            'Content-Type': 'multipart/form-data',
        },
    }).then(res => res.data);
};

/**
 * Supprime le compte de l'utilisateur connecté (RGPD).
 */
export const deleteMyAccount = () =>
    api.delete('/users/me', { headers: authHeader() })
        .then(res => res.data);
