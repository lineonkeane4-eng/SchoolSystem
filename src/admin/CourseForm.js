import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function CourseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', faculty_id: '', code: '', total_registered_students: 0 });
  const [faculties, setFaculties] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        const facultiesResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/faculties`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!facultiesResponse.ok) {
          if (facultiesResponse.status === 401 || facultiesResponse.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
          }
          throw new Error('Failed to fetch faculties');
        }
        const facultyData = await facultiesResponse.json();
        setFaculties(facultyData);

        if (id) {
          const courseResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/courses/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!courseResponse.ok) {
            if (courseResponse.status === 401 || courseResponse.status === 403) {
              localStorage.removeItem('token');
              navigate('/login');
            }
            throw new Error('Failed to fetch course');
          }
          const course = await courseResponse.json();
          setFormData({
            name: course.name,
            faculty_id: course.faculty_id,
            code: course.code || '',
            total_registered_students: course.total_registered_students || 0,
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name' && value.length > 100) {
      setError('Course name must be 100 characters or less');
      return;
    }
    if (name === 'code' && value.length > 10) {
      setError('Course code must be 10 characters or less');
      return;
    }
    setFormData({ ...formData, [name]: value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) {
      setError('Course name is required');
      return;
    }
    if (!formData.faculty_id) {
      setError('Please select a faculty');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: formData.name,
        faculty_id: parseInt(formData.faculty_id),
        code: formData.code || null,
      };
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/courses${id ? `/${id}` : ''}`,
        {
          method: id ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save course');
      }
      navigate('/admin/courses');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-center">Loading...</div>;

  return (
    <div className="container mt-5">
      <Link to="/admin/courses" className="btn btn-secondary mb-3">
        <i className="bi bi-arrow-left"></i> Back
      </Link>
      <h2 className="mb-4">{id ? 'Edit Course' : 'Add Course'}</h2>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} aria-labelledby="courseFormTitle">
            <div className="mb-3">
              <label htmlFor="name" className="form-label">Course Name</label>
              <input
                type="text"
                className="form-control"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                maxLength="100"
                aria-describedby="nameHelp"
              />
              <div id="nameHelp" className="form-text">Enter the course name (max 100 characters).</div>
            </div>
            <div className="mb-3">
              <label htmlFor="code" className="form-label">Course Code (Optional)</label>
              <input
                type="text"
                className="form-control"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                maxLength="10"
                aria-describedby="codeHelp"
              />
              <div id="codeHelp" className="form-text">Enter the course code (max 10 characters).</div>
            </div>
            <div className="mb-3">
              <label htmlFor="faculty_id" className="form-label">Faculty</label>
              <input
              type="text"
              className="form-control"
  id="facultyInput"
  name="faculty_name"
  value={formData.faculty_name || ''}
  onChange={handleChange}
  placeholder="Type faculty name..."
  required
  aria-describedby="facultyHelp"
/>

              <div id="facultyHelp" className="form-text">Select the associated faculty.</div>
              {faculties.length === 0 && <div className="text-danger">No faculties available. Add a faculty first.</div>}
            </div>
            <div className="mb-3">
              <label htmlFor="total_registered_students" className="form-label">Total Registered Students</label>
              <input
                type="number"
                className="form-control"
                id="total_registered_students"
                name="total_registered_students"
                value={formData.total_registered_students}
                readOnly
                aria-describedby="studentsHelp"
              />
              <div id="studentsHelp" className="form-text">Number of students registered (auto-populated).</div>
            </div>
            <button
              type="submit"
              className="btn btn-primary me-2"
              disabled={!formData.name || !formData.faculty_id}
            >
              <i className="bi bi-save"></i> Save
            </button>
            <Link to="/admin/courses" className="btn btn-secondary">
              <i className="bi bi-x-lg"></i> Cancel
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CourseForm;