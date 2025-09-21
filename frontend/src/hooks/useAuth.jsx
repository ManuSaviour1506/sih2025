import { useState, useEffect, useContext, createContext } from 'react';
import axios from 'axios';

const authAxios = axios.create();
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      // ✅ Set the token on the authAxios instance immediately
      authAxios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      setIsLoggedIn(true);
      try {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        setUser(storedUser);
      } catch (e) {
        console.error('Failed to parse user from local storage:', e);
        localStorage.removeItem('user');
      }
    }

    const interceptor = authAxios.interceptors.request.use(
      (config) => {
        const tokenFromStorage = localStorage.getItem('token');
        if (tokenFromStorage) {
          config.headers.Authorization = `Bearer ${tokenFromStorage}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    return () => {
      authAxios.interceptors.request.eject(interceptor);
    };
  }, []);

  const login = (jwtToken, userData) => {
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(userData));
    // ✅ Set the token on authAxios immediately after login
    authAxios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
    setUser(userData);
    setIsLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // ✅ Remove the token from authAxios on logout
    delete authAxios.defaults.headers.common['Authorization'];
    setUser(null);
    setIsLoggedIn(false);
  };

  const value = {
    isLoggedIn,
    user,
    login,
    logout,
    authAxios
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;