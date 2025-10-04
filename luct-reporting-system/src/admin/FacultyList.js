import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function FacultyList() {
  const [faculties, setFaculties] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFaculties = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/faculties`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
          }
          throw new Error('Failed to fetch faculties');
        }
        const data = await response.json();
        setFaculties(data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchFaculties();
  }, [navigate]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this faculty?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/faculties/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
          }
          throw new Error('Failed to delete faculty');
        }
        setFaculties(faculties.filter(faculty => faculty.id !== id));
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
      <h2 className="mb-4">Manage Faculties</h2>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <div className="d-flex justify-content-end mb-3">
        <Link to="/admin/faculties/new" className="btn btn-primary">
          <i className="bi bi-plus-lg"></i> Add Faculty
        </Link>
      </div>
      <div className="table-responsive">
        <table className="table table-striped table-hover" aria-label="Faculties table">
          <thead className="table-dark">
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Name</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {faculties.map(faculty => (
              <tr key={faculty.id}>
                <td>{faculty.id}</td>
                <td>{faculty.name}</td>
                <td>
                  <Link
                    to={`/admin/faculties/edit/${faculty.id}`}
                    className="btn btn-sm btn-warning me-2"
                    aria-label={`Edit faculty ${faculty.name}`}
                  >
                    <i className="bi bi-pencil"></i>
                  </Link>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(faculty.id)}
                    aria-label={`Delete faculty ${faculty.name}`}
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

export default FacultyList;