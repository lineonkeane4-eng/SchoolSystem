import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [courseForm, setCourseForm] = useState({ name: '', code: '' });
  const [userForm, setUserForm] = useState({ full_name: '', email: '', password: '', role: '' });
  const [assignmentForm, setAssignmentForm] = useState({ lecturer_id: '', class_id: '' });
  const [editFaculty, setEditFaculty] = useState(null);
  const [editCourse, setEditCourse] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!user || user.role !== 'PL') {
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
        const [facultyRes, courseRes, userRes, lecturerRes, classRes, assignmentRes] = await Promise.all([
          fetch(`${apiUrl}/faculties`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/courses`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/users?role=Lecturer`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/classes`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/lecturer-classes`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if ([facultyRes, courseRes, userRes, lecturerRes, classRes, assignmentRes].some(res => res.status === 401 || res.status === 403)) {
          logout();
          navigate('/login');
          return;
        }

        const [facultyData, courseData, userData, lecturerData, classData, assignmentData] = await Promise.all([
          facultyRes.json(),
          courseRes.json(),
          userRes.json(),
          lecturerRes.json(),
          classRes.json(),
          assignmentRes.json().catch(() => []), // Fallback for GET /lecturer-classes if not yet implemented
        ]);

        setFaculties(Array.isArray(facultyData) ? facultyData : []);
        setCourses(Array.isArray(courseData) ? courseData : []);
        setUsers(Array.isArray(userData) ? userData : []);
        setLecturers(Array.isArray(lecturerData) ? lecturerData : []);
        setClasses(Array.isArray(classData) ? classData : []);
        setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
      } catch (err) {
        setMessage('An error occurred while fetching data');
      }
    };

    fetchData();
  }, [user, token, navigate, logout]);

  const handleFacultySubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const method = editFaculty ? 'PUT' : 'POST';
    const url = editFaculty
      ? `${apiUrl}/faculties/${editFaculty.id}`
      : `${apiUrl}/faculties`;
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editFaculty ? editFaculty.name : document.getElementById('facultyName').value }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(`Faculty ${editFaculty ? 'updated' : 'created'} successfully!`);
        setEditFaculty(null);
        const facultyRes = await fetch(`${apiUrl}/faculties`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const facultyData = await facultyRes.json();
        setFaculties(Array.isArray(facultyData) ? facultyData : []);
      } else {
        setMessage(data.error || `Failed to ${editFaculty ? 'update' : 'create'} faculty`);
      }
    } catch {
      setMessage('An error occurred');
    }
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!courseForm.name || !selectedFaculty) {
      setMessage('Course name and faculty are required');
      return;
    }
    if (courseForm.code && courseForm.code.length > 10) {
      setMessage('Course code must be 10 characters or less');
      return;
    }
    const method = editCourse ? 'PUT' : 'POST';
    const url = editCourse
      ? `${apiUrl}/courses/${editCourse.id}`
      : `${apiUrl}/courses`;
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: courseForm.name,
          faculty_id: parseInt(selectedFaculty),
          code: courseForm.code || null,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(`Course ${editCourse ? 'updated' : 'created'} successfully!`);
        setCourseForm({ name: '', code: '' });
        setSelectedFaculty('');
        const courseRes = await fetch(`${apiUrl}/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const courseData = await courseRes.json();
        setCourses(Array.isArray(courseData) ? courseData : []);
      } else {
        setMessage(data.error || `Failed to ${editCourse ? 'update' : 'create'} course`);
      }
    } catch {
      setMessage('An error occurred');
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!userForm.full_name || !userForm.email || !userForm.password || !userForm.role) {
      setMessage('All user fields are required');
      return;
    }
    const method = editUser ? 'PUT' : 'POST';
    const url = editUser
      ? `${apiUrl}/users/${editUser.id}`
      : `${apiUrl}/admin/users`;
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userForm),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(`User ${editUser ? 'updated' : 'created'} successfully!`);
        setUserForm({ full_name: '', email: '', password: '', role: '' });
        setEditUser(null);
        const userRes = await fetch(`${apiUrl}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = await userRes.json();
        setUsers(Array.isArray(userData) ? userData : []);
      } else {
        setMessage(data.error || `Failed to ${editUser ? 'update' : 'create'} user`);
      }
    } catch {
      setMessage('An error occurred');
    }
  };

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

  const handleDelete = async (type, id) => {
    setMessage('');
    const url = `${apiUrl}/${type}/${id}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(`${type.slice(0, -1)} deleted successfully!`);
        if (type === 'faculties') {
          setFaculties(faculties.filter(f => f.id !== id));
        } else if (type === 'courses') {
          setCourses(courses.filter(c => c.id !== id));
        } else if (type === 'users') {
          setUsers(users.filter(u => u.id !== id));
        }
      } else {
        setMessage(data.error || `Failed to delete ${type.slice(0, -1)}`);
      }
    } catch {
      setMessage('An error occurred');
    }
  };

  return (
    <div>
      {/* Top Menu */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">PL Dashboard</a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/admin/dashboard"><i className="bi bi-house-door"></i> Home</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/admin/faculties"><i className="bi bi-building"></i> Faculties</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/admin/courses"><i className="bi bi-book"></i> Courses</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/admin/users"><i className="bi bi-people"></i> Users</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/admin/reports"><i className="bi bi-bar-chart"></i> Reports</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/admin/lecturer-courses"><i className="bi bi-person-check"></i> Assign Lecturers to Courses</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/admin/lecturer-classes"><i className="bi bi-person-plus"></i> Assign Lecturers to Classes</Link>
              </li>
            </ul>
            <button
              className="btn btn-outline-danger"
              onClick={() => { logout(); navigate('/login'); }}
              aria-label="Logout"
            >
              Logout <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="container mt-4">
        <h1 className="mb-4"><i className="bi bi-gear"></i> Program Leader Dashboard</h1>
        {message && (
          <div className={`alert ${message.includes('success') ? 'alert-success' : 'alert-danger'}`} role="alert">
            {message}
          </div>
        )}

        {/* Faculties Section */}
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h2 className="card-title"><i className="bi bi-building"></i> Manage Faculties</h2>
            <form onSubmit={handleFacultySubmit}>
              <div className="mb-3">
                <label htmlFor="facultyName" className="form-label">Faculty Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  id="facultyName"
                  value={editFaculty ? editFaculty.name : ''}
                  onChange={(e) => setEditFaculty(editFaculty ? { ...editFaculty, name: e.target.value } : null)}
                  required
                  maxLength="100"
                  aria-describedby="facultyHelp"
                />
                <div id="facultyHelp" className="form-text">Enter the faculty name (max 100 characters).</div>
              </div>
              <button type="submit" className="btn btn-primary me-2" aria-label={editFaculty ? 'Update faculty' : 'Add faculty'}>
                {editFaculty ? 'Update Faculty' : 'Add Faculty'}
              </button>
              {editFaculty && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditFaculty(null)}
                  aria-label="Cancel faculty edit"
                >
                  Cancel
                </button>
              )}
            </form>
            <h3 className="mt-4">Faculties</h3>
            {faculties.length > 0 ? (
              <ul className="list-group" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                {faculties.map(faculty => (
                  <li key={faculty.id} className="list-group-item d-flex justify-content-between align-items-center">
                    {faculty.name}
                    <div>
                      <button
                        className="btn btn-sm btn-warning me-2"
                        onClick={() => setEditFaculty(faculty)}
                        aria-label={`Edit faculty ${faculty.name}`}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete('faculties', faculty.id)}
                        aria-label={`Delete faculty ${faculty.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No faculties found</p>
            )}
          </div>
        </div>

        {/* Courses Section */}
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h2 className="card-title"><i className="bi bi-book"></i> Manage Courses</h2>
            <form onSubmit={handleCourseSubmit}>
              <div className="mb-3">
                <label htmlFor="facultySelect" className="form-label">Select Faculty <span className="text-danger">*</span></label>
                <select
                  className="form-select"
                  id="facultySelect"
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  required
                  aria-describedby="facultySelectHelp"
                  aria-required="true"
                >
                  <option value="">-- Select Faculty --</option>
                  {faculties.map(faculty => (
                    <option key={faculty.id} value={faculty.id}>{faculty.name}</option>
                  ))}
                </select>
                <div id="facultySelectHelp" className="form-text">Choose a faculty for the course.</div>
              </div>
              <div className="mb-3">
                <label htmlFor="courseName" className="form-label">Course Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  id="courseName"
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  required
                  maxLength="100"
                  aria-describedby="courseNameHelp"
                  aria-required="true"
                />
                <div id="courseNameHelp" className="form-text">Enter the course name (max 100 characters).</div>
              </div>
              <div className="mb-3">
                <label htmlFor="courseCode" className="form-label">Course Code (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  id="courseCode"
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  maxLength="10"
                  aria-describedby="courseCodeHelp"
                />
                <div id="courseCodeHelp" className="form-text">Enter the course code (max 10 characters).</div>
              </div>
              <button type="submit" className="btn btn-primary me-2" aria-label={editCourse ? 'Update course' : 'Add course'}>
                {editCourse ? 'Update Course' : 'Add Course'}
              </button>
              {editCourse && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditCourse(null);
                    setCourseForm({ name: '', code: '' });
                    setSelectedFaculty('');
                  }}
                  aria-label="Cancel course edit"
                >
                  Cancel
                </button>
              )}
            </form>
            <h3 className="mt-4">Courses</h3>
            {courses.length > 0 ? (
              <ul className="list-group" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                {courses.map(course => (
                  <li key={course.id} className="list-group-item d-flex justify-content-between align-items-center">
                    {course.name} ({course.facultyName}) {course.code && <span>- {course.code}</span>} - {course.total_registered_students} students
                    <div>
                      <button
                        className="btn btn-sm btn-warning me-2"
                        onClick={() => {
                          setEditCourse(course);
                          setCourseForm({ name: course.name, code: course.code || '' });
                          setSelectedFaculty(course.faculty_id.toString());
                        }}
                        aria-label={`Edit course ${course.name}`}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete('courses', course.id)}
                        aria-label={`Delete course ${course.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No courses found</p>
            )}
          </div>
        </div>

        {/* Users Section */}
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h2 className="card-title"><i className="bi bi-person"></i> Manage Users</h2>
            <form onSubmit={handleUserSubmit}>
              <div className="mb-3">
                <label htmlFor="userFullName" className="form-label">Full Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  id="userFullName"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  required
                  maxLength="100"
                  aria-describedby="userFullNameHelp"
                  aria-required="true"
                />
                <div id="userFullNameHelp" className="form-text">Enter the user's full name.</div>
              </div>
              <div className="mb-3">
                <label htmlFor="userEmail" className="form-label">Email <span className="text-danger">*</span></label>
                <input
                  type="email"
                  className="form-control"
                  id="userEmail"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  required
                  aria-describedby="userEmailHelp"
                  aria-required="true"
                />
                <div id="userEmailHelp" className="form-text">Enter the user's email.</div>
              </div>
              <div className="mb-3">
                <label htmlFor="userPassword" className="form-label">Password {editUser ? '' : <span className="text-danger">*</span>}</label>
                <input
                  type="password"
                  className="form-control"
                  id="userPassword"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required={!editUser}
                  aria-describedby="userPasswordHelp"
                  aria-required={!editUser}
                />
                <div id="userPasswordHelp" className="form-text">Password must be at least 8 characters with uppercase, lowercase, number, and special character.</div>
              </div>
              <div className="mb-3">
                <label htmlFor="userRole" className="form-label">Role <span className="text-danger">*</span></label>
                <select
                  className="form-select"
                  id="userRole"
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  required
                  aria-describedby="userRoleHelp"
                  aria-required="true"
                >
                  <option value="">-- Select Role --</option>
                  <option value="PL">PL</option>
                  <option value="PRL">PRL</option>
                  <option value="Lecturer">Lecturer</option>
                  <option value="Student">Student</option>
                </select>
                <div id="userRoleHelp" className="form-text">Choose the user's role.</div>
              </div>
              <button type="submit" className="btn btn-primary me-2" aria-label={editUser ? 'Update user' : 'Add user'}>
                {editUser ? 'Update User' : 'Add User'}
              </button>
              {editUser && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditUser(null);
                    setUserForm({ full_name: '', email: '', password: '', role: '' });
                  }}
                  aria-label="Cancel user edit"
                >
                  Cancel
                </button>
              )}
            </form>
            <h3 className="mt-4">Users</h3>
            {users.length > 0 ? (
              <ul className="list-group" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                {users.map(user => (
                  <li key={user.id} className="list-group-item d-flex justify-content-between align-items-center">
                    {user.full_name} ({user.email}) - {user.role}
                    <div>
                      <button
                        className="btn btn-sm btn-warning me-2"
                        onClick={() => {
                          setEditUser(user);
                          setUserForm({ full_name: user.full_name, email: user.email, password: '', role: user.role });
                        }}
                        aria-label={`Edit user ${user.full_name}`}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete('users', user.id)}
                        aria-label={`Delete user ${user.full_name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No users found</p>
            )}
          </div>
        </div>

        {/* Lecturer-Class Assignments Section */}
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h2 className="card-title"><i className="bi bi-person-plus"></i> Assign Lecturers to Classes</h2>
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
                    <option key={cls.id} value={cls.id}>{cls.class_name} ({cls.course_names.join(', ')})</option>
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
              <div className="table-responsive" style={{ maxHeight: '120px', overflowY: 'auto' }}>
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
                        <td>{assignment.course_names.join(', ')}</td>
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
    </div>
  );
}

export default AdminDashboard;