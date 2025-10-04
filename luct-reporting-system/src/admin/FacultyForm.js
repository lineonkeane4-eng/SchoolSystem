import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function FacultyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      const fetchFaculty = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            navigate('/login');
            return;
          }
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/faculties/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              localStorage.removeItem('token');
              navigate('/login');
            }
            throw new Error('Failed to fetch faculty');
          }
          const data = await response.json();
          setFormData({ name: data.name });
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchFaculty();
    } else {
      setLoading(false);
    }
  }, [id, navigate]);

  const handleChange = (e) => {
    const { value } = e.target;
    if (value.length > 100) {
      setError('Faculty name must be 100 characters or less');
      return;
    }
    setFormData({ name: value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) {
      setError('Faculty name is required');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/faculties${id ? `/${id}` : ''}`,
        {
          method: id ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: formData.name }),
        }
      );
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save faculty');
      }
      navigate('/admin/faculties');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-center">Loading...</div>;

  return (
    <div className="container mt-5">
      <Link to="/admin/faculties" className="btn btn-secondary mb-3">
        <i className="bi bi-arrow-left"></i> Back
      </Link>
      <h2 className="mb-4">{id ? 'Edit Faculty' : 'Add Faculty'}</h2>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} aria-labelledby="facultyFormTitle">
            <div className="mb-3">
              <label htmlFor="name" className="form-label">Faculty Name</label>
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
              <div id="nameHelp" className="form-text">Enter the faculty name (max 100 characters).</div>
            </div>
            <button
              type="submit"
              className="btn btn-primary me-2"
              disabled={!formData.name.trim()}
            >
              <i className="bi bi-save"></i> Save
            </button>
            <Link to="/admin/faculties" className="btn btn-secondary">
              <i className="bi bi-x-lg"></i> Cancel
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}

export default FacultyForm;