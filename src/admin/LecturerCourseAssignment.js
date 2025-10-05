// LecturerCourseAssignment.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function LecturerCourseAssignment() {
  const [lecturers, setLecturers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedLecturer, setSelectedLecturer] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [lecturerRes, courseRes, assignmentRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/users?role=Lecturer`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/courses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/admin/lecturer-courses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (lecturerRes.status === 401 || lecturerRes.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        if (courseRes.status === 401 || courseRes.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        if (assignmentRes.status === 401 || assignmentRes.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        const lecturerData = await lecturerRes.json();
        const courseData = await courseRes.json();
        const assignmentData = await assignmentRes.json();

        setLecturers(Array.isArray(lecturerData) ? lecturerData : []);
        setCourses(Array.isArray(courseData) ? courseData : []);
        setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
      } catch (err) {
        setMessage('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate]);

  const handleAssign = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!selectedLecturer || !selectedCourse) {
      setMessage('Please select both a lecturer and a course');
      return;
    }
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/pl/lecturer-courses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lecturer_id: parseInt(selectedLecturer), course_id: parseInt(selectedCourse) }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Lecturer assigned to course successfully!');
        setSelectedLecturer('');
        setSelectedCourse('');
        setAssignments([...assignments, data]);
      } else {
        setMessage(data.error || 'Failed to assign lecturer to course');
      }
    } catch (err) {
      setMessage('An error occurred');
    }
  };

  const handleDelete = async (lecturerId, courseId) => {
    setMessage('');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/admin/lecturer-courses`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lecturer_id: parseInt(lecturerId), course_id: parseInt(courseId) }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Assignment removed successfully!');
        setAssignments(assignments.filter(a => a.lecturer_id !== lecturerId || a.course_id !== courseId));
      } else {
        setMessage(data.error || 'Failed to remove assignment');
      }
    } catch (err) {
      setMessage('An error occurred');
    }
  };

  if (loading) {
    return <div className="text-center mt-4">Loading...</div>;
  }

  return (
    <div className="container mt-4">
      <div className="mb-3">
        <Link to="/admin/dashboard" className="btn btn-secondary">
          <i className="bi bi-arrow-left"></i> Back to Dashboard
        </Link>
      </div>
      <h2 className="mb-4"><i className="bi bi-person-check"></i> Manage Lecturer-Course Assignments</h2>
      <div className="card shadow-sm">
        <div className="card-body">
          {message && (
            <div className={`alert ${message.includes('success') ? 'alert-success' : 'alert-danger'}`} role="alert">
              {message}
            </div>
          )}
          <h5>Assign Lecturer to Course</h5>
          <form onSubmit={handleAssign}>
            <div className="mb-3">
              <label htmlFor="lecturerSelect" className="form-label">Select Lecturer</label>
              <select
                className="form-select"
                id="lecturerSelect"
                value={selectedLecturer}
                onChange={(e) => setSelectedLecturer(e.target.value)}
                required
                aria-describedby="lecturerHelp"
              >
                <option value="">-- Select Lecturer --</option>
                {lecturers.map(lecturer => (
                  <option key={lecturer.id} value={lecturer.id}>{lecturer.full_name}</option>
                ))}
              </select>
              <div id="lecturerHelp" className="form-text">Choose a lecturer to assign.</div>
              {lecturers.length === 0 && <div className="text-danger">No lecturers available. Add a lecturer via Users section.</div>}
            </div>
            <div className="mb-3">
              <label htmlFor="courseSelect" className="form-label">Select Course</label>
              <select
                className="form-select"
                id="courseSelect"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                required
                aria-describedby="courseHelp"
              >
                <option value="">-- Select Course --</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.name} ({course.facultyName})</option>
                ))}
              </select>
              <div id="courseHelp" className="form-text">Choose a course to assign.</div>
              {courses.length === 0 && <div className="text-danger">No courses available. Add a course first.</div>}
            </div>
            <button type="submit" className="btn btn-primary me-2">Assign</button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setSelectedLecturer(''); setSelectedCourse(''); }}
              disabled={!selectedLecturer && !selectedCourse}
            >
              Clear
            </button>
          </form>

          <h5 className="mt-4">Current Assignments</h5>
          {assignments.length > 0 ? (
            <ul className="list-group">
              {assignments.map(assignment => (
                <li key={`${assignment.lecturer_id}-${assignment.course_id}`} className="list-group-item d-flex justify-content-between align-items-center">
                  {assignment.lecturer_name} - {assignment.course_name} ({assignment.faculty_name})
                  <div>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(assignment.lecturer_id, assignment.course_id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No assignments found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LecturerCourseAssignment;