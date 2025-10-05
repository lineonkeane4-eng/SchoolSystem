// UserForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../Api';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', role: 'Student' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      const fetchUser = async () => {
        try {
          const token = localStorage.getItem('token');
          const data = await api.getUser(id, token);
          setFormData({ full_name: data.full_name, email: data.email, password: '', role: data.role });
        } catch (err) {
          setError('Failed to load user');
        }
      };
      fetchUser();
    }
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('token');
      const data = { full_name: formData.full_name, email: formData.email, role: formData.role };
      if (formData.password) data.password = formData.password;
      if (id) {
        await api.updateUser(id, data, token);
      } else {
        await api.createUser('/admin/users', data, token); // Updated endpoint
      }
      navigate('/admin/users');
    } catch (err) {
      setError(err.message || 'Failed to save user');
    }
  };

  return (
    <div className="container mt-5">
      <Link to="/admin/users" className="btn btn-secondary mb-3">
        <i className="bi bi-arrow-left"></i> Back
      </Link>
      <h2 className="mb-4">{id ? 'Edit User' : 'Add User'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="full_name" className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                aria-describedby="fullNameHelp"
              />
              <div id="fullNameHelp" className="form-text">Enter the full name.</div>
            </div>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                aria-describedby="emailHelp"
              />
              <div id="emailHelp" className="form-text">Enter a valid email address.</div>
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required={!id}
                aria-describedby="passwordHelp"
              />
              <div id="passwordHelp" className="form-text">{id ? 'Leave blank to keep existing password.' : 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.'}</div>
            </div>
            <div className="mb-3">
              <label htmlFor="role" className="form-label">Role</label>
              <select
                className="form-select"
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                aria-describedby="roleHelp"
              >
                <option value="PL">PL</option>
                <option value="Lecturer">Lecturer</option>
                <option value="Student">Student</option>
              </select>
              <div id="roleHelp" className="form-text">Select the user role.</div>
            </div>
            <button type="submit" className="btn btn-primary me-2">
              <i className="bi bi-save"></i> Save
            </button>
            <Link to="/admin/users" className="btn btn-secondary">
              <i className="bi bi-x-lg"></i> Cancel
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}

export default UserForm;