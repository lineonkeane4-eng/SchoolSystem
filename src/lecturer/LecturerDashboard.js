// LecturerDashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function LecturerDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
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

    const fetchClasses = async () => {
      try {
        const res = await fetch(`${apiUrl}/lecturer/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch classes');
        }
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch classes error:', err);
        setError(err.message || 'Failed to load classes.');
      }
    };

    const fetchRecentReports = async () => {
      try {
        const res = await fetch(`${apiUrl}/lecturer/reports?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch recent reports');
        }
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch recent reports error:', err);
        setError((prevError) => prevError || err.message || 'Failed to load recent reports.');
      }
    };

    fetchClasses();
    fetchRecentReports();
  }, [user, navigate, logout, token]);

  return (
    <div>
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
                <Link className="nav-link active" aria-current="page" to="/lecturer/dashboard">
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
                <Link className="nav-link" to="/lecturer/rating">
                  <i className="bi bi-star"></i> Rating
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/prl-selection">
                  <i className="bi bi-person-plus"></i> Select PRL
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

      <div className="container mt-4">
        <h2 className="mb-4">Welcome, {user.fullName}</h2>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title">
              <i className="bi bi-book"></i> Assigned Classes
            </h5>
            {classes.length === 0 ? (
              <p>No classes assigned yet.</p>
            ) : (
              <ul className="list-group">
                {classes.map((cls) => (
                  <li
                    key={cls.id}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <strong>{cls.name}</strong> (
                      Courses: {cls.course_names && cls.course_names.length > 0 ? cls.course_names.join(', ') : 'Not assigned'}, 
                      Faculty: {cls.faculty_name || 'Not assigned'}
                      )
                    </div>
                    <div>
                      {cls.course_ids && cls.course_ids.length > 0 ? (
                        cls.course_ids.map((courseId, index) => (
                          <Link
                            key={courseId}
                            to={`/lecturer/courses/${courseId}/grades`}
                            className="btn btn-primary btn-sm me-2"
                            aria-label={`Grade students for ${cls.name} - ${cls.course_names[index]}`}
                          >
                            Grade {cls.course_names[index]}
                          </Link>
                        ))
                      ) : (
                        <button
                          className="btn btn-primary btn-sm me-2 disabled"
                          aria-disabled="true"
                          title="No courses assigned to this class"
                        >
                          Grade Students
                        </button>
                      )}
                      <Link
                        to={`/lecturer/reports/new?class_id=${cls.id}&course_id=${cls.course_ids[0] || ''}`}
                        className="btn btn-primary btn-sm"
                        aria-label={`Create report for ${cls.name}`}
                      >
                        Create Report
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="card-title">
              <i className="bi bi-file-earmark-text"></i> Recent Reports
            </h5>
            {reports.length === 0 ? (
              <p>No recent reports.</p>
            ) : (
              <ul className="list-group">
                {reports.map((report) => (
                  <li key={report.id} className="list-group-item">
                    <strong>{report.course_name}</strong> - {report.class_name} (
                    {new Date(report.date_of_lecture).toLocaleDateString()})<br />
                    Topic: {report.topic_taught || 'N/A'}<br />
                    Students Present: {report.actual_students_present} / {report.total_registered_students}
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

export default LecturerDashboard;