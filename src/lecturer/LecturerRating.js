// LecturerRating.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function LecturerRating() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [ratings, setRatings] = useState([]);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!user || user.role !== 'Lecturer') {
      navigate('/unauthorized');
      return;
    }
    if (!token) {
      logout();
      navigate('/login');
      return;
    }

    const fetchRatings = async () => {
      try {
        const res = await fetch(`${apiUrl}/lecturer/ratings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch ratings');
        }
        const data = await res.json();
        setRatings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch ratings error:', err);
        setError(err.message || 'Failed to load ratings.');
      }
    };

    fetchRatings();
  }, [user, navigate, logout, token]);

  return (
    <div>
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">Lecturer Dashboard</a>
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
                <Link className="nav-link" to="/lecturer/dashboard">
                  <i className="bi bi-house-door"></i> Home
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/classes">
                  <i className="bi bi-book"></i> Classes
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/reports">
                  <i className="bi bi-file-earmark-text"></i> Reports
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/monitoring">
                  <i className="bi bi-graph-up"></i> Monitoring
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link active" aria-current="page" to="/lecturer/rating">
                  <i className="bi bi-star"></i> Rating
                </Link>
              </li>
            </ul>
            <button
              className="btn btn-outline-danger"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              aria-label="Log out"
            >
              Logout <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Rating Content */}
      <div className="container mt-4">
        <h2 className="mb-4">Your Ratings, {user.fullName}</h2>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {/* Ratings List */}
        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="card-title">
              <i className="bi bi-star"></i> Student Ratings
            </h5>
            {ratings.length === 0 ? (
              <p>No ratings received yet.</p>
            ) : (
              <ul className="list-group">
                {ratings.map((rating) => (
                  <li key={rating.id} className="list-group-item">
                    <strong>{rating.course_name}</strong> - {rating.class_name} (
                    {new Date(rating.rating_date).toLocaleDateString()})<br />
                    Student Rating: {rating.rating_value}/5<br />
                    Comments: {rating.comments || 'None'}<br />
                    Submitted by: {rating.student_name || 'Anonymous'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LecturerRating;