// ClassCourseAssignment.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function ClassCourseAssignment() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState(null);
  const [classCourseAssignment, setClassCourseAssignment] = useState({ class_id: '', course_id: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!user || user.role !== 'PRL') {
      navigate('/unauthorized');
      return;
    }
    if (!token) {
      logout();
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch PRL's assigned faculty
        const facultyRes = await fetch(`${apiUrl}/prl/current-faculty`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (facultyRes.status === 401 || facultyRes.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!facultyRes.ok) {
          const data = await facultyRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch assigned faculty');
        }
        const facultyData = await facultyRes.json();
        setFaculty(facultyData);

        // Fetch classes for PRL's faculty
        const classesRes = await fetch(`${apiUrl}/prl/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (classesRes.status === 401 || classesRes.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!classesRes.ok) {
          const data = await classesRes.json().catch(() => ({}));
          setClasses([]);
          throw new Error(data.error || 'Failed to fetch classes');
        }
        const classesData = await classesRes.json();
        setClasses(Array.isArray(classesData) ? classesData.map(cls => ({
          ...cls,
          course_ids: cls.course_ids ? cls.course_ids : [],
          course_names: cls.course_names ? cls.course_names : [],
        })) : []);

        // Fetch courses for PRL's faculty
        const coursesRes = await fetch(`${apiUrl}/prl/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (coursesRes.status === 401 || facultyRes.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!coursesRes.ok) {
          const data = await coursesRes.json().catch(() => ({}));
          setCourses([]);
          throw new Error(data.error || 'Failed to fetch courses');
        }
        const coursesData = await coursesRes.json();
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message === 'No faculty assigned to this PRL' 
          ? 'No faculty assigned. Please contact the Program Leader.' 
          : err.message || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate, logout, token, apiUrl]);

  const handleClassCourseChange = (e) => {
    const { name, value } = e.target;
    setClassCourseAssignment({ ...classCourseAssignment, [name]: value });
    setError('');
    setMessage('');
  };

  const handleClassCourseAssignment = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!classCourseAssignment.class_id || !classCourseAssignment.course_id) {
      setError('Please select both a class and a course.');
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/class-courses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          class_id: parseInt(classCourseAssignment.class_id),
          course_id: parseInt(classCourseAssignment.course_id),
        }),
      });
      if (response.status === 401 || response.status === 403) {
        logout();
        navigate('/login');
        return;
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign course to class');
      }
      const data = await response.json();
      const updatedClass = classes.find(cls => cls.id === parseInt(classCourseAssignment.class_id));
      if (updatedClass) {
        const course = courses.find(c => c.id === parseInt(classCourseAssignment.course_id));
        updatedClass.course_ids.push(parseInt(classCourseAssignment.course_id));
        updatedClass.course_names.push(course.name);
        setClasses([...classes]);
      }
      setClassCourseAssignment({ class_id: '', course_id: '' });
      setMessage(data.message || 'Course assigned to class successfully!');
    } catch (err) {
      console.error('Assign class course error:', err);
      setError(err.message || 'Failed to assign course to class.');
    }
  };

  const handleClassCourseUnassignment = async (classId, courseId) => {
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${apiUrl}/class-courses`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          class_id: parseInt(classId),
          course_id: parseInt(courseId),
        }),
      });
      if (response.status === 401 || response.status === 403) {
        logout();
        navigate('/login');
        return;
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unassign course from class');
      }
      const data = await response.json();
      const updatedClass = classes.find(cls => cls.id === parseInt(classId));
      if (updatedClass) {
        const index = updatedClass.course_ids.indexOf(parseInt(courseId));
        if (index !== -1) {
          updatedClass.course_ids.splice(index, 1);
          updatedClass.course_names.splice(index, 1);
          setClasses([...classes]);
        }
      }
      setMessage(data.message || 'Course unassigned from class successfully!');
    } catch (err) {
      console.error('Unassign class course error:', err);
      setError(err.message || 'Failed to unassign course from class.');
    }
  };

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">PRL Dashboard</a>
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
                <Link className="nav-link" to="/prl/dashboard" aria-label="PRL Dashboard Home">
                  <i className="bi bi-house-door"></i> Home
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/reports" aria-label="View Lecture Reports">
                  <i className="bi bi-file-earmark-text"></i> Reports
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/lecturers" aria-label="View Lecturers in Your Faculty">
                  <i className="bi bi-person"></i> Lecturers
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link active" aria-current="page" to="/prl/class-courses" aria-label="Manage Class-Course Assignments">
                  <i className="bi bi-book"></i> Class-Course Assignments
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/lecturer-classes" aria-label="Assign Lecturers to Classes">
                  <i className="bi bi-person-plus"></i> Lecturer-Class Assignments
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/rating" aria-label="Rate Lecturers in Your Stream">
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
              aria-label="Logout"
            >
              Logout <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </nav>

      <div className="container mt-4">
        <h1 className="mb-4">
          <i className="bi bi-book"></i> Class-Course Assignment
        </h1>
        {faculty ? (
          <div className="alert alert-info" role="alert" aria-live="assertive">
            Managing assignments for <strong>{faculty.name}</strong> faculty.
          </div>
        ) : (
          <div className="alert alert-warning" role="alert" aria-live="assertive">
            No faculty assigned. Please contact the Program Leader.
          </div>
        )}
        {error && (
          <div className="alert alert-danger" role="alert" aria-live="assertive">
            {error}
          </div>
        )}
        {message && (
          <div className="alert alert-success" role="alert" aria-live="assertive">
            {message}
          </div>
        )}
        {loading ? (
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="row">
            <div className="col-md-6">
              <div className="card shadow-sm mb-4">
                <div className="card-header">Assign Course to Class</div>
                <div className="card-body">
                  <form onSubmit={handleClassCourseAssignment}>
                    <div className="mb-3">
                      <label htmlFor="class_id" className="form-label">
                        Class <span className="text-danger">*</span>
                      </label>
                      <select
                        id="class_id"
                        name="class_id"
                        className="form-select"
                        value={classCourseAssignment.class_id}
                        onChange={handleClassCourseChange}
                        required
                        aria-required="true"
                        aria-label="Select class for course assignment"
                        disabled={classes.length === 0}
                      >
                        <option value="">Select Class</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                        ))}
                      </select>
                      {classes.length === 0 && (
                        <small className="form-text text-muted">
                          No classes available. Please create classes first.
                        </small>
                      )}
                    </div>
                    <div className="mb-3">
                      <label htmlFor="course_id" className="form-label">
                        Course <span className="text-danger">*</span>
                      </label>
                      <select
                        id="course_id"
                        name="course_id"
                        className="form-select"
                        value={classCourseAssignment.course_id}
                        onChange={handleClassCourseChange}
                        required
                        aria-required="true"
                        aria-label="Select course for class assignment"
                        disabled={courses.length === 0}
                      >
                        <option value="">Select Course</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.name} ({course.total_registered_students} students)
                          </option>
                        ))}
                      </select>
                      {courses.length === 0 && (
                        <small className="form-text text-muted">
                          No courses available in your faculty.
                        </small>
                      )}
                    </div>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={classes.length === 0 || courses.length === 0}
                    >
                      <i className="bi bi-plus-circle me-2"></i>Assign Course
                    </button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header">Current Class-Course Assignments</div>
                <div className="card-body">
                  {classes.length === 0 && (
                    <div className="alert alert-info" role="alert">
                      No classes available in your faculty.
                    </div>
                  )}
                  {classes.map(cls => (
                    <div key={cls.id} className="mb-3">
                      <strong>{cls.class_name}</strong>
                      {cls.course_names.length > 0 ? (
                        <ul className="list-group">
                          {cls.course_names.map((courseName, index) => (
                            <li 
                              key={cls.course_ids[index]} 
                              className="list-group-item d-flex justify-content-between align-items-center"
                            >
                              {courseName}
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleClassCourseUnassignment(cls.id, cls.course_ids[index])}
                                aria-label={`Unassign ${courseName} from ${cls.class_name}`}
                              >
                                <i className="bi bi-trash"></i> Unassign
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No courses assigned</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClassCourseAssignment;