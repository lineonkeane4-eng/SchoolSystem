// ProtectedRoute.js
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (Array.isArray(role) ? !role.includes(user.role) : user.role !== role) {
    return <Navigate to="/unauthorized" />;
  }
  return children;
};

export default ProtectedRoute;