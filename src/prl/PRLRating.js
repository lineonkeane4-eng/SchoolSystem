import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function PRLRating() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [lecturers, setLecturers] = useState([]);
  const [prlRatings, setPRLRatings] = useState({});
  const [studentRatings, setStudentRatings] = useState({});
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedRating, setSelectedRating] = useState({});
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
        // Fetch PRL's assigned faculty
        const facultyRes = await fetch(`${apiUrl}/prl/current-faculty`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (facultyRes.status === 401 || facultyRes.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!facultyRes.ok) {
          const data = await facultyRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch assigned faculty');
        }
        const facultyData = await facultyRes.json();
        setFaculty(facultyData);

        // Fetch lecturers in PRL's stream
        const lecturersRes = await fetch(`${apiUrl}/prl/lecturers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (lecturersRes.status === 401 || lecturersRes.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!lecturersRes.ok) {
          const data = await lecturersRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch lecturers');
        }
        const lecturersData = await lecturersRes.json();
        setLecturers(Array.isArray(lecturersData) ? lecturersData : []);

        // Fetch PRL ratings
        const prlRatingsRes = await fetch(`${apiUrl}/prl/lecturer-ratings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (prlRatingsRes.status === 401 || prlRatingsRes.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!prlRatingsRes.ok) {
          const data = await prlRatingsRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch PRL ratings');
        }
        const prlRatingsData = await prlRatingsRes.json();
        const prlRatingsMap = {};
        prlRatingsData.forEach((rating) => {
          prlRatingsMap[rating.lecturer_id] = { rating: rating.rating, comments: rating.comments };
        });
        setPRLRatings(prlRatingsMap);

        // Fetch student ratings
        const studentRatingsRes = await fetch(`${apiUrl}/prl/student-ratings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (studentRatingsRes.status === 401 || studentRatingsRes.status === 403) {
          logout();
          navigate('/login');
          return;
        }
        if (!studentRatingsRes.ok) {
          const data = await studentRatingsRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch student ratings');
        }
        const studentRatingsData = await studentRatingsRes.json();
        const studentRatingsMap = {};
        studentRatingsData.forEach((rating) => {
          studentRatingsMap[rating.lecturer_id] = { average_rating: rating.average_rating, rating_count: rating.rating_count };
        });
        setStudentRatings(studentRatingsMap);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate, logout, token]);

  const handleStarClick = (lecturerId, rating) => {
    setSelectedRating((prev) => ({ ...prev, [lecturerId]: rating }));
  };

  const handleRatingSubmit = async (lecturerId, comments) => {
    const rating = selectedRating[lecturerId];
    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5 stars.');
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${apiUrl}/prl/submit-rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lecturer_id: lecturerId, rating, comments }),
      });
      if (res.status === 401 || res.status === 403) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit rating');
      }
      const data = await res.json();
      setSuccess(data.message || 'Rating submitted successfully');
      setPRLRatings((prev) => ({
        ...prev,
        [lecturerId]: { rating, comments },
      }));
      setSelectedRating((prev) => ({ ...prev, [lecturerId]: 0 }));
    } catch (err) {
      console.error('Submit rating error:', err);
      setError(err.message || 'Failed to submit rating.');
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
                <Link className="nav-link" to="/prl/dashboard" aria-label="PRL Dashboard Home">
                  <i className="bi bi-house-door"></i> Home
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/reports" aria-label="View Lecture Reports">
                  <i className="bi bi-file-earmark-text"></i> Reports
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/lecturers" aria-label="View Lecturers in Your Faculty">
                  <i className="bi bi-person"></i> Lecturers
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/class-courses" aria-label="Manage Class-Course Assignments">
                  <i className="bi bi-book"></i> Class-Course Assignments
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/lecturer-classes" aria-label="Assign Lecturers to Classes">
                  <i className="bi bi-person-plus"></i> Lecturer-Class Assignments
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link active" aria-current="page" to="/prl/rating" aria-label="Rate Lecturers in Your Stream">
                  <i className="bi bi-star"></i> Rating
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/prl/faculty-selection" aria-label="Select Faculty">
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
              aria-label="Logout"
            >
              Logout <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </nav>

      <div className="container mt-4">
        <h1 className="mb-4">
          <i className="bi bi-star"></i> Rate Lecturers in Your Stream
        </h1>
        <style>
          {`
            .star-rating {
              display: inline-flex;
              font-size: 1.5rem;
              cursor: pointer;
            }
            .star-rating .bi-star-fill {
              color: #ddd;
            }
            .star-rating .bi-star-fill.filled {
              color: #ffc107;
            }
            .star-rating .bi-star-fill:hover,
            .star-rating .bi-star-fill:hover ~ .bi-star-fill {
              color: #ffca2c;
            }
          `}
        </style>
        {faculty && (
          <div className="alert alert-info" role="alert" aria-live="assertive">
            Rating lecturers for <strong>{faculty.name}</strong> faculty.
          </div>
        )}
        {error && (
          <div className="alert alert-danger" role="alert" aria-live="assertive">
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success" role="alert" aria-live="assertive">
            {success}
          </div>
        )}
        <div className="card shadow-sm">
          <div className="card-body">
            {loading ? (
              <div className="text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : lecturers.length === 0 ? (
              <div className="alert alert-info" role="alert" aria-live="assertive">
                No lecturers found in your stream.
              </div>
            ) : (
              <ul className="list-group">
                {lecturers.map((lecturer) => (
                  <li
                    key={lecturer.id}
                    className="list-group-item"
                    aria-label={`Rate lecturer ${lecturer.full_name}`}
                  >
                    <h5>{lecturer.full_name}</h5>
                    <p className="mb-1">
                      <strong>Email:</strong> {lecturer.email}
                    </p>
                    <p className="mb-1">
                      <strong>Course:</strong> {lecturer.course_name || 'N/A'}
                    </p>
                    <p className="mb-1">
                      <strong>Faculty:</strong> {lecturer.faculty_name || 'N/A'}
                    </p>
                    {prlRatings[lecturer.id] && (
                      <div className="mb-3">
                        <p>
                          <strong>Your Rating:</strong>{' '}
                          {[...Array(prlRatings[lecturer.id].rating)].map((_, i) => (
                            <i key={i} className="bi bi-star-fill text-warning"></i>
                          ))}
                          {[...Array(5 - prlRatings[lecturer.id].rating)].map((_, i) => (
                            <i key={i} className="bi bi-star-fill text-secondary"></i>
                          ))}{' '}
                          ({prlRatings[lecturer.id].rating}/5)
                        </p>
                        {prlRatings[lecturer.id].comments && (
                          <p>
                            <strong>Your Comments:</strong> {prlRatings[lecturer.id].comments}
                          </p>
                        )}
                      </div>
                    )}
                    {studentRatings[lecturer.id] ? (
                      <div className="mb-3">
                        <p>
                          <strong>Student Average Rating:</strong>{' '}
                          {[...Array(Math.round(studentRatings[lecturer.id].average_rating))].map((_, i) => (
                            <i key={i} className="bi bi-star-fill text-warning"></i>
                          ))}
                          {[...Array(5 - Math.round(studentRatings[lecturer.id].average_rating))].map((_, i) => (
                            <i key={i} className="bi bi-star-fill text-secondary"></i>
                          ))}{' '}
                          ({studentRatings[lecturer.id].average_rating.toFixed(1)}/5, {studentRatings[lecturer.id].rating_count} ratings)
                        </p>
                      </div>
                    ) : (
                      <div className="mb-3">
                        <p>
                          <strong>Student Average Rating:</strong> No ratings yet
                        </p>
                      </div>
                    )}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const comments = e.target.comments.value;
                        handleRatingSubmit(lecturer.id, comments);
                        e.target.reset();
                      }}
                    >
                      <div className="mb-3">
                        <label className="form-label">Your Rating</label>
                        <div className="star-rating" role="radiogroup" aria-label={`Rate ${lecturer.full_name}`}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <i
                              key={star}
                              className={`bi bi-star-fill ${selectedRating[lecturer.id] >= star ? 'filled' : ''}`}
                              onClick={() => handleStarClick(lecturer.id, star)}
                              role="radio"
                              aria-checked={selectedRating[lecturer.id] === star}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  handleStarClick(lecturer.id, star);
                                }
                              }}
                            ></i>
                          ))}
                        </div>
                      </div>
                      <div className="mb-3">
                        <label htmlFor={`comments-${lecturer.id}`} className="form-label">
                          Comments (Optional)
                        </label>
                        <textarea
                          id={`comments-${lecturer.id}`}
                          name="comments"
                          className="form-control"
                          rows="3"
                        ></textarea>
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!selectedRating[lecturer.id]}
                        aria-disabled={!selectedRating[lecturer.id]}
                      >
                        <i className="bi bi-star-fill me-2"></i>Submit Rating
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PRLRating;