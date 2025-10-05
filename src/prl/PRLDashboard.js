// PRLDashboard.js
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function PRLDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user || user.role !== 'PRL') {
    navigate('/unauthorized');
    return null;
  }

  if (!user.token) {
    logout();
    navigate('/login');
    return null;
  }

  return (
    <div>
      {/* Top Menu */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">PRL Dashboard</a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link className="nav-link active" aria-current="page" to="/prl/dashboard" aria-label="PRL Dashboard Home">
                  <i className="bi bi-house-door"></i> Home
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/reports" aria-label="View Lecture Reports">
                  <i className="bi bi-file-earmark-text"></i> Lecture Reports
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/lecturers" aria-label="View Lecturers in Your Faculty">
                  <i className="bi bi-person"></i> Lecturers
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/class-courses" aria-label="Manage Class-Course Assignments">
                  <i className="bi bi-book"></i> Class-Course Assignments
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/lecturer-classes" aria-label="Assign Lecturers to Classes">
                  <i className="bi bi-person-plus"></i> Lecturer-Class Assignments
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/rating" aria-label="View Ratings in Your Stream">
                  <i className="bi bi-star"></i> Rating
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/faculty-selection" aria-label="Select Faculty">
                  <i className="bi bi-building"></i> Select Faculty
                </Link>
              </li>
            </ul>
            <button
              className="btn btn-outline-danger"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              aria-label="Logout"
            >
              Logout <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="container mt-4">
        <h1 className="mb-4"><i className="bi bi-gear"></i> Principal Lecturer Dashboard</h1>
        <div className="card shadow-sm">
          <div className="card-body">
            <h2 className="card-title"><i className="bi bi-file-earmark-text"></i> Welcome, {user.fullName}</h2>
            <p>Use the navigation bar to manage lecture reports, view lecturers in your faculty stream, assign courses to classes, assign lecturers to classes, or select your faculty.</p>
            <Link to="/prl/reports" className="btn btn-primary">
              <i className="bi bi-file-earmark-text"></i> Manage Lecture Reports
            </Link>
            <Link to="/prl/lecturers" className="btn btn-primary ms-2">
              <i className="bi bi-person"></i> View Lecturers
            </Link>
            <Link to="/prl/class-courses" className="btn btn-primary ms-2">
              <i className="bi bi-book"></i> Assign Courses to Classes
            </Link>
            <Link to="/prl/lecturer-classes" className="btn btn-primary ms-2">
              <i className="bi bi-person-plus"></i> Assign Lecturers to Classes
            </Link>
            <Link to="/prl/faculty-selection" className="btn btn-primary ms-2">
              <i className="bi bi-building"></i> Select Faculty
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PRLDashboard;