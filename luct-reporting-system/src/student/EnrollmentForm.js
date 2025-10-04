import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function EnrollmentForm() {
  const { user } = useContext(AuthContext);
  const [faculties, setFaculties] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [totalRegisteredStudents, setTotalRegisteredStudents] = useState(0);
  const [enrolledClass, setEnrolledClass] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch data
  useEffect(() => {
    const fetchEnrolledClass = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/student/enrolled-class`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (response.ok && data.class_id) {
          setEnrolledClass(data);
          setSelectedFaculty(data.faculty_name);
          setSelectedClass(data.class_name);
        }
      } catch (err) {
        setError('Error fetching enrolled class: ' + err.message);
      }
    };

    const fetchFaculties = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/faculties`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (response.ok) setFaculties(data);
      } catch (err) {
        setError('Error fetching faculties: ' + err.message);
      }
    };

    fetchEnrolledClass();
    fetchFaculties();
  }, []);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (selectedFaculty && !enrolledClass) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/student/classes?faculty_name=${selectedFaculty}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await response.json();
          if (response.ok) setClasses(data);
        } catch (err) {
          setError('Error fetching classes: ' + err.message);
        }
      }
    };
    fetchClasses();
  }, [selectedFaculty, enrolledClass]);

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      if (selectedClass) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/student/courses?class_name=${selectedClass}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await response.json();
          if (response.ok) setCourses(data);
        } catch (err) {
          setError('Error fetching courses: ' + err.message);
        }
      }
    };
    fetchCourses();
  }, [selectedClass]);

  // Enroll class
  const handleClassEnroll = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedFaculty || !selectedClass) {
      setError('Please enter faculty and class');
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/student/enroll-class`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ faculty_name: selectedFaculty, class_name: selectedClass })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Successfully enrolled in the class');
        setEnrolledClass({ faculty_name: selectedFaculty, class_name: selectedClass });
      } else {
        setError(data.error || 'Failed to enroll in class');
      }
    } catch (err) {
      setError('Error enrolling in class: ' + err.message);
    }
  };

  // Enroll course
  const handleCourseEnroll = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedCourse) {
      setError('Please enter course name');
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/student/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ course_name: selectedCourse })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Successfully enrolled in the course');
        setTotalRegisteredStudents(prev => prev + 1);
      } else {
        setError(data.error || 'Failed to enroll in course');
      }
    } catch (err) {
      setError('Error enrolling in course: ' + err.message);
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4"><i className="bi bi-book me-2"></i>Enroll in Classes</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card shadow-sm">
        <div className="card-body">
          {enrolledClass ? (
            <>
              <h5 className="mb-3">
                <i className="bi bi-mortarboard-fill me-2"></i>
                Enrolled: {enrolledClass.class_name} ({enrolledClass.faculty_name})
              </h5>
              <form onSubmit={handleCourseEnroll}>
                <div className="mb-3">
                  <label htmlFor="courseInput" className="form-label">Course</label>
                  <input
                    list="courseList"
                    id="courseInput"
                    className="form-control"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    placeholder="Type or select course..."
                    required
                  />
                  <datalist id="courseList">
                    {courses.map(course => (
                      <option key={course.id} value={course.name} />
                    ))}
                  </datalist>
                </div>

                <div className="mb-3">
                  <label className="form-label">Total Registered Students</label>
                  <p className="form-control-plaintext">{totalRegisteredStudents}</p>
                </div>

                <button type="submit" className="btn btn-primary" disabled={!selectedCourse}>
                  <i className="bi bi-check-circle me-2"></i>Enroll in Course
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleClassEnroll}>
              <div className="mb-3">
                <label htmlFor="facultyInput" className="form-label">Faculty</label>
                <input
                  list="facultyList"
                  id="facultyInput"
                  className="form-control"
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  placeholder="Type or select faculty..."
                  required
                />
                <datalist id="facultyList">
                  {faculties.map(f => (
                    <option key={f.id} value={f.name} />
                  ))}
                </datalist>
              </div>

              <div className="mb-3">
                <label htmlFor="classInput" className="form-label">Class</label>
                <input
                  list="classList"
                  id="classInput"
                  className="form-control"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  placeholder="Type or select class..."
                  required
                  disabled={!selectedFaculty}
                />
                <datalist id="classList">
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.class_name} />
                  ))}
                </datalist>
              </div>

              <button type="submit" className="btn btn-primary" disabled={!selectedClass}>
                <i className="bi bi-check-circle me-2"></i>Enroll in Class
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default EnrollmentForm;
