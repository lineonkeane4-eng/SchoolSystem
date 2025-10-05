// Login.js
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '', role: 'PL' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const response = await login(formData.email, formData.password, formData.role);
    if (response.error) {
      setError(response.error);
    } else if (response.token) {
      if (response.role === 'PL') {
        navigate('/admin/dashboard'); // Redirect PL to /admin/dashboard
      } else if (response.role === 'PRL') {
        navigate('/prl/dashboard'); // Placeholder for PRL (to be defined if needed)
      } else if (response.role === 'Lecturer') {
        navigate('/lecturer/dashboard');
      } else if (response.role === 'Student') {
        navigate('/student/dashboard');
      }
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">Login</h2>
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
                  <div className="input-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      aria-describedby="passwordHelp"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                    </button>
                  </div>
                  <div id="passwordHelp" className="form-text">Enter your password.</div>
                </div>
                <button type="submit" className="btn btn-primary w-100 mb-3">
                  Login
                </button>
              </form>
              <div className="text-center">
                <p>
                  Don’t have an account? <Link to="/register" className="text-decoration-none">Register</Link>
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

export default Login;