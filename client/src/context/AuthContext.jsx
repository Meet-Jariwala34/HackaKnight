import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify authentication state on mount/refresh
  useEffect(() => {
    const verifyAuth = async () => {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('accessToken');

      if (savedUser && savedToken) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
        }
      } else {
        // Attempt silent refresh via HTTP-only cookie if available
        try {
          const res = await api.post('/auth/refresh-token');
          if (res.data.accessToken) {
            localStorage.setItem('accessToken', res.data.accessToken);
            if (res.data.user) {
              localStorage.setItem('user', JSON.stringify(res.data.user));
              setUser(res.data.user);
            }
          }
        } catch (err) {
          // No valid session found
          setUser(null);
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  // 1. SIGNUP
  const signup = async (userData) => {
    const res = await api.post('/auth/signup', userData);
    const { accessToken, user } = res.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  // 2. LOGIN
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, user } = res.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  // 3. DEMO LOGIN
  const demoLogin = async () => {
    const res = await api.post('/auth/demo-login');
    const { accessToken, user } = res.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  // 4. LOGOUT
  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  // 5. UPDATE USER IN STATE
  const updateUserState = (updatedFields) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signup,
        login,
        demoLogin,
        logout,
        updateUserState,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook to consume Auth Context easily
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};