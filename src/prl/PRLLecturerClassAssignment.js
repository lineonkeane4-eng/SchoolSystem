import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function PRLLecturerClassAssignment() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [lecturers, setLecturers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({ lecturer_id: '', class_id: '' });
  const [message, setMessage] = useState('');
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
        const [lecturerRes, classRes, assignmentRes] = await Promise.all([
          fetch(`${apiUrl}/prl/lecturers`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/prl/classes`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/lecturer-classes`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if ([lecturerRes, classRes, assignmentRes].some(res => res.status === 401 || res.status === 403)) {
          logout();
          navigate('/login');
          return;
        }

        const [lecturerData, classData, assignmentData] = await Promise.all([
          lecturerRes.json(),
          classRes.json(),
          assignmentRes.json().catch(() => []),
        ]);

        setLecturers(Array.isArray(lecturerData) ? lecturerData : []);
        setClasses(Array.isArray(classData) ? classData : []);
        setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
      } catch (err) {
        setMessage('Error fetching data');
        console.error('Fetch error:', err);
      }
    };

    fetchData();
  }, [user, token, navigate, logout]);

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!assignmentForm.lecturer_id || !assignmentForm.class_id) {
      setMessage('Lecturer and class are required');
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/lecturer-classes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lecturer_id: parseInt(assignmentForm.lecturer_id),
          class_id: parseInt(assignmentForm.class_id),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Lecturer assigned to class successfully!');
        setAssignmentForm({ lecturer_id: '', class_id: '' });
        const assignmentRes = await fetch(`${apiUrl}/lecturer-classes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const assignmentData = await assignmentRes.json();
        setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
      } else {
        setMessage(data.error || 'Failed to assign lecturer to class');
      }
    } catch {
      setMessage('An error occurred');
    }
  };

  const handleDeleteAssignment = async (lecturer_id, class_id) => {
    setMessage('');
    try {
      const response = await fetch(`${apiUrl}/lecturer-classes`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lecturer_id, class_id }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Assignment deleted successfully!');
        setAssignments(assignments.filter(a => a.lecturer_id !== lecturer_id || a.class_id !== class_id));
      } else {
        setMessage(data.error || 'Failed to delete assignment');
      }
    } catch {
      setMessage('An error occurred');
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4"><i className="bi bi-person-plus"></i> Assign Lecturers to Classes</h1>
      {message && (
        <div className={`alert ${message.includes('success') ? 'alert-success' : 'alert-danger'}`} role="alert">
          {message}
        </div>
      )}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="card-title">Assign Lecturer to Class</h2>
          <form onSubmit={handleAssignmentSubmit}>
            <div className="mb-3">
              <label htmlFor="lecturer_id" className="form-label">Lecturer <span className="text-danger">*</span></label>
              <select
                id="lecturer_id"
                name="lecturer_id"
                value={assignmentForm.lecturer_id}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, lecturer_id: e.target.value })}
                className="form-select"
                required
                aria-required="true"
                aria-describedby="lecturerHelp"
              >
                <option value="">Select Lecturer</option>
                {lecturers.map(lecturer => (
                  <option key={lecturer.id} value={lecturer.id}>{lecturer.full_name}</option>
                ))}
              </select>
              <div id="lecturerHelp" className="form-text">Choose a lecturer to assign.</div>
            </div>
            <div className="mb-3">
              <label htmlFor="class_id" className="form-label">Class <span className="text-danger">*</span></label>
              <select
                id="class_id"
                name="class_id"
                value={assignmentForm.class_id}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, class_id: e.target.value })}
                className="form-select"
                required
                aria-required="true"
                aria-describedby="classHelp"
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.class_name} (Course: {cls.course_name})</option>
                ))}
              </select>
              <div id="classHelp" className="form-text">Choose a class to assign the lecturer to.</div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!assignmentForm.lecturer_id || !assignmentForm.class_id}
              aria-label="Assign lecturer to class"
            >
              Assign
            </button>
          </form>
          <h3 className="mt-4">Lecturer-Class Assignments</h3>
          {assignments.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Lecturer</th>
                    <th>Class</th>
                    <th>Course</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(assignment => (
                    <tr key={`${assignment.lecturer_id}-${assignment.class_id}`}>
                      <td>{assignment.lecturer_name}</td>
                      <td>{assignment.class_name}</td>
                      <td>{assignment.course_name}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteAssignment(assignment.lecturer_id, assignment.class_id)}
                          aria-label={`Remove assignment of ${assignment.lecturer_name} from ${assignment.class_name}`}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted">No assignments found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PRLLecturerClassAssignment;