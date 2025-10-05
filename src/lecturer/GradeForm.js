import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

function GradeForm() {
  const { user, logout } = useContext(AuthContext);
  const { course_id } = useParams();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({
    class_id: '',
    student_id: '',
    grade: '',
    comments: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    if (!course_id || isNaN(parseInt(course_id))) {
      setError('Invalid Course ID. Please select a valid course from the dashboard.');
      return;
    }

    const fetchClasses = async () => {
      try {
        const res = await fetch(`${apiUrl}/lecturer/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch classes');
        }
        const data = await res.json();
        const filteredClasses = Array.isArray(data)
          ? data.filter((cls) => cls.course_ids.includes(parseInt(course_id)))
          : [];
        setClasses(filteredClasses);
        if (filteredClasses.length === 0) {
          setError('No classes assigned for this course.');
        }
      } catch (err) {
        console.error('Fetch classes error:', err);
        setError(err.message || 'Failed to load classes.');
      }
    };

    const fetchStudents = async () => {
      try {
        const res = await fetch(`${apiUrl}/student-courses?course_id=${encodeURIComponent(course_id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          setError('You are not authorized to access this course.');
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch students');
        }
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
        if (data.length === 0) {
          setError((prev) => prev || 'No students enrolled in this course.');
        }
      } catch (err) {
        console.error('Fetch students error:', err);
        setError((prev) => prev || err.message || 'Failed to load students.');
      }
    };

    fetchClasses();
    fetchStudents();
  }, [user, logout, navigate, token, course_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.class_id || !formData.student_id || !formData.grade) {
      setError('Class, student, and grade are required.');
      return;
    }
    const grade = parseFloat(formData.grade);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      setError('Grade must be a number between 0 and 100.');
      return;
    }
    if (formData.comments.length > 500) {
      setError('Comments must be 500 characters or less.');
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/grades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: formData.student_id,
          course_id: parseInt(course_id),
          class_id: formData.class_id,
          grade,
          comments: formData.comments || null,
        }),
      });
      if (res.status === 401 || res.status === 403) {
        setError('You are not authorized to submit grades for this class.');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit grade');
      }
      setSuccess('Grade submitted successfully!');
      setFormData({
        class_id: '',
        student_id: '',
        grade: '',
        comments: '',
      });
    } catch (err) {
      console.error('Submit grade error:', err);
      setError(err.message || 'Failed to submit grade.');
    }
  };

  const isFormValid = formData.class_id && formData.student_id && formData.grade && !isNaN(parseFloat(formData.grade)) && parseFloat(formData.grade) >= 0 && parseFloat(formData.grade) <= 100;

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Assign Grade for Course</h2>
      {error && (
        <div className="alert alert-danger" role="alert" aria-live="assertive">
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" role="alert" aria-live="assertive">
          {success}
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="class_id" className="form-label">
            Class <span className="text-danger">*</span>
          </label>
          <select
            id="class_id"
            name="class_id"
            className="form-select"
            value={formData.class_id}
            onChange={handleChange}
            required
            aria-required="true"
            disabled={classes.length === 0}
            aria-describedby="class_id_help"
          >
            <option value="">Select a class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.course_names && cls.course_names.length > 0 ? cls.course_names.join(', ') : 'No course assigned'})
              </option>
            ))}
          </select>
          {classes.length === 0 && (
            <div id="class_id_help" className="form-text text-muted">
              No classes available. Contact your administrator.
            </div>
          )}
        </div>
        <div className="mb-3">
          <label htmlFor="student_id" className="form-label">
            Student <span className="text-danger">*</span>
          </label>
          <select
            id="student_id"
            name="student_id"
            className="form-select"
            value={formData.student_id}
            onChange={handleChange}
            required
            aria-required="true"
            disabled={students.length === 0}
            aria-describedby="student_id_help"
          >
            <option value="">Select a student</option>
            {students.map((student) => (
              <option key={student.student_id} value={student.student_id}>
                {student.full_name} ({student.email})
              </option>
            ))}
          </select>
          {students.length === 0 && (
            <div id="student_id_help" className="form-text text-muted">
              No students available. Contact your administrator.
            </div>
          )}
        </div>
        <div className="mb-3">
          <label htmlFor="grade" className="form-label">
            Grade (0-100) <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            id="grade"
            name="grade"
            className="form-control"
            value={formData.grade}
            onChange={handleChange}
            min="0"
            max="100"
            step="0.01"
            required
            aria-required="true"
            aria-describedby="grade_help"
          />
          <div id="grade_help" className="form-text">
            Enter a grade between 0 and 100.
          </div>
        </div>
        <div className="mb-3">
          <label htmlFor="comments" className="form-label">
            Comments (Optional)
          </label>
          <textarea
            id="comments"
            name="comments"
            className="form-control"
            value={formData.comments}
            onChange={handleChange}
            maxLength="500"
            rows="4"
            aria-describedby="comments_help"
          />
          <div id="comments_help" className="form-text">
            Maximum 500 characters. {formData.comments.length}/500
          </div>
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!isFormValid}
          aria-disabled={!isFormValid}
        >
          Submit Grade
        </button>
        <button
          type="button"
          className="btn btn-secondary ms-2"
          onClick={() => navigate('/lecturer/dashboard')}
        >
          Back to Dashboard
        </button>
      </form>
    </div>
  );
}

export default GradeForm;