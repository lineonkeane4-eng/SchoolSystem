import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function LecturerReportForm() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialClassId = queryParams.get('class_id') || '';
  const token = localStorage.getItem('token');
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  const [formData, setFormData] = useState({
    class_id: initialClassId,
    course_id: '',
    week_of_reporting: '',
    date_of_lecture: '',
    actual_students_present: '',
    total_registered_students: '',
    venue_id: '',
    scheduled_lecture_time: '',
    topic_taught: '',
    learning_outcomes: '',
    recommendations: '',
  });
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [venues, setVenues] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
        if (res.status === 401) {
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

    const fetchCourses = async () => {
      try {
        const res = await fetch(`${apiUrl}/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch courses');
        }
        const data = await res.json();
        setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch courses error:', err);
        setError(err.message || 'Failed to load courses.');
      }
    };

    const fetchVenues = async () => {
      try {
        const res = await fetch(`${apiUrl}/venues`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch venues');
        }
        const data = await res.json();
        setVenues(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch venues error:', err);
        setError((prev) => prev || err.message || 'Failed to load venues.');
      }
    };

    fetchClasses();
    fetchCourses();
    fetchVenues();
  }, [user, navigate, logout, token]);

  useEffect(() => {
    if (classes.length > 0 && courses.length > 0 && initialClassId) {
      const selectedClass = classes.find(cls => cls.id === parseInt(initialClassId));
      if (selectedClass && selectedClass.course_ids.length > 0) {
        const initialCourseId = selectedClass.course_ids[0];
        const selectedCourse = courses.find(c => c.id === initialCourseId);
        setFormData(prev => ({
          ...prev,
          class_id: initialClassId,
          course_id: initialCourseId.toString(),
          total_registered_students: selectedCourse ? selectedCourse.total_registered_students.toString() : '0',
        }));
      }
    }
  }, [classes, courses, initialClassId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'class_id') {
      const selectedClass = classes.find(cls => cls.id === parseInt(value));
      let newCourseId = '';
      let newTotal = '0';
      if (selectedClass && selectedClass.course_ids.length > 0) {
        newCourseId = selectedClass.course_ids[0].toString();
        const selectedCourse = courses.find(c => c.id === parseInt(newCourseId));
        newTotal = selectedCourse ? selectedCourse.total_registered_students.toString() : '0';
      }
      setFormData(prev => ({
        ...prev,
        [name]: value,
        course_id: newCourseId,
        total_registered_students: newTotal,
      }));
    } else if (name === 'course_id') {
      const selectedCourse = courses.find(c => c.id === parseInt(value));
      setFormData(prev => ({
        ...prev,
        [name]: value,
        total_registered_students: selectedCourse ? selectedCourse.total_registered_students.toString() : '0',
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    if (!formData.class_id) return 'Class is required';
    if (!formData.course_id) return 'Course is required';
    if (!formData.week_of_reporting || formData.week_of_reporting < 1 || formData.week_of_reporting > 52)
      return 'Week of reporting must be between 1 and 52';
    if (!formData.date_of_lecture) return 'Date of lecture is required';
    if (!formData.actual_students_present || formData.actual_students_present < 0)
      return 'Actual students present must be non-negative';
    if (!formData.total_registered_students || formData.total_registered_students < 0)
      return 'Total registered students must be non-negative';
    if (!formData.venue_id) return 'Venue is required';
    if (!formData.scheduled_lecture_time) return 'Scheduled lecture time is required';
    if (!formData.topic_taught) return 'Topic taught is required';
    if (!formData.learning_outcomes) return 'Learning outcomes are required';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      console.log('Submitting new report form data:', formData);
      const response = await fetch(`${apiUrl}/lecturer/reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          class_id: parseInt(formData.class_id),
          course_id: parseInt(formData.course_id),
          week_of_reporting: parseInt(formData.week_of_reporting),
          date_of_lecture: formData.date_of_lecture,
          actual_students_present: parseInt(formData.actual_students_present),
          total_registered_students: parseInt(formData.total_registered_students),
          venue_id: parseInt(formData.venue_id),
          scheduled_lecture_time: formData.scheduled_lecture_time,
          topic_taught: formData.topic_taught,
          learning_outcomes: formData.learning_outcomes,
          recommendations: formData.recommendations || null,
        }),
      });
      if (response.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create report');
      }
      setMessage('Report created successfully!');
      setFormData({
        class_id: initialClassId,
        course_id: '',
        week_of_reporting: '',
        date_of_lecture: '',
        actual_students_present: '',
        total_registered_students: '',
        venue_id: '',
        scheduled_lecture_time: '',
        topic_taught: '',
        learning_outcomes: '',
        recommendations: '',
      });
      setTimeout(() => navigate('/lecturer/reports'), 2000);
    } catch (err) {
      console.error('Create report error:', err);
      setError(err.message || 'Failed to create report');
    }
  };

  return (
    <div>
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">Lecturer Dashboard</a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/dashboard"><i className="bi bi-house-door"></i> Home</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/courses"><i className="bi bi-book"></i> Classes</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link active" to="/lecturer/reports"><i className="bi bi-file-earmark-text"></i> Reports</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/monitoring"><i className="bi bi-graph-up"></i> Monitoring</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/lecturer/rating"><i className="bi bi-star"></i> Rating</Link>
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

      {/* Report Form */}
      <div className="container mt-4">
        <h2 className="mb-4"><i className="bi bi-file-earmark-text"></i> Create Report</h2>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {message && <div className="alert alert-success" role="alert">{message}</div>}
        <form onSubmit={handleSubmit}>
          {/* Class Selection */}
          <div className="mb-3">
            <label htmlFor="class_id" className="form-label">Class <span className="text-danger">*</span></label>
            <select
              className="form-select"
              id="class_id"
              name="class_id"
              value={formData.class_id}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby="classHelp"
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.class_name} ({cls.course_names.join(', ')})</option>
              ))}
            </select>
            <div id="classHelp" className="form-text">Select a class for the report.</div>
          </div>
          {/* Course Selection */}
          <div className="mb-3">
            <label htmlFor="course_id" className="form-label">Course <span className="text-danger">*</span></label>
            <select
              className="form-select"
              id="course_id"
              name="course_id"
              value={formData.course_id}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby="courseHelp"
              disabled={!formData.class_id}
            >
              <option value="">Select Course</option>
              {formData.class_id && classes.find(cls => cls.id === parseInt(formData.class_id))?.course_ids.map((id, index) => (
                <option key={id} value={id}>
                  {classes.find(cls => cls.id === parseInt(formData.class_id)).course_names[index]}
                </option>
              ))}
            </select>
            <div id="courseHelp" className="form-text">Select a course assigned to the class.</div>
          </div>
          {/* Week of Reporting */}
          <div className="mb-3">
            <label htmlFor="week_of_reporting" className="form-label">Week of Reporting <span className="text-danger">*</span></label>
            <input
              type="number"
              className="form-control"
              id="week_of_reporting"
              name="week_of_reporting"
              value={formData.week_of_reporting}
              onChange={handleChange}
              min="1"
              max="52"
              required
              aria-required="true"
              aria-describedby="weekHelp"
            />
            <div id="weekHelp" className="form-text">Enter the week number (1-52).</div>
          </div>
          {/* Date of Lecture */}
          <div className="mb-3">
            <label htmlFor="date_of_lecture" className="form-label">Date of Lecture <span className="text-danger">*</span></label>
            <input
              type="date"
              className="form-control"
              id="date_of_lecture"
              name="date_of_lecture"
              value={formData.date_of_lecture}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby="dateHelp"
            />
            <div id="dateHelp" className="form-text">Select the date of the lecture.</div>
          </div>
          {/* Actual Students */}
          <div className="mb-3">
            <label htmlFor="actual_students_present" className="form-label">Actual Students Present <span className="text-danger">*</span></label>
            <input
              type="number"
              className="form-control"
              id="actual_students_present"
              name="actual_students_present"
              value={formData.actual_students_present}
              onChange={handleChange}
              min="0"
              required
              aria-required="true"
              aria-describedby="actualStudentsHelp"
            />
            <div id="actualStudentsHelp" className="form-text">Enter the number of students present.</div>
          </div>
          {/* Total Registered Students */}
          <div className="mb-3">
            <label htmlFor="total_registered_students" className="form-label">Total Registered Students</label>
            <input
              type="number"
              className="form-control"
              id="total_registered_students"
              name="total_registered_students"
              value={formData.total_registered_students}
              readOnly
              aria-describedby="totalStudentsHelp"
            />
            <div id="totalStudentsHelp" className="form-text">Automatically populated based on course selection.</div>
          </div>
          {/* Venue */}
          <div className="mb-3">
            <label htmlFor="venue_id" className="form-label">Venue <span className="text-danger">*</span></label>
            <select
              className="form-select"
              id="venue_id"
              name="venue_id"
              value={formData.venue_id}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby="venueHelp"
            >
              <option value="">Select Venue</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>{venue.name} (Capacity: {venue.capacity})</option>
              ))}
            </select>
            <div id="venueHelp" className="form-text">Select the lecture venue.</div>
          </div>
          {/* Lecture Time */}
          <div className="mb-3">
            <label htmlFor="scheduled_lecture_time" className="form-label">Scheduled Lecture Time <span className="text-danger">*</span></label>
            <input
              type="time"
              className="form-control"
              id="scheduled_lecture_time"
              name="scheduled_lecture_time"
              value={formData.scheduled_lecture_time}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby="timeHelp"
            />
            <div id="timeHelp" className="form-text">Enter the scheduled lecture time.</div>
          </div>
          {/* Topic */}
          <div className="mb-3">
            <label htmlFor="topic_taught" className="form-label">Topic Taught <span className="text-danger">*</span></label>
            <input
              type="text"
              className="form-control"
              id="topic_taught"
              name="topic_taught"
              value={formData.topic_taught}
              onChange={handleChange}
              required
              maxLength="255"
              aria-required="true"
              aria-describedby="topicHelp"
            />
            <div id="topicHelp" className="form-text">Enter the topic taught in the lecture (max 255 characters).</div>
          </div>
          {/* Learning Outcomes */}
          <div className="mb-3">
            <label htmlFor="learning_outcomes" className="form-label">Learning Outcomes <span className="text-danger">*</span></label>
            <textarea
              className="form-control"
              id="learning_outcomes"
              name="learning_outcomes"
              value={formData.learning_outcomes}
              onChange={handleChange}
              required
              rows="4"
              maxLength="1000"
              aria-required="true"
              aria-describedby="outcomesHelp"
            />
            <div id="outcomesHelp" className="form-text">Describe the learning outcomes achieved (max 1000 characters).</div>
          </div>
          {/* Recommendations */}
          <div className="mb-3">
            <label htmlFor="recommendations" className="form-label">Recommendations (Optional)</label>
            <textarea
              className="form-control"
              id="recommendations"
              name="recommendations"
              value={formData.recommendations}
              onChange={handleChange}
              rows="4"
              maxLength="1000"
              aria-describedby="recommendationsHelp"
            />
            <div id="recommendationsHelp" className="form-text">Provide any recommendations for improvement (max 1000 characters).</div>
          </div>
          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              !formData.class_id ||
              !formData.course_id ||
              !formData.week_of_reporting ||
              !formData.date_of_lecture ||
              !formData.actual_students_present ||
              !formData.venue_id ||
              !formData.scheduled_lecture_time ||
              !formData.topic_taught ||
              !formData.learning_outcomes
            }
            aria-label="Submit report"
          >
            Submit Report
          </button>
          <Link
            to="/lecturer/reports"
            className="btn btn-secondary ms-2"
            aria-label="Cancel and return to reports"
          >
            Cancel
          </Link>
        </form>
      </div>
    </div>
  );
}

export default LecturerReportForm;