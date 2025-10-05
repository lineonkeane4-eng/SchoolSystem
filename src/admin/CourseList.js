import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function CourseList() {
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
          }
          throw new Error('Failed to fetch courses');
        }
        const data = await response.json();
        setCourses(data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchCourses();
  }, [navigate]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/courses/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
          }
          throw new Error('Failed to delete course');
        }
        setCourses(courses.filter(course => course.id !== id));
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="container mt-5">
      <Link to="/admin/dashboard" className="btn btn-secondary mb-3">
        <i className="bi bi-arrow-left"></i> Back
      </Link>
      <h2 className="mb-4">Manage Courses</h2>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <div className="d-flex justify-content-end mb-3">
        <Link to="/admin/courses/new" className="btn btn-primary">
          <i className="bi bi-plus-lg"></i> Add Course
        </Link>
      </div>
      <div className="table-responsive">
        <table className="table table-striped table-hover" aria-label="Courses table">
          <thead className="table-dark">
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Name</th>
              <th scope="col">Code</th>
              <th scope="col">Faculty</th>
              <th scope="col">Total Students</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(course => (
              <tr key={course.id}>
                <td>{course.id}</td>
                <td>{course.name}</td>
                <td>{course.code || 'N/A'}</td>
                <td>{course.facultyName || 'N/A'}</td>
                <td>{course.total_registered_students || 0}</td>
                <td>
                  <Link
                    to={`/admin/courses/edit/${course.id}`}
                    className="btn btn-sm btn-warning me-2"
                    aria-label={`Edit course ${course.name}`}
                  >
                    <i className="bi bi-pencil"></i>
                  </Link>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(course.id)}
                    aria-label={`Delete course ${course.name}`}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CourseList;