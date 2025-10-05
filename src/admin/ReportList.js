// ReportList.js
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function ReportList() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [reportType, setReportType] = useState('lecturer_workload'); // Default to lecturer_workload to avoid student data issues
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'PL') {
      navigate('/unauthorized');
      return;
    }
    if (!user.token) {
      logout();
      navigate('/login');
      return;
    }

    const fetchReports = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/pl/reports`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (response.status === 401 || response.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load reports');
        }
        const data = await response.json();
        setReports(Array.isArray(data) ? data : []);
        if (data.length === 0) {
          setMessage('No reports available. Generate a new report to get started.');
        }
      } catch (err) {
        console.error('Fetch reports error:', err);
        setError(err.message || 'Failed to load reports. Ensure the server is running and data is available.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user, navigate, logout]);

  const handleGenerate = async () => {
    setError('');
    setMessage('');
    if (!user.token) {
      logout();
      navigate('/login');
      return;
    }
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
      const data = await response.json();
      setReports([...reports, data]);
      setMessage('Report generated successfully!');
    } catch (err) {
      console.error('Generate report error:', err);
      setError(err.message || `Failed to generate ${reportType.replace('_', ' ')} report. Ensure relevant data exists (e.g., lecturers for lecturer_workload).`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }
    setError('');
    setMessage('');
    if (!user.token) {
      logout();
      navigate('/login');
      return;
    }
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/admin/reports/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (response.status === 401 || response.status === 403) {
        logout();
        navigate('/login');
        return;
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete report');
      }
      setReports(reports.filter(report => report.id !== id));
      setMessage('Report deleted successfully!');
    } catch (err) {
      console.error('Delete report error:', err);
      setError(err.message || 'Failed to delete report');
    }
  };

  if (loading) {
    return <div className="text-center mt-4">Loading...</div>;
  }

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

      {/* Reports Content */}
      <div className="container mt-4">
        <h2 className="mb-4"><i className="bi bi-bar-chart"></i> Manage Reports</h2>
        <div className="card shadow-sm">
          <div className="card-body">
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {message && <div className="alert alert-success" role="alert">{message}</div>}
            <div className="mb-4">
              <h5>Generate New Report</h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="reportType" className="form-label">Report Type</label>
                  <select
                    id="reportType"
                    className="form-select"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
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
                <div className="col-md-6 d-flex align-items-end">
                  <button onClick={handleGenerate} className="btn btn-primary me-2">
                    <i className="bi bi-file-earmark-plus"></i> Generate Report
                  </button>
                  <Link to="/admin/reports/new" className="btn btn-primary">
                    <i className="bi bi-plus-lg"></i> Generate via Form
                  </Link>
                </div>
              </div>
            </div>
            <h5>Existing Reports</h5>
            {reports.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Generated At</th>
                      <th>File</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(report => (
                      <tr key={report.id}>
                        <td>{report.id}</td>
                        <td>{report.type.replace('_', ' ').toUpperCase()}</td>
                        <td>{new Date(report.generated_at).toLocaleString()}</td>
                        <td>
                          {report.file_path ? (
                            <a
                              href={`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}${report.file_path}`}
                              download
                              className="btn btn-sm btn-outline-primary"
                              aria-label={`Download ${report.type} report`}
                            >
                              <i className="bi bi-download"></i> Download
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(report.id)}
                            aria-label={`Delete report ${report.type}`}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">No reports found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportList;