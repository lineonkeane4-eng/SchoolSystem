import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function RatingForm() {
  const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedLecturer, setSelectedLecturer] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch enrolled courses for suggestions
  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/student/enrolled-courses`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (response.ok) setCourses(data);
      } catch (err) {
        setError('Error fetching courses: ' + err.message);
      }
    };
    fetchEnrolledCourses();
  }, []);

  // Fetch lecturers for suggestions
  useEffect(() => {
    const fetchLecturers = async () => {
      if (selectedCourse) {
        try {
          const response = await fetch(
            `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/student/course-lecturers?course_name=${encodeURIComponent(selectedCourse)}`,
            {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }
          );
          const data = await response.json();
          if (response.ok) setLecturers(data);
        } catch (err) {
          setError('Error fetching lecturers: ' + err.message);
        }
      } else {
        setLecturers([]);
      }
    };
    fetchLecturers();
  }, [selectedCourse]);

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedCourse || !selectedLecturer || rating < 1 || rating > 5) {
      setError('Please enter course, lecturer, and provide a rating (1–5 stars)');
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/student/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ course_name: selectedCourse, lecturer_name: selectedLecturer, rating })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Rating submitted successfully');
        setSelectedCourse('');
        setSelectedLecturer('');
        setRating(0);
        setHoverRating(0);
      } else {
        setError(data.error || 'Failed to submit rating');
      }
    } catch (err) {
      setError('Error submitting rating: ' + err.message);
    }
  };

  const handleStarClick = (value) => setRating(value);
  const handleStarHover = (value) => setHoverRating(value);
  const handleStarLeave = () => setHoverRating(0);

  return (
    <div className="container mt-4">
      <h2 className="mb-4"><i className="bi bi-star-fill me-2"></i>Rate a Lecturer</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmitRating}>
            <div className="mb-3">
              <label htmlFor="courseInput" className="form-label">Course</label>
              <input
                type="text"
                id="courseInput"
                className="form-control"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                list="courseList"
                placeholder="Type course name..."
                required
              />
              <datalist id="courseList">
                {courses.map(course => (
                  <option key={course.id} value={course.name} />
                ))}
              </datalist>
            </div>

            <div className="mb-3">
              <label htmlFor="lecturerInput" className="form-label">Lecturer</label>
              <input
                type="text"
                id="lecturerInput"
                className="form-control"
                value={selectedLecturer}
                onChange={(e) => setSelectedLecturer(e.target.value)}
                list="lecturerList"
                placeholder="Type lecturer name..."
                required
              />
              <datalist id="lecturerList">
                {lecturers.map(lecturer => (
                  <option key={lecturer.id} value={lecturer.full_name} />
                ))}
              </datalist>
            </div>

            <div className="mb-3">
              <label className="form-label">Rating</label>
              <div className="d-flex align-items-center">
                {[1,2,3,4,5].map(star => (
                  <i
                    key={star}
                    className={`bi ${star <= (hoverRating || rating) ? 'bi-star-fill' : 'bi-star'} fs-3 me-2`}
                    style={{ cursor: 'pointer', color: star <= (hoverRating || rating) ? '#ffc107' : '#6c757d' }}
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => handleStarHover(star)}
                    onMouseLeave={handleStarLeave}
                    role="button"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  />
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={!selectedCourse || !selectedLecturer || rating < 1}>
              <i className="bi bi-check-circle me-2"></i>Submit Rating
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RatingForm;
