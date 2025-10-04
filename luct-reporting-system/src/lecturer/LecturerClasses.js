// LecturerClasses.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function LecturerClasses() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
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
        setClasses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch classes error:', err);
        setError(err.message || 'Failed to load classes.');
      }
    };

    fetchClasses();
  }, [user, navigate, logout, token]);

  return (
    <div className="container mt-4">
      <h2 className="mb-4"><i className="bi bi-book"></i> My Assigned Classes</h2>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {classes.length === 0 ? (
        <p>No classes assigned yet.</p>
      ) : (
        <ul className="list-group">
          {classes.map((cls) => (
            <li key={cls.id} className="list-group-item">
              <strong>{cls.class_name}</strong>
              <p>Courses: {cls.course_names.join(', ') || 'None'}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LecturerClasses;