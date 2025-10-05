import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState({
    enrolledCourses: [],
    recentRatings: [],
    attendanceStats: { totalClasses: 0, attendedClasses: 0 }
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/student/dashboard`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          setDashboardData(data);
        } else {
          console.error('Error fetching dashboard data:', data.error);
        }
      } catch (err) {
        console.error('Error:', err.message);
      }
    };
    fetchDashboardData();
  }, []);

  const attendancePercentage = dashboardData.attendanceStats.totalClasses > 0
    ? ((dashboardData.attendanceStats.attendedClasses / dashboardData.attendanceStats.totalClasses) * 100).toFixed(1)
    : 0;

  return (
    <div className="container-fluid">
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light mb-4">
        <div className="container">
          <Link className="navbar-brand" to="/student/dashboard">
            <i className="bi bi-mortarboard-fill me-2"></i>Student Portal
          </Link>
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
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <Link className="nav-link active" to="/student/dashboard">
                  <i className="bi bi-house-door me-1"></i>Dashboard
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/student/enroll">
                  <i className="bi bi-book me-1"></i>Enroll
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/student/monitoring">
                  <i className="bi bi-graph-up me-1"></i>Monitoring
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/student/rating">
                  <i className="bi bi-star me-1"></i>Rating
                </Link>
              </li>
            </ul>
            <span className="navbar-text">
              <i className="bi bi-person-circle me-2"></i>{user?.fullName || 'Student'}
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container">
        <h2 className="mb-4">Welcome, {user?.fullName || 'Student'}!</h2>

        {/* Overview Cards */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="card-title">
                  <i className="bi bi-bookmark-check-fill me-2 text-primary"></i>Enrolled Courses
                </h5>
                <p className="card-text fs-4">{dashboardData.enrolledCourses.length}</p>
                <Link to="/student/enroll" className="btn btn-outline-primary">
                  Manage Courses
                </Link>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="card-title">
                  <i className="bi bi-star-fill me-2 text-warning"></i>Recent Ratings
                </h5>
                <p className="card-text fs-4">{dashboardData.recentRatings.length}</p>
                <Link to="/student/rating" className="btn btn-outline-warning">
                  Rate Lecturers
                </Link>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="card-title">
                  <i className="bi bi-check-circle-fill me-2 text-success"></i>Attendance
                </h5>
                <p className="card-text fs-4">{attendancePercentage}%</p>
                <Link to="/student/monitoring" className="btn btn-outline-success">
                  View Details
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Enrolled Courses */}
        <div className="card mb-4">
          <div className="card-header">
            <h5><i className="bi bi-list-ul me-2"></i>Your Courses</h5>
          </div>
          <div className="card-body">
            {dashboardData.enrolledCourses.length > 0 ? (
              <ul className="list-group">
                {dashboardData.enrolledCourses.map(course => (
                  <li key={course.id} className="list-group-item">
                    {course.name} ({course.code}) - {course.faculty_name}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No courses enrolled. <Link to="/student/enroll">Enroll now</Link>.</p>
            )}
          </div>
        </div>

        {/* Attendance Chart */}
        <div className="card mb-4">
          <div className="card-header">
            <h5><i className="bi bi-bar-chart-fill me-2"></i>Attendance Overview</h5>
          </div>
          <div className="card-body">
            <div className="progress" style={{ height: '30px' }}>
              <div
                className="progress-bar bg-success"
                role="progressbar"
                style={{ width: `${attendancePercentage}%` }}
                aria-valuenow={attendancePercentage}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                {attendancePercentage}% ({dashboardData.attendanceStats.attendedClasses}/{dashboardData.attendanceStats.totalClasses})
              </div>
            </div>
          </div>
        </div>

        {/* Recent Ratings */}
        <div className="card">
          <div className="card-header">
            <h5><i className="bi bi-star-half me-2"></i>Recent Lecturer Ratings</h5>
          </div>
          <div className="card-body">
            {dashboardData.recentRatings.length > 0 ? (
              <ul className="list-group">
                {dashboardData.recentRatings.map(rating => (
                  <li key={rating.id} className="list-group-item">
                    {rating.lecturer_name} - {rating.course_name}: {rating.rating}/5
                    <small className="text-muted ms-2">({new Date(rating.created_at).toLocaleDateString()})</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No recent ratings. <Link to="/student/rating">Rate a lecturer</Link>.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;