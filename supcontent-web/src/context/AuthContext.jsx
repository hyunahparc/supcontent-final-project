// Contexte d'authentification — gestion de la session utilisateur
import { createContext, useContext, useState } from 'react';
import { isTokenExpired } from '../utils/jwt';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const token = localStorage.getItem('token');
            // Drop an already-expired session on boot instead of showing the user
            // as logged in until the first 401 comes back.
            if (!token || isTokenExpired(token)) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                return null;
            }

            const stored = localStorage.getItem('user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    /** Stocke le token et les données utilisateur après connexion */
    function login(userData, token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    }

    /** Vide la session */
    function logout() {
        localStorage.removeItem('token');
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
