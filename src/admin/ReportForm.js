// ReportForm.js (place in src/admin/ReportForm.js)
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function ReportForm() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('lecturer_workload'); // Default to lecturer_workload
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!user || user.role !== 'PL') {
    navigate('/unauthorized');
    return null;
  }
  if (!user.token) {
    logout();
    navigate('/login');
    return null;
  }

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/pl/reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: reportType }),
      });
      if (response.status === 401 || response.status === 403) {
        logout();
        navigate('/login');
        return;
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }
      setMessage('Report generated successfully! Redirecting to report list...');
      setTimeout(() => navigate('/admin/reports'), 2000);
    } catch (err) {
      console.error('Generate report error:', err);
      setError(err.message || `Failed to generate ${reportType.replace('_', ' ')} report. Ensure relevant data exists.`);
    }
  };

  return (
    <div>
      {/* Top Menu */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">PL Dashboard</a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/admin/dashboard"><i className="bi bi-house-door"></i> Home</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/admin/faculties"><i className="bi bi-building"></i> Faculties</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/admin/courses"><i className="bi bi-book"></i> Courses</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/admin/users"><i className="bi bi-people"></i> Users</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/admin/reports"><i className="bi bi-bar-chart"></i> Reports</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/admin/lecturer-courses"><i className="bi bi-person-check"></i> Assign Lecturers</Link>
              </li>
            </ul>
            <button className="btn btn-outline-danger" onClick={() => { logout(); navigate('/login'); }} aria-label="Logout">
              Logout <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Form Content */}
      <div className="container mt-4">
        <div className="mb-3">
          <Link to="/admin/reports" className="btn btn-secondary">
            <i className="bi bi-arrow-left"></i> Back to Reports
          </Link>
        </div>
        <h2 className="mb-4"><i className="bi bi-file-earmark-plus"></i> Generate New Report</h2>
        <div className="card shadow-sm">
          <div className="card-body">
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {message && <div className="alert alert-success" role="alert">{message}</div>}
            <form onSubmit={handleGenerate}>
              <div className="mb-3">
                <label htmlFor="reportType" className="form-label">Report Type</label>
                <select
                  id="reportType"
                  className="form-select"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  required
                  aria-required="true"
                  aria-describedby="reportTypeHelp"
                >
                  <option value="lecturer_workload">Lecturer Workload</option>
                  <option value="course_completion">Course Completion</option>
                  <option value="student_registration">Student Registration</option>
                </select>
                <div id="reportTypeHelp" className="form-text">
                  Select a report type. Note: Student Registration requires student data.
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-file-earmark-plus"></i> Generate Report
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportForm;