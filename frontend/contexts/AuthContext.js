import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('cn_token');
      const savedUser = localStorage.getItem('cn_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          const { data } = await authApi.getMe();
          setUser(data.user);
          localStorage.setItem('cn_user', JSON.stringify(data.user));
        } catch (err) {
  if (err.response?.status === 401) {
    localStorage.removeItem('cn_token');
    localStorage.removeItem('cn_user');
    setUser(null);
  }
}
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('cn_token', data.token);
    localStorage.setItem('cn_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('cn_token');
    localStorage.removeItem('cn_user');
    setUser(null);
    window.location.href = '/login';
  };

  const isAdmin = user?.role === 'ADMIN';
  const isClient = user?.role === 'CLIENT';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isClient }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
