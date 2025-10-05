import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function PRLReportForm() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  const [formData, setFormData] = useState({
    lecturer_name: '',
    class_name: '',
    week_of_reporting: '',
    date_of_lecture: '',
    course_name: '',
    actual_students_present: '',
    total_registered_students: '',
    venue_name: '',
    scheduled_lecture_time: '',
    topic_taught: '',
    learning_outcomes: '',
    recommendations: '',
    prl_feedback: '',
  });

  const [lecturers, setLecturers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [venues, setVenues] = useState([]);
  const [classes, setClasses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [newVenue, setNewVenue] = useState('');
  const [newClass, setNewClass] = useState({ name: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Fetch initial data
  useEffect(() => {
    if (!user || user.role !== 'PRL') navigate('/unauthorized');
    if (!token) {
      logout();
      navigate('/login');
      return;
    }

    const fetchData = async (endpoint, setter) => {
      try {
        const res = await fetch(`${apiUrl}/${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch ' + endpoint);
        const data = await res.json();
        setter(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData('users?role=Lecturer', setLecturers);
    fetchData('courses', setCourses);
    fetchData('venues', setVenues);
    fetchData('classes', setClasses);
    fetchData('faculties', setFaculties);
  }, [user, navigate, logout, token, apiUrl]);

  // Auto-fill total_registered_students when course_name changes
  useEffect(() => {
    if (formData.course_name) {
      const course = courses.find(c => c.name.toLowerCase() === formData.course_name.toLowerCase());
      if (course) {
        setFormData(prev => ({ ...prev, total_registered_students: course.total_registered_students || 0 }));
      }
    }
  }, [formData.course_name, courses]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Create new venue
  const handleVenueSubmit = async e => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!newVenue) return setError('Venue name is required');
    try {
      const res = await fetch(`${apiUrl}/venues`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newVenue }),
      });
      if (!res.ok) throw new Error('Failed to create venue');
      const data = await res.json();
      setVenues([...venues, data]);
      setNewVenue('');
      setMessage('Venue created successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  // Create new class
  const handleClassSubmit = async e => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!newClass.name) return setError('Class name is required');
    try {
      const res = await fetch(`${apiUrl}/classes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClass.name }),
      });
      if (!res.ok) throw new Error('Failed to create class');
      const data = await res.json();
      setClasses([...classes, data]);
      setNewClass({ name: '' });
      setMessage('Class created successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClassChange = e => {
    const { name, value } = e.target;
    setNewClass({ ...newClass, [name]: value });
  };

  const validateForm = () => {
    if (!formData.lecturer_name) return 'Lecturer is required';
    if (!formData.class_name) return 'Class is required';
    if (!formData.week_of_reporting || parseInt(formData.week_of_reporting) < 1 || parseInt(formData.week_of_reporting) > 52)
      return 'Week of reporting must be 1-52';
    if (!formData.date_of_lecture) return 'Date of lecture is required';
    if (!formData.course_name) return 'Course is required';
    if (formData.actual_students_present === '' || parseInt(formData.actual_students_present) < 0)
      return 'Actual students present must be non-negative';
    if (!formData.venue_name) return 'Venue is required';
    if (!formData.scheduled_lecture_time) return 'Scheduled lecture time is required';
    if (!formData.topic_taught) return 'Topic taught is required';
    if (!formData.learning_outcomes) return 'Learning outcomes are required';
    return '';
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setMessage('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      // Resolve names to IDs
      const lecturer = lecturers.find(l => l.full_name.toLowerCase() === formData.lecturer_name.toLowerCase());
      if (!lecturer) return setError('Lecturer not found');

      const course = courses.find(c => c.name.toLowerCase() === formData.course_name.toLowerCase());
      if (!course) return setError('Course not found');

      const cls = classes.find(c => c.class_name.toLowerCase() === formData.class_name.toLowerCase());
      if (!cls) return setError('Class not found');

      const venue = venues.find(v => v.name.toLowerCase() === formData.venue_name.toLowerCase());
      if (!venue) return setError('Venue not found');

      // Submit report
      const res = await fetch(`${apiUrl}/prl/reports`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecturer_id: lecturer.id,
          class_id: cls.id,
          week_of_reporting: parseInt(formData.week_of_reporting),
          date_of_lecture: formData.date_of_lecture,
          course_id: course.id,
          actual_students_present: parseInt(formData.actual_students_present),
          total_registered_students: parseInt(formData.total_registered_students),
          venue_id: venue.id,
          scheduled_lecture_time: formData.scheduled_lecture_time,
          topic_taught: formData.topic_taught,
          learning_outcomes: formData.learning_outcomes,
          recommendations: formData.recommendations || null,
          prl_feedback: formData.prl_feedback || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to create report');

      setMessage('Report created successfully!');
      setFormData({
        lecturer_name: '',
        class_name: '',
        week_of_reporting: '',
        date_of_lecture: '',
        course_name: '',
        actual_students_present: '',
        total_registered_students: '',
        venue_name: '',
        scheduled_lecture_time: '',
        topic_taught: '',
        learning_outcomes: '',
        recommendations: '',
        prl_feedback: '',
      });

      setSelectedFaculty('');
      setTimeout(() => navigate('/prl/reports'), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Create PRL Report</h2>
        <div>
          <Link to="/prl/reports" className="btn btn-secondary me-2">View Reports</Link>
          <Link to="/prl/class-courses" className="btn btn-primary me-2">Manage Class-Course Assignments</Link>
          <button onClick={logout} className="btn btn-danger">Logout</button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="row">
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">Create Report</div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {['faculty_name', 'lecturer_name', 'course_name', 'class_name', 'venue_name'].map(field => (
                  <div className="mb-3" key={field}>
                    <label className="form-label">
                      {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} <span className="text-danger">*</span>
                    </label>
                    <input
                      type={field.includes('name') ? 'text' : 'number'}
                      name={field}
                      className="form-control"
                      value={formData[field]}
                      onChange={handleChange}
                      required
                    />
                  </div>
                ))}

                <div className="mb-3">
                  <label className="form-label">Week of Reporting <span className="text-danger">*</span></label>
                  <input
                    type="number"
                    name="week_of_reporting"
                    className="form-control"
                    value={formData.week_of_reporting}
                    onChange={handleChange}
                    required
                    min="1"
                    max="52"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Date of Lecture <span className="text-danger">*</span></label>
                  <input
                    type="date"
                    name="date_of_lecture"
                    className="form-control"
                    value={formData.date_of_lecture}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Actual Students Present <span className="text-danger">*</span></label>
                  <input
                    type="number"
                    name="actual_students_present"
                    className="form-control"
                    value={formData.actual_students_present}
                    onChange={handleChange}
                    required
                    min="0"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Total Registered Students <span className="text-danger">*</span></label>
                  <input
                    type="number"
                    name="total_registered_students"
                    className="form-control"
                    value={formData.total_registered_students}
                    readOnly
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Scheduled Lecture Time <span className="text-danger">*</span></label>
                  <input
                    type="time"
                    name="scheduled_lecture_time"
                    className="form-control"
                    value={formData.scheduled_lecture_time}
                    onChange={handleChange}
                    required
                  />
                </div>

                {['topic_taught', 'learning_outcomes', 'recommendations', 'prl_feedback'].map(field => (
                  <div className="mb-3" key={field}>
                    <label className="form-label">{field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                    <textarea
                      name={field}
                      className="form-control"
                      value={formData[field]}
                      onChange={handleChange}
                      rows="4"
                      maxLength="500"
                    ></textarea>
                  </div>
                ))}

                <button type="submit" className="btn btn-primary">Submit Report</button>
              </form>
            </div>
          </div>
        </div>

        {/* Right column: create new venue/class */}
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">Create New Venue</div>
            <div className="card-body">
              <form onSubmit={handleVenueSubmit}>
                <div className="mb-3">
                  <label className="form-label">Venue Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={newVenue}
                    onChange={(e) => setNewVenue(e.target.value)}
                    required
                    maxLength="100"
                  />
                </div>
                <button type="submit" className="btn btn-primary">Create Venue</button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Create New Class</div>
            <div className="card-body">
              <form onSubmit={handleClassSubmit}>
                <div className="mb-3">
                  <label className="form-label">Class Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={newClass.name}
                    onChange={handleClassChange}
                    required
                    maxLength="50"
                  />
                </div>
                <button type="submit" className="btn btn-primary">Create Class</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PRLReportForm;
