// Contexte d'authentification — gestion de la session utilisateur
import { createContext, useContext, useState } from 'react';
import { logout as logoutApi } from '../api/auth';
import { isTokenExpired } from '../utils/jwt';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const token = localStorage.getItem('token');
            const refreshToken = localStorage.getItem('refreshToken');
            const stored = localStorage.getItem('user');

            // Restore the session only if we can still authenticate: the access
            // token is still valid, or we hold a refresh token to renew it (the
            // API client refreshes lazily on the first request).
            const canRestore = stored && (refreshToken || (token && !isTokenExpired(token)));
            if (!canRestore) {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                return null;
            }

            return JSON.parse(stored);
        } catch {
            return null;
        }
    });

    /** Stocke les tokens et les données utilisateur après connexion */
    function login(userData, token, refreshToken) {
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    }

    /** Vide la session (révoque le refresh token côté serveur en arrière-plan) */
    function logout() {
        const refreshToken = localStorage.getItem('refreshToken');
        // Revoke server-side in the background; don't block the UI on it.
        logoutApi(refreshToken).catch(() => {});
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
    }

    /**
     * Met à jour les données utilisateur en mémoire ET dans le localStorage
     * après une modification de profil (username, bio, avatar).
     * @param {Partial<typeof user>} updates — champs à fusionner
     */
    function updateUser(updates) {
        setUser(prev => {
            const updated = { ...prev, ...updates };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
