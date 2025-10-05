// CourseManagement.js (Replace the entire file)
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function CourseManagement() {
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/faculties`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setFaculties(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setFaculties([]);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (selectedFaculty) {
      fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/courses?faculty_id=${selectedFaculty}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          setCourses(Array.isArray(data) ? data : []);
        })
        .catch(() => setCourses([]));
    } else {
      setCourses([]);
    }
  }, [selectedFaculty, token]);

  useEffect(() => {
    if (selectedCourse) {
      fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/courses/${selectedCourse}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          setTotalRegistered(data.total_registered_students || 0);
        })
        .catch(() => setTotalRegistered(0));
    } else {
      setTotalRegistered(0);
    }
  }, [selectedCourse, token]);

  return (
    <div className="container mt-4">
      <h2 className="mb-4"><i className="bi bi-book"></i> Course Management</h2>
      {loading ? (
        <div className="text-center"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="mb-3">
              <label htmlFor="facultySelect" className="form-label">Select Faculty</label>
              <select
                className="form-select"
                id="facultySelect"
                value={selectedFaculty}
                onChange={(e) => {
                  setSelectedFaculty(e.target.value);
                  setSelectedCourse('');
                  setTotalRegistered(0);
                }}
                required
                aria-describedby="facultyHelp"
              >
                <option value="">-- Select Faculty --</option>
                {faculties.map(faculty => (
                  <option key={faculty.id} value={faculty.id}>{faculty.name}</option>
                ))}
              </select>
              <div id="facultyHelp" className="form-text">Choose a faculty to view its courses.</div>
            </div>
            <div className="mb-3">
              <label htmlFor="courseSelect" className="form-label">Select Course</label>
              <select
                className="form-select"
                id="courseSelect"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                disabled={!selectedFaculty}
                required
                aria-describedby="courseHelp"
              >
                <option value="">-- Select Course --</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
              <div id="courseHelp" className="form-text">Choose a course to see registered students.</div>
            </div>
            {selectedCourse && (
              <div className="alert alert-info" role="alert">
                Total Registered Students: <strong>{totalRegistered}</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseManagement;