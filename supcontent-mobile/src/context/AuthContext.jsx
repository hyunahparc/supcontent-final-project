import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginRequest, register as registerRequest } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { isTokenExpired } from '../utils/jwt';

const AuthContext = createContext(null);
const TOKEN_KEY = 'supcontent.auth.token';
const USER_KEY = 'supcontent.auth.user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);

        if (storedToken && storedUser && !isTokenExpired(storedToken)) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else if (storedToken || storedUser) {
          // Stale or expired session left in secure storage → clear it on boot.
          await clearStoredSession();
        }
      } catch {
        await clearStoredSession();
      } finally {
        setIsAuthReady(true);
      }
    }

    restoreSession();
  }, []);

  // Auto sign-out when any authenticated request comes back 401 (expired/invalid token).
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      setUser(null);
      setToken(null);
      await clearStoredSession();
      router.replace('/login');
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  async function signIn({ email, password }) {
    const data = await loginRequest({ email, password });

    await storeSession(data.user, data.token);

    return data.user;
  }

  async function completeOAuth(userData, authToken) {
    await storeSession(userData, authToken);

    return userData;
  }

  async function storeSession(userData, authToken) {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, authToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData)),
    ]);
    setUser(userData);
    setToken(authToken);
  }

  async function signUp({ email, username, password }) {
    return registerRequest({ email, username, password });
  }

  async function signOut() {
    setUser(null);
    setToken(null);
    await clearStoredSession();
  }

  async function updateUser(updates) {
    if (!user) return null;

    const nextUser = { ...user, ...updates };

    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);

    return nextUser;
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthReady,
      isAuthenticated: Boolean(token && user),
      signIn,
      signUp,
      completeOAuth,
      signOut,
      updateUser,
    }),
    [user, token, isAuthReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function clearStoredSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
