import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  login as loginRequest,
  logout as logoutRequest,
  refreshSession as refreshRequest,
  register as registerRequest,
} from '../api/auth';
import { setRefreshHandler } from '../api/client';
import { isTokenExpired } from '../utils/jwt';

const AuthContext = createContext(null);
const TOKEN_KEY = 'supcontent.auth.token';
const REFRESH_TOKEN_KEY = 'supcontent.auth.refreshToken';
const USER_KEY = 'supcontent.auth.user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      try {
        const [storedToken, storedRefresh, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);

        // Restore if we can still authenticate: access token valid, or a refresh
        // token is present to renew it (the API client refreshes on first 401).
        const canRestore = storedUser && (storedRefresh || (storedToken && !isTokenExpired(storedToken)));
        if (canRestore) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else if (storedToken || storedRefresh || storedUser) {
          // Stale/expired session left in secure storage → clear it on boot.
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

  // Refresh the access token when an authenticated request gets 401.
  // On failure, clear the session and send the user to login.
  useEffect(() => {
    setRefreshHandler(async () => {
      const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (storedRefresh) {
        try {
          const data = await refreshRequest(storedRefresh);
          await storeSession(data.user, data.token, data.refreshToken);
          return data.token;
        } catch {
          // fall through to sign-out
        }
      }

      setUser(null);
      setToken(null);
      await clearStoredSession();
      router.replace('/login');
      throw new Error('Session expired.');
    });

    return () => setRefreshHandler(null);
  }, []);

  async function signIn({ email, password }) {
    const data = await loginRequest({ email, password });

    await storeSession(data.user, data.token, data.refreshToken);

    return data.user;
  }

  async function completeOAuth(userData, authToken, refreshToken) {
    await storeSession(userData, authToken, refreshToken);

    return userData;
  }

  async function storeSession(userData, accessToken, refreshToken) {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData)),
    ]);
    setUser(userData);
    setToken(accessToken);
  }

  async function signUp({ email, username, password }) {
    return registerRequest({ email, username, password });
  }

  async function signOut() {
    const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    // Revoke server-side in the background; don't block the UI on it.
    logoutRequest(storedRefresh).catch(() => {});
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
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
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
