// Register.js
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function Register() {
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '', role: 'Lecturer' });
  const [error, setError] = useState('');
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const response = await register(formData);
    if (response.error) {
      setError(response.error);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">Register</h2>
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={handleSubmit}>
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
                    <option value="PL">Program Leader</option>
                    <option value="PRL">Principal Lecturer</option>
                    <option value="Lecturer">Lecturer</option>
                    <option value="Student">Student</option>
                  </select>
                  <div id="roleHelp" className="form-text">Select your role.</div>
                </div>
                <div className="mb-3">
                  <label htmlFor="fullName" className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    aria-describedby="fullNameHelp"
                  />
                  <div id="fullNameHelp" className="form-text">Enter your full name.</div>
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
                  <div id="emailHelp" className="form-text">Enter your email address.</div>
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
                    required
                    aria-describedby="passwordHelp"
                  />
                  <div id="passwordHelp" className="form-text">Password must be at least 8 characters with uppercase, lowercase, number, and special character.</div>
                </div>
                <div className="mb-3">
                  <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    className="form-control"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    aria-describedby="confirmPasswordHelp"
                  />
                  <div id="confirmPasswordHelp" className="form-text">Confirm your password.</div>
                </div>
                <button type="submit" className="btn btn-primary w-100 mb-3">
                  Register
                </button>
              </form>
              <div className="text-center">
                <p>
                  Already have an account? <Link to="/login" className="text-decoration-none">Login</Link>
                </p>
                <p>
                  <Link to="/" className="text-decoration-none">Back to Homepage</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;