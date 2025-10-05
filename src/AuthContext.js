// AuthContext.js
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const role = localStorage.getItem('role');
      const fullName = localStorage.getItem('fullName');
      setUser({ token, role, fullName });
    }
    setLoading(false);
  }, []);

  const login = async (email, password, role) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.token) {
        if (data.role && data.role !== role) {
          return { error: 'Role mismatch, please select the correct role' };
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('fullName', data.fullName); // Changed from data.full_name to data.fullName
        setUser({ token: data.token, role: data.role, fullName: data.fullName }); // Changed from data.full_name to data.fullName
        return data;
      }
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Login failed' };
    }
  };

  const register = async (data) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      return result.message === 'Registration successful, please log in' ? result : { error: result.error || 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { error: 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};