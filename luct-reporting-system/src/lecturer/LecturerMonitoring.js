import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const LecturerMonitoring = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
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
        setLoading(true);
        setError('');
        const response = await fetch(`${apiUrl}/lecturer/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401 || response.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch classes');
        }
        const data = await response.json();
        setClasses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch classes error:', err);
        setError(err.message || 'Failed to load classes.');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user, navigate, logout, token]);

  const handleClassChange = async (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setSelectedReport('');
    setAttendance([]);
    setStudents([]);
    setReports([]);
    if (!classId) return;

    try {
      setLoading(true);
      setError('');

      // Fetch students
      const studentsResponse = await fetch(`${apiUrl}/lecturer/class-students?class_id=${encodeURIComponent(classId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (studentsResponse.status === 403) {
        setError('You are not assigned to this class.');
        return;
      }
      if (!studentsResponse.ok) {
        const data = await studentsResponse.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch students');
      }
      const studentsData = await studentsResponse.json();
      setStudents(Array.isArray(studentsData) ? studentsData : []);

      // Fetch reports
      const reportsResponse = await fetch(`${apiUrl}/lecturer/class-reports?class_id=${encodeURIComponent(classId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!reportsResponse.ok) {
        const data = await reportsResponse.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch reports');
      }
      const reportsData = await reportsResponse.json();
      setReports(Array.isArray(reportsData) ? reportsData : []);
    } catch (err) {
      console.error('Class change error:', err);
      setError(err.message || 'Failed to load class data.');
    } finally {
      setLoading(false);
    }
  };

  const handleReportChange = async (e) => {
    const reportId = e.target.value;
    setSelectedReport(reportId);
    setAttendance([]);
    if (!reportId) return;

    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${apiUrl}/lecturer/attendance?report_id=${encodeURIComponent(reportId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 403) {
        setError('You are not authorized to view this report.');
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch attendance');
      }
      const attendanceData = await response.json();
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
    } catch (err) {
      console.error('Report change error:', err);
      setError(err.message || 'Failed to load attendance data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId, attended) => {
    setAttendance((prev) =>
      prev.some((a) => a.student_id === studentId)
        ? prev.map((a) => (a.student_id === studentId ? { ...a, attended } : a))
        : [...prev, { student_id: studentId, student_name: students.find((s) => s.id === studentId)?.full_name || '', attended }]
    );
  };

  const handleSubmitAttendance = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${apiUrl}/lecturer/submit-attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ report_id: selectedReport, attendance }),
      });
      if (response.status === 403) {
        setError('You are not authorized to submit attendance for this report.');
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit attendance');
      }
      alert('Attendance submitted successfully');
      setAttendance([]);
      setSelectedReport('');
    } catch (err) {
      console.error('Submit attendance error:', err);
      setError(err.message || 'Failed to submit attendance.');
    } finally {
      setLoading(false);
    }
  };

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
                <Link className="nav-link active" to="/lecturer/monitoring">
                  <i className="bi bi-graph-up"></i> Monitoring
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/rating">
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

      <div className="container mt-5">
        <h2 className="mb-4">Lecturer Monitoring</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        {loading && <div className="alert alert-info">Loading...</div>}

        <div className="mb-4">
  <label htmlFor="classInput" className="form-label">Enter Class</label>
  <input
    type="text"
    id="classInput"
    className="form-control"
    value={selectedClass}
    onChange={(e) => setSelectedClass(e.target.value)}
    placeholder="Type class name..."
    required
  />
</div>


        {selectedClass && (
          <div className="card mb-4">
            <div className="card-header">Class Reports</div>
            <div className="card-body">
              {reports.length === 0 && !loading && <p>No reports found for this class.</p>}
              {reports.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Course</th>
                        <th>Class</th>
                        <th>Topic</th>
                        <th>Students Present</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) => (
                        <tr key={report.id}>
                          <td>{new Date(report.date).toLocaleDateString()}</td>
                          <td>{report.course_name}</td>
                          <td>{report.class_name}</td>
                          <td>{report.topic_taught || 'N/A'}</td>
                          <td>{report.actual_students_present} / {report.total_registered_students}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedClass && (
          <div className="mb-4">
            <label htmlFor="reportSelect" className="form-label">Select Report</label>
            <select
              id="reportSelect"
              className="form-select"
              value={selectedReport}
              onChange={handleReportChange}
              aria-required="true"
            >
              <option value="">-- Select a Report --</option>
              {reports.map((report) => (
                <option key={report.id} value={report.id}>
                  {new Date(report.date).toLocaleDateString()} - {report.course_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedReport && (
          <div className="card">
            <div className="card-header">Student Attendance</div>
            <div className="card-body">
              {students.length === 0 && !loading && <p>No students found for this class.</p>}
              {students.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Email</th>
                        <th>Attended</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const attendanceRecord = attendance.find((a) => a.student_id === student.id) || { attended: false };
                        return (
                          <tr key={student.id}>
                            <td>{student.full_name}</td>
                            <td>{student.email}</td>
                            <td>
                              <input
                                type="checkbox"
                                checked={attendanceRecord.attended}
                                onChange={(e) => handleAttendanceChange(student.id, e.target.checked)}
                                aria-label={`Mark attendance for ${student.full_name}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <button
                    className="btn btn-primary mt-3"
                    onClick={handleSubmitAttendance}
                    disabled={loading || !selectedReport}
                    aria-label="Submit attendance"
                  >
                    Submit Attendance
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LecturerMonitoring;