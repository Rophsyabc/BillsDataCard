import { createContext, useContext, useState, useCallback } from 'react';

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
  const [balance, setBalance] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('paybills_user'));
      return 0;
    } catch {
      return 0;
    }
  });
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('paybills_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('paybills_token') || '');

  const login = useCallback((userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('paybills_user', JSON.stringify(userData));
    localStorage.setItem('paybills_token', authToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken('');
    setBalance(0);
    localStorage.removeItem('paybills_user');
    localStorage.removeItem('paybills_token');
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('paybills_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshBalance = useCallback(async () => {
    const uid = getUserId();
    try {
      const authToken = localStorage.getItem('paybills_token');
      const res = await fetch(`${API_BASE}/api/wallet?userId=${uid}`, {
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success && data.data?.balance !== undefined) {
        setBalance(data.data.balance);
      }
    } catch {
      // ignore
    }
  }, []);

  const deductBalance = useCallback((amount) => {
    setBalance((prev) => prev - amount);
  }, []);

  const addBalance = useCallback((amount) => {
    setBalance((prev) => prev + amount);
  }, []);

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
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
