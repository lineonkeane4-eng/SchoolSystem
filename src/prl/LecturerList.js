import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function LecturerList() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [lecturers, setLecturers] = useState([]);
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!user || user.role !== 'PRL') {
      navigate('/unauthorized');
      return;
    }
    if (!token) {
      logout();
      navigate('/login');
      return;
    }

    const fetchFacultyAndLecturers = async () => {
      try {
        // Fetch PRL's assigned faculty
        const facultyRes = await fetch(`${apiUrl}/prl/current-faculty`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (facultyRes.status === 401 || facultyRes.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!facultyRes.ok) {
          const data = await facultyRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch assigned faculty');
        }
        const facultyData = await facultyRes.json();
        setFaculty(facultyData);

        // Fetch lecturers assigned to this PRL in the faculty
        const lecturersRes = await fetch(`${apiUrl}/prl/lecturers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (lecturersRes.status === 401 || lecturersRes.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!lecturersRes.ok) {
          const data = await lecturersRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch lecturers');
        }
        const lecturersData = await lecturersRes.json();
        setLecturers(Array.isArray(lecturersData) ? lecturersData : []);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    fetchFacultyAndLecturers();
  }, [user, navigate, logout, token]);

  return (
    <div>
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
                <Link className="nav-link" to="/prl/dashboard" aria-label="PRL Dashboard Home">
                  <i className="bi bi-house-door"></i> Home
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/reports" aria-label="View Lecture Reports">
                  <i className="bi bi-file-earmark-text"></i> Reports
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link active" aria-current="page" to="/prl/lecturers" aria-label="View Lecturers in Your Faculty">
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

      <div className="container mt-4">
        <h1 className="mb-4">
          <i className="bi bi-person"></i> Lecturers in Your Faculty, Under Your SREAM!!!
        </h1>
        {faculty && (
          <div className="alert alert-info" role="alert" aria-live="assertive">
            Showing lecturers for <strong>{faculty.name}</strong> faculty.
          </div>
        )}
        {error && (
          <div className="alert alert-danger" role="alert" aria-live="assertive">
            {error}
          </div>
        )}
        <div className="card shadow-sm">
          <div className="card-body">
            {loading ? (
              <div className="text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : lecturers.length === 0 ? (
              <div className="alert alert-info" role="alert" aria-live="assertive">
                No lecturers found in your faculty.
              </div>
            ) : (
              <ul className="list-group">
                {lecturers.map((lecturer) => (
                  <li
                    key={lecturer.id}
                    className="list-group-item"
                    aria-label={`Lecturer ${lecturer.full_name}`}
                  >
                    <h5>{lecturer.full_name}</h5>
                    <p className="mb-1">
                      <strong>Email:</strong> {lecturer.email}
                    </p>
                    <p className="mb-1">
                      <strong>Course:</strong> {lecturer.course_name || 'N/A'}
                    </p>
                    <p className="mb-1">
                      <strong>Faculty:</strong> {lecturer.faculty_name || 'N/A'}
                    </p>
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

export default LecturerList;