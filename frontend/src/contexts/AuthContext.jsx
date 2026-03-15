import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('codejam_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    // Simulate login - in production, this would be an API call
    const mockUser = {
      id: '1',
      name: 'Jane Developer',
      email: email,
      projectCount: 5
    };
    
    localStorage.setItem('codejam_user', JSON.stringify(mockUser));
    setUser(mockUser);
    return { success: true };
  };

  const register = (email, password) => {
    // Simulate registration
    const mockUser = {
      id: Date.now().toString(),
      name: email.split('@')[0],
      email: email,
      projectCount: 0
    };
    
    localStorage.setItem('codejam_user', JSON.stringify(mockUser));
    setUser(mockUser);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('codejam_user');
    setUser(null);
  };

  const updateProfile = (updates) => {
    const updatedUser = { ...user, ...updates };
    localStorage.setItem('codejam_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
