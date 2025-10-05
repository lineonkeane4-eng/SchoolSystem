import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function PRLReportList() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'PRL') {
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
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/prl/reports`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (response.status === 401 || response.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch reports');
        }
        const data = await response.json();
        setReports(Array.isArray(data) ? data : []);
        if (data.length === 0) {
          setMessage('No reports available. Create a new report to get started.');
        }
      } catch (err) {
        console.error('Fetch reports error:', err);
        setError(err.message || 'Failed to load reports. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user, navigate, logout]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/prl/reports/${id}`, {
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

  const downloadCSV = () => {
    const headers = [
      'ID', 'Lecturer', 'Course', 'Date', 'Week', 'Students Present', 'Total Registered', 
      'Venue', 'Time', 'Topic Taught', 'Learning Outcomes', 'Recommendations', 'PRL Feedback', 
      'Created At', 'Faculty Name', 'Class Name'
    ];
    const rows = reports.map(report => [
      report.id,
      report.lecturer_name,
      report.course_name,
      new Date(report.date_of_lecture).toLocaleDateString(),
      report.week_of_reporting,
      report.actual_students_present,
      report.total_registered_students,
      report.venue_name,
      report.scheduled_lecture_time,
      report.topic_taught.replace(/,/g, ';'),
      report.learning_outcomes.replace(/,/g, ';'),
      (report.recommendations || '').replace(/,/g, ';'),
      (report.prl_feedback || '').replace(/,/g, ';'),
      new Date(report.created_at).toLocaleString(),
      report.faculty_name,
      report.class_name
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prl_reports.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadSingleReportCSV = (report) => {
    const headers = [
      'ID', 'Lecturer', 'Course', 'Date', 'Week', 'Students Present', 'Total Registered', 
      'Venue', 'Time', 'Topic Taught', 'Learning Outcomes', 'Recommendations', 'PRL Feedback', 
      'Created At', 'Faculty Name', 'Class Name'
    ];
    const row = [
      report.id,
      report.lecturer_name,
      report.course_name,
      new Date(report.date_of_lecture).toLocaleDateString(),
      report.week_of_reporting,
      report.actual_students_present,
      report.total_registered_students,
      report.venue_name,
      report.scheduled_lecture_time,
      report.topic_taught.replace(/,/g, ';'),
      report.learning_outcomes.replace(/,/g, ';'),
      (report.recommendations || '').replace(/,/g, ';'),
      (report.prl_feedback || '').replace(/,/g, ';'),
      new Date(report.created_at).toLocaleString(),
      report.faculty_name,
      report.class_name
    ];

    const csvContent = [headers, row].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prl_report_${report.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="text-center mt-4">Loading...</div>;
  }

  return (
    <div>
      {/* Top Menu */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">PRL Dashboard</a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/prl/dashboard"><i className="bi bi-house-door"></i> Home</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/reports"><i className="bi bi-file-earmark-text"></i> Lecture Reports</Link>
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
        <h2 className="mb-4"><i className="bi bi-file-earmark-text"></i> Lecture Reports</h2>
        <div className="mb-3">
          <Link to="/prl/reports/new" className="btn btn-primary">
            <i className="bi bi-plus-lg"></i> Create New Report
          </Link>
          <button onClick={downloadCSV} className="btn btn-success ms-2">
            <i className="bi bi-download"></i> Download All CSV
          </button>
        </div>
        <div className="card shadow-sm">
          <div className="card-body">
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {message && <div className="alert alert-success" role="alert">{message}</div>}
            {reports.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>ID</th>
                      <th>Lecturer</th>
                      <th>Course</th>
                      <th>Date</th>
                      <th>Week</th>
                      <th>Students Present</th>
                      <th>Total Registered</th>
                      <th>Venue</th>
                      <th>Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(report => (
                      <tr key={report.id}>
                        <td>{report.id}</td>
                        <td>{report.lecturer_name}</td>
                        <td>{report.course_name}</td>
                        <td>{new Date(report.date_of_lecture).toLocaleDateString()}</td>
                        <td>{report.week_of_reporting}</td>
                        <td>{report.actual_students_present}</td>
                        <td>{report.total_registered_students}</td>
                        <td>{report.venue_name}</td>
                        <td>{report.scheduled_lecture_time}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-danger me-1"
                            onClick={() => handleDelete(report.id)}
                            aria-label={`Delete report ${report.id}`}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => downloadSingleReportCSV(report)}
                            aria-label={`Download CSV for report ${report.id}`}
                          >
                            <i className="bi bi-filetype-csv"></i>
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

export default PRLReportList;