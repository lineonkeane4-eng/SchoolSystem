// lecturer/LecturerReportList.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function LecturerReportList() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
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

    const fetchReports = async () => {
      try {
        const res = await fetch(`${apiUrl}/lecturer/reports?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch reports');
        }
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch reports error:', err);
        setError(err.message || 'Failed to load reports.');
      }
    };

    fetchReports();
  }, [user, navigate, logout, token]);

  return (
    <div>
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">Lecturer Dashboard</a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/dashboard"><i className="bi bi-house-door"></i> Home</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/classes"><i className="bi bi-book"></i> Classes</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link active" to="/lecturer/reports"><i className="bi bi-file-earmark-text"></i> Reports</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/monitoring"><i className="bi bi-graph-up"></i> Monitoring</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/rating"><i className="bi bi-star"></i> Rating</Link>
              </li>
            </ul>
            <button className="btn btn-outline-danger" onClick={() => { logout(); navigate('/login'); }} aria-label="Logout">
              Logout <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Reports List */}
      <div className="container mt-4">
        <h2 className="mb-4">My Reports</h2>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <div className="mb-3">
          <Link to="/lecturer/reports/new" className="btn btn-primary">
            <i className="bi bi-plus"></i> Create New Report
          </Link>
        </div>
        {reports.length === 0 ? (
          <p>No reports found.</p>
        ) : (
          <div className="card shadow-sm">
            <div className="card-body">
              <ul className="list-group">
                {reports.map(report => (
                  <li key={report.id} className="list-group-item">
                    <strong>{report.course_name}</strong> - {report.class_name}<br />
                    Week: {report.week_of_reporting}, Date: {report.date_of_lecture}<br />
                    Students Present: {report.actual_students_present}/{report.total_registered_students}<br />
                    Venue: {report.venue_name}, Time: {report.scheduled_lecture_time}<br />
                    Topic: {report.topic_taught}<br />
                    {report.prl_feedback && (
                      <span className="text-muted">PRL Feedback: {report.prl_feedback}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LecturerReportList;