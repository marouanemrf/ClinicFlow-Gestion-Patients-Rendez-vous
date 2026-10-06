import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '../services/authApi';
import { setUnauthorizedHandler } from '../services/http';
import { tokenStorage } from '../utils/tokenStorage';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (tokenStorage.get() ? 'loading' : 'anonymous'));

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const login = useCallback(async (credentials) => {
    const { token, user: loggedUser } = await authApi.login(credentials);
    tokenStorage.set(token);
    setUser(loggedUser);
    setStatus('authenticated');
    return loggedUser;
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (tokenStorage.get()) toast.error('Your session has expired. Please log in again.', { id: 'session-expired' });
      logout();
    });
  }, [logout]);

  // Restore the session after a page refresh.
  useEffect(() => {
    if (!tokenStorage.get()) return;
    let cancelled = false;
    authApi
      .me()
      .then((currentUser) => {
        if (cancelled) return;
        setUser(currentUser);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) logout();
      });
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const value = useMemo(
    () => ({ user, status, isAdmin: user?.role === 'admin', login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
