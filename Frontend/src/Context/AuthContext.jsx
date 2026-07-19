import { createContext, useContext, useState, useCallback } from 'react';
import { apiLogin, apiSignup } from '../Hooks/apiClient.js';

const AuthContext = createContext(null);

/**
 * Provides auth state (user_id, token) to the entire app.
 * Persists in localStorage so sessions survive page reloads.
 */
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const stored = localStorage.getItem('nilgen_auth');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    const session = { userId: data.user_id, token: data.token, email };
    localStorage.setItem('nilgen_auth', JSON.stringify(session));
    setAuth(session);
    return session;
  }, []);

  const signup = useCallback(async (email, password) => {
    const data = await apiSignup(email, password);
    const session = { userId: data.user_id, token: data.token, email };
    localStorage.setItem('nilgen_auth', JSON.stringify(session));
    setAuth(session);
    return session;
  }, []);

  const loginAsGuest = useCallback(() => {
    const id = `guest-${crypto.randomUUID()}`;
    const session = { userId: id, token: id, email: null, isGuest: true };
    localStorage.setItem('nilgen_auth', JSON.stringify(session));
    setAuth(session);
    return session;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('nilgen_auth');
    setAuth(null);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, signup, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
