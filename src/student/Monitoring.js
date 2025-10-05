
// Monitoring.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

const Monitoring = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [progress, setProgress] = useState([]);
  const [attendanceDetails, setAttendanceDetails] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Fetch enrolled courses for dropdown
        const coursesResponse = await fetch(`${apiUrl}/student/enrolled-courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (coursesResponse.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        if (!coursesResponse.ok) throw new Error('Failed to fetch courses');
        const coursesData = await coursesResponse.json();
        setCourses(coursesData);

        // Fetch course progress
        const progressResponse = await fetch(`${apiUrl}/student/course-progress`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!progressResponse.ok) throw new Error('Failed to fetch course progress');
        const progressData = await progressResponse.json();
        setProgress(progressData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleCourseChange = async (e) => {
    const courseId = e.target.value;
    setSelectedCourse(courseId);
    if (!courseId) {
      setAttendanceDetails([]);
      setReports([]);
      return;
    }

    const token = localStorage.getItem('token');
    try {
      setLoading(true);
      setError('');

      // Fetch attendance details for selected course
      const attendanceResponse = await fetch(`${apiUrl}/student/attendance-details?course_id=${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!attendanceResponse.ok) throw new Error('Failed to fetch attendance details');
      const attendanceData = await attendanceResponse.json();
      setAttendanceDetails(attendanceData);

      // Fetch reports for selected course
      const reportsResponse = await fetch(`${apiUrl}/student/reports?course_id=${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!reportsResponse.ok) throw new Error('Failed to fetch reports');
      const reportsData = await reportsResponse.json();
      setReports(reportsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="mb-4">Student Monitoring</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="alert alert-info">Loading...</div>}

      {/* Course Progress Section */}
      <div className="card mb-4">
        <div className="card-header">Course Progress</div>
        <div className="card-body">
          {progress.length === 0 && !loading && <p>No enrolled courses found.</p>}
          {progress.length > 0 && (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Code</th>
                    <th>Total Classes</th>
                    <th>Attended Classes</th>
                    <th>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.map((item) => (
                    <tr key={item.course_id}>
                      <td>{item.course_name}</td>
                      <td>{item.course_code}</td>
                      <td>{item.total_classes}</td>
                      <td>{item.attended_classes}</td>
                      <td>{item.attendance_percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Course Selection for Details */}
      <div className="mb-4">
  <label htmlFor="courseInput" className="form-label">Enter Course</label>
  <input
    type="text"
    id="courseInput"
    className="form-control"
    value={selectedCourse}
    onChange={(e) => setSelectedCourse(e.target.value)}
    placeholder="Type course name..."
    required
  />
</div>


      {/* Attendance Details Section */}
      {selectedCourse && (
        <div className="card mb-4">
          <div className="card-header">Attendance Details</div>
          <div className="card-body">
            {attendanceDetails.length === 0 && !loading && <p>No attendance records found.</p>}
            {attendanceDetails.length > 0 && (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Course</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceDetails.map((record) => (
                      <tr key={record.report_id}>
                        <td>{new Date(record.date).toLocaleDateString()}</td>
                        <td>{record.course_name}</td>
                        <td>{record.attended ? 'Present' : 'Absent'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Section */}
      {selectedCourse && (
        <div className="card">
          <div className="card-header">Class Reports</div>
          <div className="card-body">
            {reports.length === 0 && !loading && <p>No reports found.</p>}
            {reports.length > 0 && (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Course</th>
                      <th>Lecturer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id}>
                        <td>{new Date(report.date).toLocaleDateString()}</td>
                        <td>{report.course_name}</td>
                        <td>{report.lecturer_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Monitoring;
