// client/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create the context
export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for token on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
      // We will no longer set a global header here
    }
    setLoading(false);
  }, []);

  // Login function to set token and user data
  const login = (userData, userToken) => {
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
    setIsLoggedIn(true);
    // We will no longer set a global header here
  };

  // Logout function to clear token and state
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
  };

  // Create an axios instance for authenticated requests
  const authAxios = axios.create({
    baseURL: 'http://localhost:5001',
    headers: {
      'x-auth-token': token,
    },
  });

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, token, loading, login, logout, authAxios }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;