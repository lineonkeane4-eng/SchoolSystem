import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function PRLFacultySelection() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [faculties, setFaculties] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [currentFaculty, setCurrentFaculty] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

    const fetchFaculties = async () => {
      try {
        const res = await fetch(`${apiUrl}/faculties`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch faculties');
        }
        const data = await res.json();
        setFaculties(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch faculties error:', err);
        setError(err.message || 'Failed to load faculties.');
      }
    };

    const fetchCurrentFaculty = async () => {
      try {
        const res = await fetch(`${apiUrl}/prl/current-faculty`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch current faculty');
        }
        const data = await res.json();
        if (data && data.id) {
          setCurrentFaculty(data);
        }
      } catch (err) {
        console.error('Fetch current faculty error:', err);
        // Don't set error if no faculty is assigned; it's a valid state
        if (err.message !== 'No faculty assigned') {
          setError(err.message || 'Failed to load current faculty.');
        }
      }
    };

    fetchFaculties();
    fetchCurrentFaculty();
  }, [user, navigate, logout, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedFaculty) {
      setError('Please select a faculty');
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/prl/select-faculty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ faculty_id: selectedFaculty }),
      });
      if (res.status === 401 || res.status === 403) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to select faculty');
      }
      const data = await res.json();
      setSuccess(data.message || 'Faculty selected successfully');
      setCurrentFaculty(data.faculty); // Update with returned faculty details
      setSelectedFaculty('');
    } catch (err) {
      console.error('Select faculty error:', err);
      setError(err.message || 'Failed to select faculty.');
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
                <Link className="nav-link" to="/prl/dashboard">
                  <i className="bi bi-house-door"></i> Home
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/courses">
                  <i className="bi bi-book"></i> Courses
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/reports">
                  <i className="bi bi-file-earmark-text"></i> Reports
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/monitoring">
                  <i className="bi bi-graph-up"></i> Monitoring
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/rating">
                  <i className="bi bi-star"></i> Rating
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/classes">
                  <i className="bi bi-people"></i> Classes
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link active" aria-current="page" to="/prl/faculty-selection">
                  <i className="bi bi-building"></i> Select Faculty
                </Link>
              </li>
            </ul>
            <button
              className="btn btn-outline-danger"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              aria-label="Log out"
            >
              Logout <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </nav>

      <div className="container mt-4">
        <h2 className="mb-4">Select Your Faculty, {user.fullName}</h2>
        {currentFaculty && (
          <div className="alert alert-info" role="alert">
            You are assigned to <strong>{currentFaculty.name}</strong> faculty.
          </div>
        )}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success" role="alert">
            {success}
          </div>
        )}
        <div className="card shadow-sm">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="facultySelect" className="form-label">
                  Faculty
                </label>
                <select
                  id="facultySelect"
                  className="form-select"
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  required
                  aria-required="true"
                  disabled={!!currentFaculty}
                >
                  <option value="">Select Faculty</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!!currentFaculty || !selectedFaculty}
              >
                <i className="bi bi-check-circle me-2"></i>Submit Selection
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PRLFacultySelection;