import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginRequest, register as registerRequest } from '../api/auth';

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

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {
        await clearStoredSession();
      } finally {
        setIsAuthReady(true);
      }
    }

    restoreSession();
  }, []);

  async function signIn({ email, password }) {
    const data = await loginRequest({ email, password });

    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, data.token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user)),
    ]);
    setUser(data.user);
    setToken(data.token);

    return data.user;
  }

  async function signUp({ email, username, password }) {
    return registerRequest({ email, username, password });
  }

  async function signOut() {
    setUser(null);
    setToken(null);
    await clearStoredSession();
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthReady,
      isAuthenticated: Boolean(token && user),
      signIn,
      signUp,
      signOut,
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
