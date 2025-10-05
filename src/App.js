
// App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import Homepage from './Homepage';
import AdminDashboard from './admin/AdminDashboard';
import FacultyList from './admin/FacultyList';
import FacultyForm from './admin/FacultyForm';
import CourseList from './admin/CourseList';
import CourseForm from './admin/CourseForm';
import UserList from './admin/UserList';
import UserForm from './admin/UserForm';
import LecturerCourseAssignment from './admin/LecturerCourseAssignment';
import ReportList from './admin/ReportList';
import ReportForm from './admin/ReportForm';

//PRL-side components
import PRLDashboard from './prl/PRLDashboard.js';
import LecturerList from './prl/LecturerList';
import PRLReportList from './prl/PRLReportList';
import ClassCourseAssignment from './prl/ClassCourseAssignment.js';
import PRLReportForm from './prl/PRLReportForm.js';
import PRLLecturerClassAssignment from './prl/PRLLecturerClassAssignment.js';
import PRLRating from './prl/PRLRating.js';
import PRLFacultySelection from './prl/PRLFacultySelection.js';


import Login from './Login';
import Register from './Register';
import ProtectedRoute from './ProtectedRoute';
import 'bootstrap/dist/css/bootstrap.min.css';

// Lecturer-side components
import LecturerDashboard from './lecturer/LecturerDashboard';
import CourseManagement from './lecturer/CourseManagement';
import GradeForm from './lecturer/GradeForm';
import LecturerReportList from './lecturer/LecturerReportList.js';
import LecturerReportForm from './lecturer/LecturerReportForm.js';
import LecturerMonitoring from './lecturer/LecturerMonitoring.js';
import LecturerRating from './lecturer/LecturerRating.js';
import LecturerClasses from './lecturer/LecturerClasses.js';
import LecturerPRLSelection from './lecturer/LecturerPRLSelection.js';

// Student-side components
import StudentDashboard from './student/StudentDashboard.js';
import EnrollmentForm from './student/EnrollmentForm.js';
import Monitoring from './student/Monitoring.js';
import RatingForm from './student/RatingForm.js';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Homepage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<div className="container mt-4"><h2>Unauthorized</h2><p>You do not have permission to access this page.</p></div>} />
          
          {/* PL protected routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute role={['PL', 'PRL']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/faculties" element={<ProtectedRoute role={['PL']}><FacultyList /></ProtectedRoute>} />
          <Route path="/admin/faculties/new" element={<ProtectedRoute role={['PL']}><FacultyForm /></ProtectedRoute>} />
          <Route path="/admin/faculties/edit/:id" element={<ProtectedRoute role={['PL']}><FacultyForm /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute role={['PL']}><CourseList /></ProtectedRoute>} />
          <Route path="/admin/courses/new" element={<ProtectedRoute role={['PL']}><CourseForm /></ProtectedRoute>} />
          <Route path="/admin/courses/edit/:id" element={<ProtectedRoute role={['PL']}><CourseForm /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute role={['PL']}><UserList /></ProtectedRoute>} />
          <Route path="/admin/users/new" element={<ProtectedRoute role={['PL']}><UserForm /></ProtectedRoute>} />
          <Route path="/admin/users/edit/:id" element={<ProtectedRoute role={['PL']}><UserForm /></ProtectedRoute>} />
          <Route path="/admin/lecturer-courses" element={<ProtectedRoute role={['PL']}><LecturerCourseAssignment /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute role={['PL']}><ReportList /></ProtectedRoute>} />
          <Route path="/admin/reports/new" element={<ProtectedRoute role={['PL']}><ReportForm /></ProtectedRoute>} />
          
          {/* PRL protected routes */}
          <Route path="/prl/dashboard" element={<ProtectedRoute role={['PRL']}><PRLDashboard /></ProtectedRoute>} />
          <Route path="/prl/reports" element={<ProtectedRoute role={['PRL']}><PRLReportList /></ProtectedRoute>} />
          <Route path="/prl/reports/new" element={<ProtectedRoute role={['PRL']}><PRLReportForm /></ProtectedRoute>} />
          <Route path="/prl/lecturers" element={<ProtectedRoute role={['PRL']}><LecturerList /></ProtectedRoute>} />
          <Route path="/prl/class-courses" element={<ProtectedRoute role={['PRL']}><ClassCourseAssignment /></ProtectedRoute>} />
          <Route path="/prl/lecturer-classes" element={<ProtectedRoute role={['PRL']}><PRLLecturerClassAssignment /></ProtectedRoute>} />
          <Route path="/prl/rating" element={<ProtectedRoute role="PRL"><PRLRating /></ProtectedRoute>} />
          <Route path="/prl/faculty-selection" element={<ProtectedRoute role="PRL"><PRLFacultySelection /></ProtectedRoute>} />
          
          {/* Lecturer protected routes */}
          <Route path="/lecturer/dashboard" element={<ProtectedRoute role="Lecturer"><LecturerDashboard /></ProtectedRoute>} />
          <Route path="/lecturer/courses" element={<ProtectedRoute role="Lecturer"><CourseManagement /></ProtectedRoute>} />
          <Route path="/lecturer/courses/:id/grades" element={<ProtectedRoute role="Lecturer"><GradeForm /></ProtectedRoute>} />
          <Route path="/lecturer/reports" element={<ProtectedRoute role="Lecturer"><LecturerReportList /></ProtectedRoute>} />
          <Route path="/lecturer/reports/new" element={<ProtectedRoute role="Lecturer"><LecturerReportForm /></ProtectedRoute>} />
          <Route path="/lecturer/monitoring" element={<ProtectedRoute role="Lecturer"><LecturerMonitoring /></ProtectedRoute>} />
          <Route path="/lecturer/rating" element={<ProtectedRoute role="Lecturer"><LecturerRating /></ProtectedRoute>} />
          <Route path="/lecturer/classes" element={<ProtectedRoute role="Lecturer"><LecturerClasses /></ProtectedRoute>} />
          <Route path="/lecturer/prl-selection" element={<ProtectedRoute role="Lecturer"><LecturerPRLSelection /></ProtectedRoute>} />

          {/* Student protected routes */}
          <Route path="/student/dashboard" element={<ProtectedRoute role="Student"><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/enroll" element={<ProtectedRoute role="Student"><EnrollmentForm /></ProtectedRoute>} />
          <Route path="/student/monitoring" element={<ProtectedRoute role="Student"><Monitoring /></ProtectedRoute>} />
          <Route path="/student/rating" element={<ProtectedRoute role="Student"><RatingForm /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
