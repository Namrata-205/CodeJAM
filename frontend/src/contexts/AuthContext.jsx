import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi, getToken, setToken, clearToken } from '../api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, if a token exists re-fetch the user profile to confirm it's valid
  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    authApi.me()
      .then(setUser)
      .catch(() => clearToken())   // token expired / invalid
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { access_token } = await authApi.login(email, password);
    setToken(access_token);
    const me = await authApi.me();
    setUser(me);
    return me;
  };

  const register = async (email, password) => {
    await authApi.register(email, password);
    // Auto-login after registration
    return login(email, password);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};