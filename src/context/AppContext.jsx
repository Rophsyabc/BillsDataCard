import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const AppContext = createContext();
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('paybills_user'));
    return user?.id || 'default';
  } catch {
    return 'default';
  }
}

export function AppProvider({ children }) {
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('paybills_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('paybills_token') || '');
  const refreshTokenRef = useRef(localStorage.getItem('paybills_refresh_token') || '');
  const refreshingRef = useRef(null);


  const login = useCallback((userData, authToken, refresh) => {
    setUser(userData);
    setToken(authToken);
    refreshTokenRef.current = refresh || '';
    localStorage.setItem('paybills_user', JSON.stringify(userData));
    localStorage.setItem('paybills_token', authToken);
    if (refresh) localStorage.setItem('paybills_refresh_token', refresh);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken('');
    setBalance(0);
    refreshTokenRef.current = '';
    localStorage.removeItem('paybills_user');
    localStorage.removeItem('paybills_token');
    localStorage.removeItem('paybills_refresh_token');
  }, []);

  const tryRefreshToken = useCallback(async () => {
    if (refreshingRef.current) return refreshingRef.current;

    refreshingRef.current = (async () => {
      try {
        const rt = refreshTokenRef.current;
        if (!rt) { logout(); return null; }

        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
        });
        const data = await res.json();

        if (data.success && data.data?.token) {
          setToken(data.data.token);
          refreshTokenRef.current = data.data.refreshToken || rt;
          localStorage.setItem('paybills_token', data.data.token);
          if (data.data.refreshToken) localStorage.setItem('paybills_refresh_token', data.data.refreshToken);
          // Sync user role/status from refresh response
          if (data.data.user) {
            setUser(prev => {
              const updated = { ...prev, ...data.data.user };
              localStorage.setItem('paybills_user', JSON.stringify(updated));
              return updated;
            });
          }
          return data.data.token;
        }

        logout();
        return null;
      } catch {
        logout();
        return null;
      } finally {
        refreshingRef.current = null;
      }
    })();

    return refreshingRef.current;
  }, [logout]);

  const authFetch = useCallback(async (path, options = {}) => {
    const makeRequest = async (authToken) => {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...options.headers,
        },
      });
      return res;
    };

    let authToken = localStorage.getItem('paybills_token');
    let res = await makeRequest(authToken);

    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      if (data.message === 'Invalid or expired token' || data.message === 'Authentication required') {
        const newToken = await tryRefreshToken();
        if (newToken) {
          res = await makeRequest(newToken);
        }
      }
    }

    return res;
  }, [tryRefreshToken]);

  const refreshBalance = useCallback(async () => {
    const uid = getUserId();
    try {
      const res = await authFetch(`/api/wallet?userId=${uid}`);
      const data = await res.json();
      if (data.success && data.data?.balance !== undefined) {
        setBalance(data.data.balance);
      }
    } catch {
      // ignore
    }
  }, [authFetch]);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('paybills_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deductBalance = useCallback((amount) => {
    setBalance((prev) => prev - amount);
  }, []);

  const addBalance = useCallback((amount) => {
    setBalance((prev) => prev + amount);
  }, []);

  // Sync fresh user data (role, status) from server on app mount
  useEffect(() => {
    const storedToken = localStorage.getItem('paybills_token');
    if (!storedToken) return;

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setUser((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, ...data.data };
            localStorage.setItem('paybills_user', JSON.stringify(updated));
            return updated;
          });
          if (data.data.balance !== undefined) {
            setBalance(data.data.balance);
          }
        }
      })
      .catch(() => {/* ignore network errors on startup */});
  }, []); // run once on mount

  return (
    <AppContext.Provider value={{
      balance,
      user,
      token,
      login,
      logout,
      updateUser,
      refreshBalance,
      deductBalance,
      addBalance,
      authFetch,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
