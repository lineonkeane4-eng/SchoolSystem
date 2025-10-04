// Homepage.js
import React from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function Homepage() {
  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center bg-light">
      <div className="text-center p-5 bg-white shadow-lg rounded-4" style={{ maxWidth: '600px' }}>
        <h1 className="display-3 fw-bold text-primary mb-3">LUCT Reporting System</h1>
        <p className="lead text-secondary mb-4">Empower your academic journey with seamless reporting and management tools.</p>
        <p className="text-muted mb-5">Access real-time insights, manage courses, grades, and more—tailored for all roles at LUCT.</p>
        <div className="d-grid gap-3">
          <Link to="/login" className="btn btn-primary btn-lg">
            <i className="bi bi-box-arrow-in-right me-2"></i> Login
          </Link>
          <Link to="/register" className="btn btn-outline-primary btn-lg">
            <i className="bi bi-person-plus-fill me-2"></i> Register
          </Link>
        </div>
        <p className="text-muted mt-4">Need help? Contact support at <a href="mailto:support@luct.edu" className="text-decoration-none">support@luct.edu</a>.</p>
        <p className="text-muted small">© 2025 LUCT Reporting System. All rights reserved.</p>
      </div>
    </div>
  );
}

export default Homepage;