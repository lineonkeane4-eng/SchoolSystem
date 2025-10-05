// UserList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../Api';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function UserList() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const data = await api.getUsers('/admin/users', token); // Updated endpoint
        setUsers(data);
      } catch (err) {
        setError('Failed to load users');
      }
    };
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const token = localStorage.getItem('token');
        await api.deleteUser(id, token);
        setUsers(users.filter(user => user.id !== id));
      } catch (err) {
        setError('Failed to delete user');
      }
    }
  };

  return (
    <div className="container mt-5">
      <Link to="/admin/dashboard" className="btn btn-secondary mb-3">
        <i className="bi bi-arrow-left"></i> Back
      </Link>
      <h2 className="mb-4">Manage Users</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="d-flex justify-content-end mb-3">
        <Link to="/admin/users/new" className="btn btn-primary">
          <i className="bi bi-plus-lg"></i> Add User
        </Link>
      </div>
      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <Link to={`/admin/users/edit/${user.id}`} className="btn btn-sm btn-warning me-2">
                    <i className="bi bi-pencil"></i>
                  </Link>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(user.id)}
                    aria-label={`Delete user ${user.full_name}`}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserList;