import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function LecturerPRLSelection() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [prls, setPrls] = useState([]);
  const [selectedPRL, setSelectedPRL] = useState('');
  const [currentPRL, setCurrentPRL] = useState(null);
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

    const fetchPRLs = async () => {
      try {
        const res = await fetch(`${apiUrl}/lecturer/available-prls`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch Principal Lecturers');
        }
        const data = await res.json();
        setPrls(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch PRLs error:', err);
        setError(err.message || 'Failed to load Principal Lecturers.');
      }
    };

    const fetchCurrentPRL = async () => {
      try {
        const res = await fetch(`${apiUrl}/lecturer/current-prl`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch current PRL');
        }
        const data = await res.json();
        if (data && data.id) {
          setCurrentPRL(data);
        }
      } catch (err) {
        console.error('Fetch current PRL error:', err);
        // Don't set error if no PRL is assigned; it's a valid state
        if (err.message !== 'No PRL assigned') {
          setError(err.message || 'Failed to load current PRL.');
        }
      }
    };

    fetchPRLs();
    fetchCurrentPRL();
  }, [user, navigate, logout, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedPRL) {
      setError('Please select a Principal Lecturer');
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/lecturer/select-prl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prl_id: selectedPRL }),
      });
      if (res.status === 401 || res.status === 403) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to select Principal Lecturer');
      }
      const data = await res.json();
      setSuccess(data.message || 'Principal Lecturer selected successfully');
      setCurrentPRL(data.prl); // Update with returned PRL details
      setSelectedPRL('');
    } catch (err) {
      console.error('Select PRL error:', err);
      setError(err.message || 'Failed to select Principal Lecturer.');
    }
  };

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">Lecturer Dashboard</a>
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
                <Link className="nav-link" to="/lecturer/dashboard">
                  <i className="bi bi-house-door"></i> Home
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/classes">
                  <i className="bi bi-book"></i> Classes
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/reports">
                  <i className="bi bi-file-earmark-text"></i> Reports
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/monitoring">
                  <i className="bi bi-graph-up"></i> Monitoring
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/rating">
                  <i className="bi bi-star"></i> Rating
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link active" aria-current="page" to="/lecturer/prl-selection">
                  <i className="bi bi-person-plus"></i> Select PRL
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
        <h2 className="mb-4">Select Your Principal Lecturer, {user.fullName}</h2>
        {currentPRL && (
          <div className="alert alert-info" role="alert">
            You are assigned to <strong>{currentPRL.full_name}</strong> ({currentPRL.email}).
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
                <label htmlFor="prlSelect" className="form-label">
                  Principal Lecturer
                </label>
                <select
                  id="prlSelect"
                  className="form-select"
                  value={selectedPRL}
                  onChange={(e) => setSelectedPRL(e.target.value)}
                  required
                  aria-required="true"
                  disabled={!!currentPRL}
                >
                  <option value="">Select Principal Lecturer</option>
                  {prls.map((prl) => (
                    <option key={prl.id} value={prl.id}>
                      {prl.full_name} ({prl.email})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!!currentPRL || !selectedPRL}
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

export default LecturerPRLSelection;