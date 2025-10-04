// server.js
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs').promises;

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files for report downloads
app.use('/reports', express.static(path.join(__dirname, 'reports')));

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'luct_management_new',
};

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied: No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Audit log helper
async function logAction(connection, userId, action, details) {
  try {
    await connection.execute(
      'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, action, details]
    );
  } catch (err) {
    console.error('Failed to log action:', err.message);
  }
}

// Authentication Endpoints
app.post('/auth/register', async (req, res) => {
  const { fullName, email, password, confirmPassword, role } = req.body;
  const connection = await mysql.createConnection(dbConfig);

  try {
    if (!fullName || !email || !password || !confirmPassword || !role) {
      await logAction(connection, null, 'Registration Failed', 'Missing required fields');
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      await logAction(connection, null, 'Registration Failed', 'Passwords do not match');
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      await logAction(connection, null, 'Registration Failed', 'Invalid password format');
      return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' });
    }
    const [existingUser] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      await logAction(connection, null, 'Registration Failed', `Email already exists: ${email}`);
      return res.status(400).json({ error: 'Email already exists' });
    }
    const validRoles = ['PL', 'PRL', 'Lecturer', 'Student'];
    if (!validRoles.includes(role)) {
      await logAction(connection, null, 'Registration Failed', `Invalid role: ${role}`);
      return res.status(400).json({ error: 'Invalid role' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await connection.execute(
      'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
      [fullName, email, hashedPassword, role]
    );
    await logAction(connection, result.insertId, 'Registration', `${role} registered: ${email}`);
    res.json({ message: 'Registration successful, please log in' });
  } catch (err) {
    await logAction(connection, null, 'Registration Error', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    await connection.end();
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const connection = await mysql.createConnection(dbConfig);

  try {
    if (!email || !password) {
      await logAction(connection, null, 'Login Failed', 'Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const [users] = await connection.execute('SELECT id, full_name, email, password, role FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      await logAction(connection, null, 'Login Failed', `Invalid email: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await logAction(connection, user.id, 'Login Failed', `Invalid password for email: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user.id, role: user.role, fullName: user.full_name }, JWT_SECRET, { expiresIn: '1h' });
    await logAction(connection, user.id, 'Login', `User logged in: ${email}`);
    res.json({ token, role: user.role, fullName: user.full_name });
  } catch (err) {
    await logAction(connection, null, 'Login Error', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    await connection.end();
  }
});

app.post('/venues', authenticateToken, async (req, res) => {
  const { name } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (!['PRL', 'PL'].includes(req.user.role)) {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL/PL accessed /venues');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!name || name.length > 100) {
      await logAction(connection, req.user?.id, 'Create Venue Failed', 'Invalid or missing name');
      return res.status(400).json({ error: 'Venue name is required and must be 100 characters or less' });
    }
    const [result] = await connection.execute('INSERT INTO venues (name) VALUES (?)', [name]);
    await logAction(connection, req.user.id, 'Create Venue', `Venue created: ${name}`);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Create Venue Error', err.message);
    res.status(500).json({ error: 'Failed to create venue', details: err.message });
  } finally {
    await connection.end();
  }
});

// Class Management Endpoints
app.get('/classes', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (!['PRL', 'PL'].includes(req.user.role)) {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL/PL accessed /classes');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [classes] = await connection.execute(
      `SELECT c.id, c.name AS class_name, 
              GROUP_CONCAT(co.id) AS course_ids, 
              GROUP_CONCAT(co.name) AS course_names
       FROM classes c
       LEFT JOIN class_courses cc ON c.id = cc.class_id
       LEFT JOIN courses co ON cc.course_id = co.id
       GROUP BY c.id, c.name`
    );
    const formattedClasses = classes.map(cls => ({
      ...cls,
      course_ids: cls.course_ids ? cls.course_ids.split(',').map(Number) : [],
      course_names: cls.course_names ? cls.course_names.split(',') : []
    }));
    res.json(formattedClasses);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Classes Error', err.message);
    res.status(500).json({ error: 'Failed to fetch classes', details: err.message });
  } finally {
    await connection.end();
  }
});

app.post('/classes', authenticateToken, async (req, res) => {
  const { name } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (!['PRL', 'PL'].includes(req.user.role)) {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL/PL accessed /classes');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!name) {
      await logAction(connection, req.user?.id, 'Create Class Failed', 'Missing name');
      return res.status(400).json({ error: 'Class name is required' });
    }
    if (name.length > 50) {
      await logAction(connection, req.user?.id, 'Create Class Failed', 'Class name too long');
      return res.status(400).json({ error: 'Class name must be 50 characters or less' });
    }
    const [existingClass] = await connection.execute('SELECT id FROM classes WHERE name = ?', [name]);
    if (existingClass.length > 0) {
      await logAction(connection, req.user?.id, 'Create Class Failed', `Class already exists: ${name}`);
      return res.status(400).json({ error: 'Class name already exists' });
    }
    const [result] = await connection.execute(
      'INSERT INTO classes (name) VALUES (?)',
      [name]
    );
    await logAction(connection, req.user.id, 'Create Class', `Class created: ${name}`);
    res.status(201).json({ id: result.insertId, name, course_ids: [], course_names: [] });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Create Class Error', err.message);
    res.status(500).json({ error: 'Failed to create class', details: err.message });
  } finally {
    await connection.end();
  }
});


//Re[place the Class-Courses]==================andgthe delete
app.post('/class-courses', authenticateToken, async (req, res) => {
  const { class_id, course_id } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /class-courses');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!class_id || !course_id) {
      await logAction(connection, req.user?.id, 'Assign Class Course Failed', 'Missing required fields');
      return res.status(400).json({ error: 'Class ID and Course ID are required' });
    }
    const [faculty] = await connection.execute(
      `SELECT f.id
       FROM faculties f
       JOIN principal_lecturer_faculties plf ON f.id = plf.faculty_id
       WHERE plf.prl_id = ?`,
      [req.user.id]
    );
    if (faculty.length === 0) {
      await logAction(connection, req.user.id, 'Assign Class Course Failed', 'No faculty assigned to PRL');
      return res.status(400).json({ error: 'No faculty assigned to this PRL' });
    }
    const [classRecord] = await connection.execute(
      `SELECT id FROM classes WHERE id = ?`,
      [class_id]
    );
    if (classRecord.length === 0) {
      await logAction(connection, req.user?.id, 'Assign Class Course Failed', `Class not found: ${class_id}`);
      return res.status(404).json({ error: 'Class not found' });
    }
    const [course] = await connection.execute(
      `SELECT id FROM courses WHERE id = ? AND faculty_id = ?`,
      [course_id, faculty[0].id]
    );
    if (course.length === 0) {
      await logAction(connection, req.user?.id, 'Assign Class Course Failed', `Course not found or not in PRL's faculty: ${course_id}`);
      return res.status(404).json({ error: 'Course not found or not in your faculty' });
    }
    const [existingAssignment] = await connection.execute(
      'SELECT class_id FROM class_courses WHERE class_id = ? AND course_id = ?',
      [class_id, course_id]
    );
    if (existingAssignment.length > 0) {
      await logAction(connection, req.user?.id, 'Assign Class Course Failed', `Assignment already exists: ${class_id}, ${course_id}`);
      return res.status(400).json({ error: 'Class is already assigned to this course' });
    }
    const [result] = await connection.execute(
      'INSERT INTO class_courses (class_id, course_id) VALUES (?, ?)',
      [class_id, course_id]
    );
    await logAction(connection, req.user.id, 'Assign Class Course', `Class ${class_id} assigned to course ${course_id}`);
    res.status(201).json({ class_id, course_id, message: 'Course assigned to class successfully' });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Assign Class Course Error', err.message);
    res.status(500).json({ error: 'Failed to assign course to class', details: err.message });
  } finally {
    await connection.end();
  }
});

//delete
app.delete('/class-courses', authenticateToken, async (req, res) => {
  const { class_id, course_id } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /class-courses');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!class_id || !course_id) {
      await logAction(connection, req.user?.id, 'Unassign Class Course Failed', 'Missing required fields');
      return res.status(400).json({ error: 'Class ID and Course ID are required' });
    }
    const [faculty] = await connection.execute(
      `SELECT f.id
       FROM faculties f
       JOIN principal_lecturer_faculties plf ON f.id = plf.faculty_id
       WHERE plf.prl_id = ?`,
      [req.user.id]
    );
    if (faculty.length === 0) {
      await logAction(connection, req.user.id, 'Unassign Class Course Failed', 'No faculty assigned to PRL');
      return res.status(400).json({ error: 'No faculty assigned to this PRL' });
    }
    const [classRecord] = await connection.execute(
      `SELECT id FROM classes WHERE id = ?`,
      [class_id]
    );
    if (classRecord.length === 0) {
      await logAction(connection, req.user?.id, 'Unassign Class Course Failed', `Class not found: ${class_id}`);
      return res.status(404).json({ error: 'Class not found' });
    }
    const [course] = await connection.execute(
      `SELECT id FROM courses WHERE id = ? AND faculty_id = ?`,
      [course_id, faculty[0].id]
    );
    if (course.length === 0) {
      await logAction(connection, req.user?.id, 'Unassign Class Course Failed', `Course not found or not in PRL's faculty: ${course_id}`);
      return res.status(404).json({ error: 'Course not found or not in your faculty' });
    }
    const [assignment] = await connection.execute(
      'SELECT class_id FROM class_courses WHERE class_id = ? AND course_id = ?',
      [class_id, course_id]
    );
    if (assignment.length === 0) {
      await logAction(connection, req.user?.id, 'Unassign Class Course Failed', `Assignment not found: ${class_id}, ${course_id}`);
      return res.status(404).json({ error: 'Assignment not found' });
    }
    await connection.execute(
      'DELETE FROM class_courses WHERE class_id = ? AND course_id = ?',
      [class_id, course_id]
    );
    await logAction(connection, req.user.id, 'Unassign Class Course', `Assignment deleted: ${class_id}, ${course_id}`);
    res.json({ message: 'Course unassigned from class successfully' });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Unassign Class Course Error', err.message);
    res.status(500).json({ error: 'Failed to unassign course from class', details: err.message });
  } finally {
    await connection.end();
  }
});



// Faculty Management Endpoints
app.get('/faculties', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [faculties] = await connection.execute('SELECT id, name FROM faculties');
    res.json(faculties);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Faculties Error', err.message);
    res.status(500).json({ error: 'Failed to fetch faculties', details: err.message });
  } finally {
    await connection.end();
  }
});

app.get('/faculties/:id', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [faculties] = await connection.execute('SELECT id, name FROM faculties WHERE id = ?', [req.params.id]);
    if (faculties.length === 0) {
      await logAction(connection, req.user?.id, 'Fetch Faculty Failed', `Faculty not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Faculty not found' });
    }
    res.json(faculties[0]);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Faculty Error', err.message);
    res.status(500).json({ error: 'Failed to fetch faculty', details: err.message });
  } finally {
    await connection.end();
  }
});

app.post('/faculties', authenticateToken, async (req, res) => {
  const { name } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /faculties');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!name || name.length > 100) {
      await logAction(connection, req.user?.id, 'Create Faculty Failed', 'Invalid or missing name');
      return res.status(400).json({ error: 'Faculty name is required and must be 100 characters or less' });
    }
    const [result] = await connection.execute('INSERT INTO faculties (name) VALUES (?)', [name]);
    await logAction(connection, req.user.id, 'Create Faculty', `Faculty created: ${name}`);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Create Faculty Error', err.message);
    res.status(500).json({ error: 'Failed to create faculty', details: err.message });
  } finally {
    await connection.end();
  }
});

app.put('/faculties/:id', authenticateToken, async (req, res) => {
  const { name } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /faculties/:id');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!name || name.length > 100) {
      await logAction(connection, req.user?.id, 'Update Faculty Failed', 'Invalid or missing name');
      return res.status(400).json({ error: 'Faculty name is required and must be 100 characters or less' });
    }
    const [existingFaculty] = await connection.execute('SELECT id FROM faculties WHERE id = ?', [req.params.id]);
    if (existingFaculty.length === 0) {
      await logAction(connection, req.user?.id, 'Update Faculty Failed', `Faculty not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Faculty not found' });
    }
    await connection.execute('UPDATE faculties SET name = ? WHERE id = ?', [name, req.params.id]);
    await logAction(connection, req.user.id, 'Update Faculty', `Faculty updated: ${name}, ID: ${req.params.id}`);
    res.json({ id: req.params.id, name });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Update Faculty Error', err.message);
    res.status(500).json({ error: 'Failed to update faculty', details: err.message });
  } finally {
    await connection.end();
  }
});

app.delete('/faculties/:id', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /faculties/:id');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [existingFaculty] = await connection.execute('SELECT id FROM faculties WHERE id = ?', [req.params.id]);
    if (existingFaculty.length === 0) {
      await logAction(connection, req.user?.id, 'Delete Faculty Failed', `Faculty not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Faculty not found' });
    }
    const [relatedCourses] = await connection.execute('SELECT id FROM courses WHERE faculty_id = ?', [req.params.id]);
    if (relatedCourses.length > 0) {
      await logAction(connection, req.user?.id, 'Delete Faculty Failed', `Faculty has associated courses: ${req.params.id}`);
      return res.status(400).json({ error: 'Cannot delete faculty with associated courses' });
    }
    await connection.execute('DELETE FROM faculties WHERE id = ?', [req.params.id]);
    await logAction(connection, req.user.id, 'Delete Faculty', `Faculty deleted: ${req.params.id}`);
    res.json({ message: 'Faculty deleted successfully' });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Delete Faculty Error', err.message);
    res.status(500).json({ error: 'Failed to delete faculty', details: err.message });
  } finally {
    await connection.end();
  }
});

// Course Management Endpoints
app.get('/courses', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [courses] = await connection.execute(
      `SELECT c.id, c.name, c.faculty_id, c.code, 
              COALESCE(c.total_registered_students, 0) AS total_registered_students, 
              f.name AS facultyName
       FROM courses c
       LEFT JOIN faculties f ON c.faculty_id = f.id`
    );
    res.json(courses);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Courses Error', err.message);
    res.status(500).json({ error: 'Failed to fetch courses', details: err.message });
  } finally {
    await connection.end();
  }
});

app.get('/courses/:id', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [courses] = await connection.execute(
      `SELECT c.id, c.name, c.faculty_id, c.code, 
              COALESCE(c.total_registered_students, 0) AS total_registered_students, 
              f.name AS facultyName
       FROM courses c
       LEFT JOIN faculties f ON c.faculty_id = f.id
       WHERE c.id = ?`,
      [req.params.id]
    );
    if (courses.length === 0) {
      await logAction(connection, req.user?.id, 'Fetch Course Failed', `Course not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(courses[0]);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Course Error', err.message);
    res.status(500).json({ error: 'Failed to fetch course', details: err.message });
  } finally {
    await connection.end();
  }
});

app.post('/courses', authenticateToken, async (req, res) => {
  const { name, faculty_id, code } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /courses');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!name || !faculty_id) {
      await logAction(connection, req.user?.id, 'Create Course Failed', 'Missing required fields');
      return res.status(400).json({ error: 'Course name and faculty ID are required' });
    }
    if (name.length > 100) {
      await logAction(connection, req.user?.id, 'Create Course Failed', 'Name too long');
      return res.status(400).json({ error: 'Course name must be 100 characters or less' });
    }
    if (code && code.length > 10) {
      await logAction(connection, req.user?.id, 'Create Course Failed', 'Code too long');
      return res.status(400).json({ error: 'Course code must be 10 characters or less' });
    }
    const [faculty] = await connection.execute('SELECT id FROM faculties WHERE id = ?', [faculty_id]);
    if (faculty.length === 0) {
      await logAction(connection, req.user?.id, 'Create Course Failed', `Invalid faculty ID: ${faculty_id}`);
      return res.status(400).json({ error: 'Invalid faculty ID' });
    }
    const [result] = await connection.execute(
      'INSERT INTO courses (name, faculty_id, code, total_registered_students) VALUES (?, ?, ?, 0)',
      [name, faculty_id, code || null]
    );
    await logAction(connection, req.user.id, 'Create Course', `Course created: ${name}`);
    res.status(201).json({ id: result.insertId, name, faculty_id, code, total_registered_students: 0 });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Create Course Error', err.message);
    res.status(500).json({ error: 'Failed to create course', details: err.message });
  } finally {
    await connection.end();
  }
});

app.put('/courses/:id', authenticateToken, async (req, res) => {
  const { name, faculty_id, code } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /courses/:id');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!name || !faculty_id) {
      await logAction(connection, req.user?.id, 'Update Course Failed', 'Missing required fields');
      return res.status(400).json({ error: 'Course name and faculty ID are required' });
    }
    if (name.length > 100) {
      await logAction(connection, req.user?.id, 'Update Course Failed', 'Name too long');
      return res.status(400).json({ error: 'Course name must be 100 characters or less' });
    }
    if (code && code.length > 10) {
      await logAction(connection, req.user?.id, 'Update Course Failed', 'Code too long');
      return res.status(400).json({ error: 'Course code must be 10 characters or less' });
    }
    const [course] = await connection.execute('SELECT id FROM courses WHERE id = ?', [req.params.id]);
    if (course.length === 0) {
      await logAction(connection, req.user?.id, 'Update Course Failed', `Course not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Course not found' });
    }
    const [faculty] = await connection.execute('SELECT id FROM faculties WHERE id = ?', [faculty_id]);
    if (faculty.length === 0) {
      await logAction(connection, req.user?.id, 'Update Course Failed', `Invalid faculty ID: ${faculty_id}`);
      return res.status(400).json({ error: 'Invalid faculty ID' });
    }
    await connection.execute(
      'UPDATE courses SET name = ?, faculty_id = ?, code = ? WHERE id = ?',
      [name, faculty_id, code || null, req.params.id]
    );
    await logAction(connection, req.user.id, 'Update Course', `Course updated: ${name}, ID: ${req.params.id}`);
    res.json({ id: req.params.id, name, faculty_id, code });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Update Course Error', err.message);
    res.status(500).json({ error: 'Failed to update course', details: err.message });
  } finally {
    await connection.end();
  }
});

app.delete('/courses/:id', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /courses/:id');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [course] = await connection.execute('SELECT id FROM courses WHERE id = ?', [req.params.id]);
    if (course.length === 0) {
      await logAction(connection, req.user?.id, 'Delete Course Failed', `Course not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Course not found' });
    }
    await connection.execute('DELETE FROM courses WHERE id = ?', [req.params.id]);
    await logAction(connection, req.user.id, 'Delete Course', `Course deleted: ${req.params.id}`);
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Delete Course Error', err.message);
    res.status(500).json({ error: 'Failed to delete course', details: err.message });
  } finally {
    await connection.end();
  }
});

// User Management Endpoints
app.get('/users', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const role = req.query.role;
    const faculty_id = req.query.faculty_id ? parseInt(req.query.faculty_id) : null;

    if (req.user.role === 'PL' || (req.user.role === 'PRL' && role === 'Lecturer')) {
      let query = 'SELECT u.id, u.full_name, u.email, u.role FROM users u';
      const params = [];
      
      if (role) {
        query += ' WHERE u.role = ?';
        params.push(role);
      }

      if (faculty_id && role === 'Lecturer') {
        query += (role ? ' AND' : ' WHERE') + ' u.id IN (SELECT lc.lecturer_id FROM lecturer_courses lc JOIN courses c ON lc.course_id = c.id WHERE c.faculty_id = ?)';
        params.push(faculty_id);
      }

      const [users] = await connection.execute(query, params);
      res.json(users);
    } else {
      await logAction(connection, req.user?.id, 'Unauthorized Access', `User with role ${req.user.role} accessed /users`);
      return res.status(403).json({ error: 'Access denied' });
    }
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Users Error', err.message);
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  } finally {
    await connection.end();
  }
});

app.get('/admin/users', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /admin/users');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [users] = await connection.execute('SELECT id, full_name, email, role FROM users');
    res.json(users);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Users Error', err.message);
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  } finally {
    await connection.end();
  }
});

app.post('/admin/users', authenticateToken, async (req, res) => {
  const { full_name, email, password, role } = req.body;
  const connection = await mysql.createConnection(dbConfig);

  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /admin/users');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!full_name || !email || !password || !role) {
      await logAction(connection, req.user?.id, 'Create User Failed', 'Missing required fields');
      return res.status(400).json({ error: 'All fields are required' });
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      await logAction(connection, req.user?.id, 'Create User Failed', 'Invalid password format');
      return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' });
    }
    const [existingUser] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      await logAction(connection, req.user?.id, 'Create User Failed', `Email already exists: ${email}`);
      return res.status(400).json({ error: 'Email already exists' });
    }
    const validRoles = ['PL', 'PRL', 'Lecturer', 'Student'];
    if (!validRoles.includes(role)) {
      await logAction(connection, req.user?.id, 'Create User Failed', `Invalid role: ${role}`);
      return res.status(400).json({ error: 'Invalid role' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await connection.execute(
      'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
      [full_name, email, hashedPassword, role]
    );
    await logAction(connection, req.user.id, 'Create User', `User created: ${email}, Role: ${role}`);
    res.status(201).json({ id: result.insertId, full_name, email, role });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Create User Error', err.message);
    res.status(500).json({ error: 'Failed to create user', details: err.message });
  } finally {
    await connection.end();
  }
});

app.get('/users/:id', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /users/:id');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [users] = await connection.execute('SELECT id, full_name, email, role FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) {
      await logAction(connection, req.user?.id, 'Fetch User Failed', `User not found: ${req.params.id}`);
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(users[0]);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch User Error', err.message);
    res.status(500).json({ error: 'Failed to fetch user', details: err.message });
  } finally {
    await connection.end();
  }
});

app.put('/users/:id', authenticateToken, async (req, res) => {
  const { full_name, email, password, role } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /users/:id');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!full_name || !email || !role) {
      await logAction(connection, req.user?.id, 'Update User Failed', 'Missing required fields');
      return res.status(400).json({ error: 'Full name, email, and role are required' });
    }
    const [existingUser] = await connection.execute('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (existingUser.length === 0) {
      await logAction(connection, req.user?.id, 'Update User Failed', `User not found: ${req.params.id}`);
      return res.status(404).json({ error: 'User not found' });
    }
    const updateData = { full_name, email, role };
    if (password) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        await logAction(connection, req.user?.id, 'Update User Failed', 'Invalid password format');
        return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }
    await connection.execute(
      'UPDATE users SET full_name = ?, email = ?, role = ?, password = COALESCE(?, password) WHERE id = ?',
      [full_name, email, role, updateData.password, req.params.id]
    );
    await logAction(connection, req.user.id, 'Update User', `User updated: ${email}, ID: ${req.params.id}`);
    res.json({ id: req.params.id, full_name, email, role });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Update User Error', err.message);
    res.status(500).json({ error: 'Failed to update user', details: err.message });
  } finally {
    await connection.end();
  }
});

app.delete('/users/:id', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /users/:id');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [existingUser] = await connection.execute('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (existingUser.length === 0) {
      await logAction(connection, req.user?.id, 'Delete User Failed', `User not found: ${req.params.id}`);
      return res.status(404).json({ error: 'User not found' });
    }
    await connection.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    await logAction(connection, req.user.id, 'Delete User', `User deleted: ${req.params.id}`);
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Delete User Error', err.message);
    res.status(500).json({ error: 'Failed to delete user', details: err.message });
  } finally {
    await connection.end();
  }
});

// Lecturer-Course Assignment Endpoints
app.get('/admin/lecturer-courses', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /admin/lecturer-courses');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [assignments] = await connection.execute(
      `SELECT lc.lecturer_id, lc.course_id, u.full_name AS lecturer_name, c.name AS course_name, f.name AS faculty_name
       FROM lecturer_courses lc
       JOIN users u ON lc.lecturer_id = u.id
       JOIN courses c ON lc.course_id = c.id
       JOIN faculties f ON c.faculty_id = f.id`
    );
    res.json(assignments);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Lecturer Courses Error', err.message);
    res.status(500).json({ error: 'Failed to fetch assignments', details: err.message });
  } finally {
    await connection.end();
  }
});

app.post('/pl/lecturer-courses', authenticateToken, async (req, res) => {
  const { lecturer_id, course_id } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /pl/lecturer-courses');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!lecturer_id || !course_id) {
      await logAction(connection, req.user?.id, 'Assign Lecturer Course Failed', 'Missing required fields');
      return res.status(400).json({ error: 'Lecturer ID and Course ID are required' });
    }
    const [lecturer] = await connection.execute('SELECT id FROM users WHERE id = ? AND role = ?', [lecturer_id, 'Lecturer']);
    const [course] = await connection.execute('SELECT id FROM courses WHERE id = ?', [course_id]);
    if (lecturer.length === 0) {
      await logAction(connection, req.user?.id, 'Assign Lecturer Course Failed', `Lecturer not found: ${lecturer_id}`);
      return res.status(404).json({ error: 'Lecturer not found' });
    }
    if (course.length === 0) {
      await logAction(connection, req.user?.id, 'Assign Lecturer Course Failed', `Course not found: ${course_id}`);
      return res.status(404).json({ error: 'Course not found' });
    }
    const [result] = await connection.execute(
      'INSERT IGNORE INTO lecturer_courses (lecturer_id, course_id) VALUES (?, ?)',
      [lecturer_id, course_id]
    );
    if (result.affectedRows === 0) {
      await logAction(connection, req.user?.id, 'Assign Lecturer Course Failed', `Assignment already exists: ${lecturer_id}, ${course_id}`);
      return res.status(400).json({ error: 'Assignment already exists' });
    }
    const [newAssignment] = await connection.execute(
      `SELECT lc.lecturer_id, lc.course_id, u.full_name AS lecturer_name, c.name AS course_name, f.name AS faculty_name
       FROM lecturer_courses lc
       JOIN users u ON lc.lecturer_id = u.id
       JOIN courses c ON lc.course_id = c.id
       JOIN faculties f ON c.faculty_id = f.id
       WHERE lc.lecturer_id = ? AND lc.course_id = ?`,
      [lecturer_id, course_id]
    );
    await logAction(connection, req.user.id, 'Assign Lecturer Course', `Lecturer ${lecturer_id} assigned to course ${course_id}`);
    res.status(201).json(newAssignment[0] || { message: 'Lecturer assigned to course' });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Assign Lecturer Course Error', err.message);
    res.status(500).json({ error: 'Failed to assign lecturer to course', details: err.message });
  } finally {
    await connection.end();
  }
});

app.delete('/admin/lecturer-courses', authenticateToken, async (req, res) => {
  const { lecturer_id, course_id } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /admin/lecturer-courses');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!lecturer_id || !course_id) {
      await logAction(connection, req.user?.id, 'Delete Lecturer Course Failed', 'Missing required fields');
      return res.status(400).json({ error: 'Lecturer ID and Course ID are required' });
    }
    const [assignment] = await connection.execute(
      'SELECT lecturer_id, course_id FROM lecturer_courses WHERE lecturer_id = ? AND course_id = ?',
      [lecturer_id, course_id]
    );
    if (assignment.length === 0) {
      await logAction(connection, req.user?.id, 'Delete Lecturer Course Failed', `Assignment not found: ${lecturer_id}, ${course_id}`);
      return res.status(404).json({ error: 'Assignment not found' });
    }
    await connection.execute(
      'DELETE FROM lecturer_courses WHERE lecturer_id = ? AND course_id = ?',
      [lecturer_id, course_id]
    );
    await logAction(connection, req.user.id, 'Delete Lecturer Course', `Assignment deleted: ${lecturer_id}, ${course_id}`);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Delete Lecturer Course Error', err.message);
    res.status(500).json({ error: 'Failed to delete assignment', details: err.message });
  } finally {
    await connection.end();
  }
});

// Report Management Endpoints
app.get('/pl/reports', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /pl/reports');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [reports] = await connection.execute(
      'SELECT id, type, file_path, generated_at FROM pl_reports ORDER BY generated_at DESC'
    );
    res.json(reports);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Reports Error', err.message);
    res.status(500).json({ error: 'Failed to fetch reports', details: err.message });
  } finally {
    await connection.end();
  }
});

app.post('/pl/reports', authenticateToken, async (req, res) => {
  const { type } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /pl/reports');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!['student_registration', 'course_completion', 'lecturer_workload'].includes(type)) {
      await logAction(connection, req.user?.id, 'Generate Report Failed', `Invalid report type: ${type}`);
      return res.status(400).json({ error: 'Invalid report type' });
    }

    let records = [];
    let csvWriter;
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const filename = `${type}_${timestamp}.csv`;
    const filePath = path.join(__dirname, 'reports', filename);

    if (type === 'student_registration') {
      [records] = await connection.execute(
        `SELECT u.full_name, u.email, c.name AS course_name, f.name AS faculty_name
         FROM student_courses sc
         JOIN users u ON sc.student_id = u.id
         JOIN courses c ON sc.course_id = c.id
         JOIN faculties f ON c.faculty_id = f.id
         WHERE u.role = 'Student'`
      );
      csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'full_name', title: 'Student Name' },
          { id: 'email', title: 'Email' },
          { id: 'course_name', title: 'Course' },
          { id: 'faculty_name', title: 'Faculty' },
        ],
      });
    } else if (type === 'course_completion') {
      [records] = await connection.execute(
        `SELECT c.name AS course_name, f.name AS faculty_name,
                COALESCE(c.total_registered_students, 0) AS total_registered_students
         FROM courses c
         LEFT JOIN faculties f ON c.faculty_id = f.id`
      );
      csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'course_name', title: 'Course' },
          { id: 'faculty_name', title: 'Faculty' },
          { id: 'total_registered_students', title: 'Registered Students' },
        ],
      });
    } else if (type === 'lecturer_workload') {
      [records] = await connection.execute(
        `SELECT u.full_name, COUNT(lc.course_id) AS course_count
         FROM users u
         LEFT JOIN lecturer_courses lc ON u.id = lc.lecturer_id
         WHERE u.role = 'Lecturer'
         GROUP BY u.id, u.full_name`
      );
      csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'full_name', title: 'Lecturer Name' },
          { id: 'course_count', title: 'Number of Courses' },
        ],
      });
    }

    await csvWriter.writeRecords(records);

    const [result] = await connection.execute(
      'INSERT INTO pl_reports (type, file_path, generated_at) VALUES (?, ?, ?)',
      [type, `/reports/${filename}`, new Date()]
    );
    await logAction(connection, req.user.id, 'Generate Report', `Report generated: ${type}, File: ${filename}`);
    res.status(201).json({
      id: result.insertId,
      type,
      file_path: `/reports/${filename}`,
      generated_at: new Date(),
    });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Generate Report Error', err.message);
    res.status(500).json({ error: 'Failed to generate report', details: err.message });
  } finally {
    await connection.end();
  }
});

app.delete('/admin/reports/:id', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PL accessed /admin/reports/:id');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [report] = await connection.execute('SELECT id, file_path FROM pl_reports WHERE id = ?', [req.params.id]);
    if (report.length === 0) {
      await logAction(connection, req.user?.id, 'Delete Report Failed', `Report not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Report not found' });
    }
    const filePath = path.join(__dirname, report[0].file_path);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn(`Failed to delete file ${filePath}: ${err.message}`);
    }
    await connection.execute('DELETE FROM pl_reports WHERE id = ?', [req.params.id]);
    await logAction(connection, req.user.id, 'Delete Report', `Report deleted: ${req.params.id}`);
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Delete Report Error', err.message);
    res.status(500).json({ error: 'Failed to delete report', details: err.message });
  } finally {
    await connection.end();
  }
});

// PRL Report Management Endpoints
app.get('/prl/reports', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /prl/reports');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [reports] = await connection.execute(
      `SELECT r.id, r.lecturer_id, u.full_name AS lecturer_name, r.class_id, c.name AS class_name, r.week_of_reporting,
              r.date_of_lecture, r.course_id, co.name AS course_name, r.actual_students_present,
              r.total_registered_students, r.venue_id, v.name AS venue_name, r.scheduled_lecture_time,
              r.topic_taught, r.learning_outcomes, r.recommendations, r.prl_feedback, r.created_at,
              f.name AS faculty_name
       FROM reports r
       JOIN users u ON r.lecturer_id = u.id
       JOIN classes c ON r.class_id = c.id
       JOIN courses co ON r.course_id = co.id
       JOIN faculties f ON co.faculty_id = f.id
       JOIN venues v ON r.venue_id = v.id
       ORDER BY r.created_at DESC`
    );
    res.json(reports);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch PRL Reports Error', err.message);
    res.status(500).json({ error: 'Failed to fetch reports', details: err.message });
  } finally {
    await connection.end();
  }
});

app.post('/prl/reports', authenticateToken, async (req, res) => {
  const {
    lecturer_id, class_id, week_of_reporting, date_of_lecture, course_id,
    actual_students_present, total_registered_students, venue_id, scheduled_lecture_time,
    topic_taught, learning_outcomes, recommendations, prl_feedback
  } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /prl/reports');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!lecturer_id || !class_id || !week_of_reporting || !date_of_lecture || !course_id ||
        actual_students_present === undefined || actual_students_present === null ||
        total_registered_students === undefined || total_registered_students === null ||
        !venue_id || !scheduled_lecture_time || !topic_taught || !learning_outcomes) {
      await logAction(connection, req.user?.id, 'Create PRL Report Failed', 'Missing or invalid required fields');
      return res.status(400).json({ error: 'All required fields must be provided and valid' });
    }
    if (week_of_reporting < 1 || week_of_reporting > 52) {
      await logAction(connection, req.user?.id, 'Create PRL Report Failed', `Invalid week_of_reporting: ${week_of_reporting}`);
      return res.status(400).json({ error: 'Week of reporting must be between 1 and 52' });
    }
    if (actual_students_present < 0) {
      await logAction(connection, req.user?.id, 'Create PRL Report Failed', `Invalid actual_students_present: ${actual_students_present}`);
      return res.status(400).json({ error: 'Actual students present cannot be negative' });
    }
    if (total_registered_students < 0) {
      await logAction(connection, req.user?.id, 'Create PRL Report Failed', `Invalid total_registered_students: ${total_registered_students}`);
      return res.status(400).json({ error: 'Total registered students cannot be negative' });
    }
    const [lecturer] = await connection.execute('SELECT id FROM users WHERE id = ? AND role = ?', [lecturer_id, 'Lecturer']);
    if (lecturer.length === 0) {
      await logAction(connection, req.user?.id, 'Create PRL Report Failed', `Lecturer not found: ${lecturer_id}`);
      return res.status(404).json({ error: 'Lecturer not found' });
    }
    const [course] = await connection.execute('SELECT id FROM courses WHERE id = ?', [course_id]);
    if (course.length === 0) {
      await logAction(connection, req.user?.id, 'Create PRL Report Failed', `Course not found: ${course_id}`);
      return res.status(404).json({ error: 'Course not found' });
    }
    const [venue] = await connection.execute('SELECT id FROM venues WHERE id = ?', [venue_id]);
    if (venue.length === 0) {
      await logAction(connection, req.user?.id, 'Create PRL Report Failed', `Venue not found: ${venue_id}`);
      return res.status(404).json({ error: 'Venue not found' });
    }
    const [classRecord] = await connection.execute('SELECT id FROM classes WHERE id = ?', [class_id]);
    if (classRecord.length === 0) {
      await logAction(connection, req.user?.id, 'Create PRL Report Failed', `Class not found: ${class_id}`);
      return res.status(404).json({ error: 'Class not found' });
    }
    const [classCourse] = await connection.execute(
      'SELECT class_id FROM class_courses WHERE class_id = ? AND course_id = ?',
      [class_id, course_id]
    );
    if (classCourse.length === 0) {
      await logAction(connection, req.user?.id, 'Create PRL Report Failed', `Class ${class_id} not assigned to course ${course_id}`);
      return res.status(400).json({ error: 'Class is not assigned to the selected course' });
    }
    const [lecturerClass] = await connection.execute(
      'SELECT lecturer_id FROM lecturer_classes WHERE lecturer_id = ? AND class_id = ?',
      [lecturer_id, class_id]
    );
    if (lecturerClass.length === 0) {
      await logAction(connection, req.user?.id, 'Create PRL Report Failed', `Lecturer ${lecturer_id} not assigned to class ${class_id}`);
      return res.status(400).json({ error: 'Lecturer is not assigned to the selected class' });
    }
    const [result] = await connection.execute(
      `INSERT INTO reports (
        lecturer_id, class_id, week_of_reporting, date_of_lecture, course_id,
        actual_students_present, total_registered_students, venue_id, scheduled_lecture_time,
        topic_taught, learning_outcomes, recommendations, prl_feedback
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lecturer_id, class_id, week_of_reporting, date_of_lecture, course_id,
        actual_students_present, total_registered_students, venue_id, scheduled_lecture_time,
        topic_taught, learning_outcomes, recommendations || null, prl_feedback || null
      ]
    );
    const [newReport] = await connection.execute(
      `SELECT r.id, r.lecturer_id, u.full_name AS lecturer_name, r.class_id, c.name AS class_name, r.week_of_reporting,
              r.date_of_lecture, r.course_id, co.name AS course_name, r.actual_students_present,
              r.total_registered_students, r.venue_id, v.name AS venue_name, r.scheduled_lecture_time,
              r.topic_taught, r.learning_outcomes, r.recommendations, r.prl_feedback, r.created_at
       FROM reports r
       JOIN users u ON r.lecturer_id = u.id
       JOIN classes c ON r.class_id = c.id
       JOIN courses co ON r.course_id = co.id
       JOIN venues v ON r.venue_id = v.id
       WHERE r.id = ?`,
      [result.insertId]
    );
    await logAction(connection, req.user.id, 'Create PRL Report', `Report created for lecturer ${lecturer_id}, class ${class_id}`);
    res.status(201).json(newReport[0]);
  } catch (err) {
    console.error('Create PRL Report Error:', err);
    await logAction(connection, req.user?.id, 'Create PRL Report Error', err.message);
    res.status(500).json({ error: 'Failed to create report', details: err.message });
  } finally {
    await connection.end();
  }
});

app.delete('/prl/reports/:id', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /prl/reports/:id');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [report] = await connection.execute('SELECT id FROM reports WHERE id = ?', [req.params.id]);
    if (report.length === 0) {
      await logAction(connection, req.user?.id, 'Delete PRL Report Failed', `Report not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Report not found' });
    }
    await connection.execute('DELETE FROM reports WHERE id = ?', [req.params.id]);
    await logAction(connection, req.user.id, 'Delete PRL Report', `Report deleted: ${req.params.id}`);
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Delete PRL Report Error', err.message);
    res.status(500).json({ error: 'Failed to delete report', details: err.message });
  } finally {
    await connection.end();
  }
});

// PRL Faculty Management
app.get('/prl/faculties', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /prl/faculties');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [faculties] = await connection.execute(
      `SELECT f.id, f.name
       FROM faculties f
       JOIN principal_lecturer_faculties plf ON f.id = plf.faculty_id
       WHERE plf.prl_id = ?`,
      [req.user.id]
    );
    if (faculties.length === 0) {
      await logAction(connection, req.user.id, 'Fetch PRL Faculties Failed', 'No faculties assigned to PRL');
      return res.status(404).json({ error: 'No faculties assigned to this Principal Lecturer' });
    }
    await logAction(connection, req.user.id, 'Fetch PRL Faculties', `Successfully fetched ${faculties.length} faculties`);
    res.json(faculties);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch PRL Faculties Error', err.message);
    res.status(500).json({ error: 'Failed to fetch faculties', details: err.message });
  } finally {
    await connection.end();
  }
});

// PRL Lecturer Management
// Replace existing GET /prl/lecturers in server.js

app.get('/prl/lecturers', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /prl/lecturers');
      return res.status(403).json({ error: 'Access denied' });
    }
    // Get PRL's assigned faculty
    const [faculty] = await connection.execute(
      `SELECT f.id, f.name
       FROM faculties f
       JOIN principal_lecturer_faculties plf ON f.id = plf.faculty_id
       WHERE plf.prl_id = ?`,
      [req.user.id]
    );
    if (faculty.length === 0) {
      await logAction(connection, req.user.id, 'Fetch Lecturers Failed', 'No faculty assigned to PRL');
      return res.status(400).json({ error: 'No faculty assigned to this PRL' });
    }
    // Fetch lecturers assigned to this PRL and teaching in the PRL's faculty
    const [lecturers] = await connection.execute(
      `SELECT DISTINCT u.id, u.full_name, u.email, c.name AS course_name, f.name AS faculty_name
       FROM users u
       JOIN lecturer_prl lp ON u.id = lp.lecturer_id
       JOIN lecturer_courses lc ON u.id = lc.lecturer_id
       JOIN courses c ON lc.course_id = c.id
       JOIN faculties f ON c.faculty_id = f.id
       WHERE lp.prl_id = ? AND f.id = ?`,
      [req.user.id, faculty[0].id]
    );
    await logAction(connection, req.user.id, 'Fetch Lecturers', `Fetched ${lecturers.length} lecturers for PRL ${req.user.id} in faculty ${faculty[0].name}`);
    res.json(lecturers);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Lecturers Error', err.message);
    res.status(500).json({ error: 'Failed to fetch lecturers', details: err.message });
  } finally {
    await connection.end();
  }
});

//THEE PRL CLASSES FACULTY
app.get('/prl/classes', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /prl/classes');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [faculty] = await connection.execute(
      `SELECT f.id, f.name
       FROM faculties f
       JOIN principal_lecturer_faculties plf ON f.id = plf.faculty_id
       WHERE plf.prl_id = ?`,
      [req.user.id]
    );
    if (faculty.length === 0) {
      await logAction(connection, req.user.id, 'Fetch Classes Failed', 'No faculty assigned to PRL');
      return res.status(404).json({ error: 'No faculty assigned to this PRL' });
    }
    const [classes] = await connection.execute(
      `SELECT c.id, c.name AS class_name, 
              GROUP_CONCAT(cc.course_id) AS course_ids, 
              GROUP_CONCAT(co.name) AS course_names
       FROM classes c
       LEFT JOIN class_courses cc ON c.id = cc.class_id
       LEFT JOIN courses co ON cc.course_id = co.id
       WHERE co.faculty_id = ? OR co.id IS NULL
       GROUP BY c.id, c.name`,
      [faculty[0].id]
    );
    const formattedClasses = classes.map(cls => ({
      ...cls,
      course_ids: cls.course_ids ? cls.course_ids.split(',').map(Number) : [],
      course_names: cls.course_names ? cls.course_names.split(',') : []
    }));
    await logAction(connection, req.user.id, 'Fetch Classes', `Fetched ${formattedClasses.length} classes for PRL ${req.user.id}`);
    res.json(formattedClasses);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Classes Error', err.message);
    res.status(500).json({ error: 'Failed to fetch classes', details: err.message });
  } finally {
    await connection.end();
  }
});

//Appended the prl courses under faculty
app.get('/prl/courses', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /prl/courses');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [faculty] = await connection.execute(
      `SELECT f.id
       FROM faculties f
       JOIN principal_lecturer_faculties plf ON f.id = plf.faculty_id
       WHERE plf.prl_id = ?`,
      [req.user.id]
    );
    if (faculty.length === 0) {
      await logAction(connection, req.user.id, 'Fetch Courses Failed', 'No faculty assigned to PRL');
      return res.status(404).json({ error: 'No faculty assigned to this PRL' });
    }
    const [courses] = await connection.execute(
      `SELECT id, name, COALESCE(total_registered_students, 0) AS total_registered_students
       FROM courses
       WHERE faculty_id = ?`,
      [faculty[0].id]
    );
    await logAction(connection, req.user.id, 'Fetch Courses', `Fetched ${courses.length} courses for PRL ${req.user.id}`);
    res.json(courses);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Courses Error', err.message);
    res.status(500).json({ error: 'Failed to fetch courses', details: err.message });
  } finally {
    await connection.end();
  }
});



// Lecturer-Class Assignment Endpoint (corrected)
app.get('/lecturer-classes', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    let query = `
      SELECT lc.lecturer_id, lc.class_id, u.full_name AS lecturer_name, c.name AS class_name,
             GROUP_CONCAT(DISTINCT co.id) AS course_ids, GROUP_CONCAT(DISTINCT co.name) AS course_names
      FROM lecturer_classes lc
      JOIN users u ON lc.lecturer_id = u.id
      JOIN classes c ON lc.class_id = c.id
      LEFT JOIN class_courses cc ON c.id = cc.class_id
      LEFT JOIN courses co ON cc.course_id = co.id
    `;
    let params = [];

    if (req.user.role === 'PRL') {
      const [faculties] = await connection.execute(
        'SELECT faculty_id FROM principal_lecturer_faculties WHERE prl_id = ?',
        [req.user.id]
      );
      if (faculties.length === 0) {
        await logAction(connection, req.user.id, 'Fetch Lecturer Classes Failed', 'No faculties assigned to PRL');
        return res.status(404).json({ error: 'No faculties assigned to this PRL' });
      }
      const facultyIds = faculties.map(f => f.faculty_id);
      // Build placeholders for IN (...) safely and set params to the raw ids
      const placeholders = facultyIds.map(() => '?').join(',');
      query += ` WHERE co.faculty_id IN (${placeholders})`;
      params = facultyIds;
    } else if (req.user.role === 'Lecturer') {
      query += ' WHERE lc.lecturer_id = ?';
      params = [req.user.id];
    }

    query += ' GROUP BY lc.lecturer_id, lc.class_id, u.full_name, c.name';

    const [assignments] = await connection.execute(query, params);

    const formattedAssignments = assignments.map(assignment => ({
      lecturer_id: assignment.lecturer_id,
      class_id: assignment.class_id,
      lecturer_name: assignment.lecturer_name,
      class_name: assignment.class_name,
      course_ids: assignment.course_ids ? assignment.course_ids.split(',').map(id => Number(id)) : [],
      course_names: assignment.course_names ? assignment.course_names.split(',') : []
    }));

    if (formattedAssignments.length === 0) {
      await logAction(connection, req.user.id, 'Fetch Lecturer Classes Failed', 'No lecturer-class assignments found');
      return res.status(404).json({ error: 'No lecturer-class assignments found' });
    }

    await logAction(connection, req.user.id, 'Fetch Lecturer Classes', `Successfully fetched ${formattedAssignments.length} assignments`);
    res.json(formattedAssignments);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Lecturer Classes Error', err.message);
    res.status(500).json({ error: 'Failed to fetch lecturer-class assignments', details: err.message });
  } finally {
    await connection.end();
  }
});


app.post('/lecturer-classes', authenticateToken, async (req, res) => {
  const { lecturer_id, class_id } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /lecturer-classes');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!lecturer_id || !class_id) {
      await logAction(connection, req.user?.id, 'Assign Lecturer Class Failed', 'Missing required fields');
      return res.status(400).json({ error: 'Lecturer ID and Class ID are required' });
    }
    const [lecturer] = await connection.execute('SELECT id FROM users WHERE id = ? AND role = ?', [lecturer_id, 'Lecturer']);
    if (lecturer.length === 0) {
      await logAction(connection, req.user?.id, 'Assign Lecturer Class Failed', `Lecturer not found: ${lecturer_id}`);
      return res.status(404).json({ error: 'Lecturer not found' });
    }
    const [classRecord] = await connection.execute('SELECT id FROM classes WHERE id = ?', [class_id]);
    if (classRecord.length === 0) {
      await logAction(connection, req.user?.id, 'Assign Lecturer Class Failed', `Class not found: ${class_id}`);
      return res.status(404).json({ error: 'Class not found' });
    }
    // Check if the class's courses belong to the PRL's faculties
    const [faculties] = await connection.execute(
      'SELECT faculty_id FROM principal_lecturer_faculties WHERE prl_id = ?',
      [req.user.id]
    );
    if (faculties.length === 0) {
      await logAction(connection, req.user.id, 'Assign Lecturer Class Failed', 'No faculties assigned to PRL');
      return res.status(404).json({ error: 'No faculties assigned to this PRL' });
    }
    const facultyIds = faculties.map(f => f.faculty_id);
    const [classCourses] = await connection.execute(
      `SELECT cc.course_id
       FROM class_courses cc
       JOIN courses co ON cc.course_id = co.id
       WHERE cc.class_id = ? AND co.faculty_id IN (?)`,
      [class_id, facultyIds]
    );
    if (classCourses.length === 0) {
      await logAction(connection, req.user.id, 'Assign Lecturer Class Failed', `Class ${class_id} not associated with PRL's faculties`);
      return res.status(400).json({ error: 'Class is not associated with your assigned faculties' });
    }
    const [existingAssignment] = await connection.execute(
      'SELECT lecturer_id FROM lecturer_classes WHERE lecturer_id = ? AND class_id = ?',
      [lecturer_id, class_id]
    );
    if (existingAssignment.length > 0) {
      await logAction(connection, req.user.id, 'Assign Lecturer Class Failed', `Assignment already exists: ${lecturer_id}, ${class_id}`);
      return res.status(400).json({ error: 'Lecturer is already assigned to this class' });
    }
    await connection.execute(
      'INSERT INTO lecturer_classes (lecturer_id, class_id) VALUES (?, ?)',
      [lecturer_id, class_id]
    );
    const [newAssignment] = await connection.execute(
      `SELECT lc.lecturer_id, lc.class_id, u.full_name AS lecturer_name, c.name AS class_name,
              GROUP_CONCAT(co.id) AS course_ids, GROUP_CONCAT(co.name) AS course_names
       FROM lecturer_classes lc
       JOIN users u ON lc.lecturer_id = u.id
       JOIN classes c ON lc.class_id = c.id
       LEFT JOIN class_courses cc ON c.id = cc.class_id
       LEFT JOIN courses co ON cc.course_id = co.id
       WHERE lc.lecturer_id = ? AND lc.class_id = ?
       GROUP BY lc.lecturer_id, lc.class_id, u.full_name, c.name`,
      [lecturer_id, class_id]
    );
    await logAction(connection, req.user.id, 'Assign Lecturer Class', `Lecturer ${lecturer_id} assigned to class ${class_id}`);
    res.status(201).json({
      ...newAssignment[0],
      course_ids: newAssignment[0].course_ids ? newAssignment[0].course_ids.split(',').map(Number) : [],
      course_names: newAssignment[0].course_names ? newAssignment[0].course_names.split(',') : []
    });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Assign Lecturer Class Error', err.message);
    res.status(500).json({ error: 'Failed to assign lecturer to class', details: err.message });
  } finally {
    await connection.end();
  }
});

app.delete('/lecturer-classes', authenticateToken, async (req, res) => {
  const { lecturer_id, class_id } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /lecturer-classes');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!lecturer_id || !class_id) {
      await logAction(connection, req.user?.id, 'Unassign Lecturer Class Failed', 'Missing required fields');
      return res.status(400).json({ error: 'Lecturer ID and Class ID are required' });
    }
    const [assignment] = await connection.execute(
      'SELECT lecturer_id FROM lecturer_classes WHERE lecturer_id = ? AND class_id = ?',
      [lecturer_id, class_id]
    );
    if (assignment.length === 0) {
      await logAction(connection, req.user.id, 'Unassign Lecturer Class Failed', `Assignment not found: ${lecturer_id}, ${class_id}`);
      return res.status(404).json({ error: 'Assignment not found' });
    }
    const [faculties] = await connection.execute(
      'SELECT faculty_id FROM principal_lecturer_faculties WHERE prl_id = ?',
      [req.user.id]
    );
    if (faculties.length === 0) {
      await logAction(connection, req.user.id, 'Unassign Lecturer Class Failed', 'No faculties assigned to PRL');
      return res.status(404).json({ error: 'No faculties assigned to this PRL' });
    }
    const facultyIds = faculties.map(f => f.faculty_id);
    const [classCourses] = await connection.execute(
      `SELECT cc.course_id
       FROM class_courses cc
       JOIN courses co ON cc.course_id = co.id
       WHERE cc.class_id = ? AND co.faculty_id IN (?)`,
      [class_id, facultyIds]
    );
    if (classCourses.length === 0) {
      await logAction(connection, req.user.id, 'Unassign Lecturer Class Failed', `Class ${class_id} not associated with PRL's faculties`);
      return res.status(400).json({ error: 'Class is not associated with your assigned faculties' });
    }
    await connection.execute(
      'DELETE FROM lecturer_classes WHERE lecturer_id = ? AND class_id = ?',
      [lecturer_id, class_id]
    );
    await logAction(connection, req.user.id, 'Unassign Lecturer Class', `Assignment deleted: ${lecturer_id}, ${class_id}`);
    res.json({ message: 'Lecturer unassigned from class successfully' });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Unassign Lecturer Class Error', err.message);
    res.status(500).json({ error: 'Failed to unassign lecturer from class', details: err.message });
  } finally {
    await connection.end();
  }
});

// Lecturer-Specific Endpoints
app.get('/lecturer/classes', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Lecturer') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Lecturer accessed /lecturer/classes');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [classes] = await connection.execute(
      `SELECT c.id, c.name AS class_name, 
              GROUP_CONCAT(co.id) AS course_ids, 
              GROUP_CONCAT(co.name) AS course_names
       FROM classes c
       JOIN lecturer_classes lc ON c.id = lc.class_id
       LEFT JOIN class_courses cc ON c.id = cc.class_id
       LEFT JOIN courses co ON cc.course_id = co.id
       WHERE lc.lecturer_id = ?
       GROUP BY c.id, c.name`,
      [req.user.id]
    );
    const formattedClasses = classes.map(cls => ({
      ...cls,
      course_ids: cls.course_ids ? cls.course_ids.split(',').map(Number) : [],
      course_names: cls.course_names ? cls.course_names.split(',') : []
    }));
    if (formattedClasses.length === 0) {
      await logAction(connection, req.user.id, 'Fetch Lecturer Classes Failed', 'No classes assigned to lecturer');
      return res.status(404).json({ error: 'No classes assigned to this lecturer' });
    }
    await logAction(connection, req.user.id, 'Fetch Lecturer Classes', `Successfully fetched ${formattedClasses.length} classes`);
    res.json(formattedClasses);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Lecturer Classes Error', err.message);
    res.status(500).json({ error: 'Failed to fetch classes', details: err.message });
  } finally {
    await connection.end();
  }
});

app.get('/lecturer/reports', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Lecturer') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Lecturer accessed /lecturer/reports');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [reports] = await connection.execute(
      `SELECT r.id, r.class_id, c.name AS class_name, r.week_of_reporting,
              r.date_of_lecture, r.course_id, co.name AS course_name, r.actual_students_present,
              r.total_registered_students, r.venue_id, v.name AS venue_name, r.scheduled_lecture_time,
              r.topic_taught, r.learning_outcomes, r.recommendations, r.prl_feedback, r.created_at,
              f.name AS faculty_name
       FROM reports r
       JOIN classes c ON r.class_id = c.id
       JOIN courses co ON r.course_id = co.id
       JOIN faculties f ON co.faculty_id = f.id
       JOIN venues v ON r.venue_id = v.id
       WHERE r.lecturer_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    if (reports.length === 0) {
      await logAction(connection, req.user.id, 'Fetch Lecturer Reports Failed', 'No reports found for lecturer');
      return res.status(404).json({ error: 'No reports found for this lecturer' });
    }
    await logAction(connection, req.user.id, 'Fetch Lecturer Reports', `Successfully fetched ${reports.length} reports`);
    res.json(reports);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Lecturer Reports Error', err.message);
    res.status(500).json({ error: 'Failed to fetch reports', details: err.message });
  } finally {
    await connection.end();
  }
});



// Student APIs
app.post('/student/rate', authenticateToken, async (req, res) => {
  const { course_name, lecturer_name, rating } = req.body;
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Only students allowed
    if (req.user.role !== 'Student') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Student accessed /student/rate');
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate input
    if (!course_name || !lecturer_name || !rating) {
      await logAction(connection, req.user.id, 'Rate Failed', 'Missing course_name, lecturer_name, or rating');
      return res.status(400).json({ error: 'Course name, Lecturer name, and rating are required' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      await logAction(connection, req.user.id, 'Rate Failed', `Invalid rating: ${rating}`);
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // Lookup course by name
    const [courseRows] = await connection.execute(
      'SELECT id FROM courses WHERE name = ?',
      [course_name]
    );
    if (courseRows.length === 0) {
      await logAction(connection, req.user.id, 'Rate Failed', `Course not found: ${course_name}`);
      return res.status(404).json({ error: 'Course not found' });
    }
    const course_id = courseRows[0].id;

    // Lookup lecturer by name
    const [lecturerRows] = await connection.execute(
      'SELECT id FROM users WHERE full_name = ? AND role = "Lecturer"',
      [lecturer_name]
    );
    if (lecturerRows.length === 0) {
      await logAction(connection, req.user.id, 'Rate Failed', `Lecturer not found: ${lecturer_name}`);
      return res.status(404).json({ error: 'Lecturer not found' });
    }
    const lecturer_id = lecturerRows[0].id;

    // Verify student is enrolled in the course
    const [enrolled] = await connection.execute(
      'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
      [req.user.id, course_id]
    );
    if (enrolled.length === 0) {
      await logAction(connection, req.user.id, 'Rate Failed', `Not enrolled in course: ${course_name}`);
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    // Verify lecturer is assigned to the class (optional but recommended)
    const [studentClass] = await connection.execute(
      'SELECT class_id FROM student_classes WHERE student_id = ?',
      [req.user.id]
    );
    if (studentClass.length === 0) {
      await logAction(connection, req.user.id, 'Rate Failed', 'Student not enrolled in any class');
      return res.status(403).json({ error: 'You must be enrolled in a class to submit ratings' });
    }
    const class_id = studentClass[0].class_id;

    const [lecturerCheck] = await connection.execute(
      'SELECT lecturer_id FROM lecturer_classes WHERE lecturer_id = ? AND class_id = ?',
      [lecturer_id, class_id]
    );
    if (lecturerCheck.length === 0) {
      await logAction(connection, req.user.id, 'Rate Failed', `Lecturer ${lecturer_name} not assigned to class`);
      return res.status(400).json({ error: 'Lecturer is not assigned to this class' });
    }

    // Check if rating already exists
    const [existingRating] = await connection.execute(
      'SELECT id FROM ratings WHERE student_id = ? AND course_id = ? AND lecturer_id = ?',
      [req.user.id, course_id, lecturer_id]
    );
    if (existingRating.length > 0) {
      await logAction(connection, req.user.id, 'Rate Failed', `Already rated lecturer ${lecturer_name} for course ${course_name}`);
      return res.status(400).json({ error: 'You have already rated this lecturer for this course' });
    }

    // Insert rating
    await connection.execute(
      'INSERT INTO ratings (student_id, lecturer_id, course_id, rating) VALUES (?, ?, ?, ?)',
      [req.user.id, lecturer_id, course_id, rating]
    );

    await logAction(connection, req.user.id, 'Rate', `Student ${req.user.id} rated lecturer ${lecturer_name} for course ${course_name} with ${rating} stars`);
    res.status(201).json({ message: 'Rating submitted successfully' });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Rate Error', err.message);
    res.status(500).json({ error: 'Failed to submit rating', details: err.message });
  } finally {
    await connection.end();
  }
});


//============ Monitoring===========//
// Student Monitoring APIs
app.get('/student/attendance-details', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Student') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Student accessed /student/attendance-details');
      return res.status(403).json({ error: 'Access denied' });
    }
    const course_id = req.query.course_id ? parseInt(req.query.course_id) : null;
    if (course_id) {
      const [enrollment] = await connection.execute(
        `SELECT student_id FROM enrollments WHERE student_id = ? AND course_id = ?`,
        [req.user.id, course_id]
      );
      if (enrollment.length === 0) {
        await logAction(connection, req.user.id, 'Fetch Attendance Details Failed', `Not enrolled in course: ${course_id}`);
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }
    }
    let query = `
      SELECT r.id AS report_id, r.date, c.name AS course_name, sa.attended
      FROM reports r
      JOIN enrollments e ON r.course_id = e.course_id
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN student_attendance sa ON r.id = sa.report_id AND sa.student_id = e.student_id
      WHERE e.student_id = ?
    `;
    const params = [req.user.id];
    if (course_id) {
      query += ' AND e.course_id = ?';
      params.push(course_id);
    }
    query += ' ORDER BY r.date DESC';
    const [attendanceDetails] = await connection.execute(query, params);
    await logAction(connection, req.user.id, 'Fetch Attendance Details', `Fetched ${attendanceDetails.length} attendance records for user: ${req.user.id}${course_id ? `, course: ${course_id}` : ''}`);
    res.json(attendanceDetails);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Attendance Details Error', err.message);
    res.status(500).json({ error: 'Failed to fetch attendance details', details: err.message });
  } finally {
    await connection.end();
  }
});

// Student Monitoring APIs
app.get('/student/attendance-details', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Student') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Student accessed /student/attendance-details');
      return res.status(403).json({ error: 'Access denied' });
    }
    const course_id = req.query.course_id ? parseInt(req.query.course_id) : null;
    if (course_id) {
      const [enrollment] = await connection.execute(
        `SELECT student_id FROM enrollments WHERE student_id = ? AND course_id = ?`,
        [req.user.id, course_id]
      );
      if (enrollment.length === 0) {
        await logAction(connection, req.user.id, 'Fetch Attendance Details Failed', `Not enrolled in course: ${course_id}`);
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }
    }
    let query = `
      SELECT r.id AS report_id, r.date, c.name AS course_name, sa.attended
      FROM reports r
      JOIN enrollments e ON r.course_id = e.course_id
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN student_attendance sa ON r.id = sa.report_id AND sa.student_id = e.student_id
      WHERE e.student_id = ?
    `;
    const params = [req.user.id];
    if (course_id) {
      query += ' AND e.course_id = ?';
      params.push(course_id);
    }
    query += ' ORDER BY r.date DESC';
    const [attendanceDetails] = await connection.execute(query, params);
    await logAction(connection, req.user.id, 'Fetch Attendance Details', `Fetched ${attendanceDetails.length} attendance records for user: ${req.user.id}${course_id ? `, course: ${course_id}` : ''}`);
    res.json(attendanceDetails);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Attendance Details Error', err.message);
    res.status(500).json({ error: 'Failed to fetch attendance details', details: err.message });
  } finally {
    await connection.end();
  }
});

app.get('/student/course-progress', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Student') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Student accessed /student/course-progress');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [progress] = await connection.execute(
      `SELECT 
        c.id AS course_id, 
        c.name AS course_name, 
        c.code AS course_code,
        (SELECT COUNT(*) FROM reports r WHERE r.course_id = c.id) AS total_classes,
        (SELECT COUNT(*) FROM student_attendance sa 
         JOIN reports r ON sa.report_id = r.id 
         WHERE r.course_id = c.id AND sa.student_id = e.student_id AND sa.attended = 1) AS attended_classes
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.student_id = ?`,
      [req.user.id]
    );
    const formattedProgress = progress.map(p => ({
      course_id: p.course_id,
      course_name: p.course_name,
      course_code: p.course_code,
      total_classes: parseInt(p.total_classes) || 0,
      attended_classes: parseInt(p.attended_classes) || 0,
      attendance_percentage: p.total_classes > 0 ? ((p.attended_classes / p.total_classes) * 100).toFixed(2) : '0.00'
    }));
    await logAction(connection, req.user.id, 'Fetch Course Progress', `Fetched progress for ${formattedProgress.length} courses for user: ${req.user.id}`);
    res.json(formattedProgress);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Course Progress Error', err.message);
    res.status(500).json({ error: 'Failed to fetch course progress', details: err.message });
  } finally {
    await connection.end();
  }
});

app.get('/student/reports', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Student') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Student accessed /student/reports');
      return res.status(403).json({ error: 'Access denied' });
    }
    const course_id = req.query.course_id ? parseInt(req.query.course_id) : null;
    if (!course_id) {
      await logAction(connection, req.user.id, 'Fetch Reports Failed', 'Missing course_id');
      return res.status(400).json({ error: 'Course ID is required' });
    }
    const [enrollment] = await connection.execute(
      `SELECT student_id FROM enrollments WHERE student_id = ? AND course_id = ?`,
      [req.user.id, course_id]
    );
    if (enrollment.length === 0) {
      await logAction(connection, req.user.id, 'Fetch Reports Failed', `Not enrolled in course: ${course_id}`);
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }
    const [reports] = await connection.execute(
      `SELECT r.id, r.date, c.name AS course_name, u.full_name AS lecturer_name
       FROM reports r
       JOIN courses c ON r.course_id = c.id
       JOIN users u ON r.lecturer_id = u.id
       WHERE r.course_id = ?`,
      [course_id]
    );
    await logAction(connection, req.user.id, 'Fetch Reports', `Fetched ${reports.length} reports for course: ${course_id}`);
    res.json(reports);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Reports Error', err.message);
    res.status(500).json({ error: 'Failed to fetch reports', details: err.message });
  } finally {
    await connection.end();
  }
});

//============ End of Monitoring ===========//
//============ Lecturer Monitoring ===========//

// Lecturer Monitoring APIs
app.get('/lecturer/class-students', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Lecturer') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Lecturer accessed /lecturer/class-students');
      return res.status(403).json({ error: 'Access denied' });
    }
    const class_id = req.query.class_id || null;
    if (!class_id) {
      await logAction(connection, req.user.id, 'Fetch Class Students Failed', 'Missing class_id');
      return res.status(400).json({ error: 'Class ID is required' });
    }
    // Validate class_id format (basic sanitization to prevent SQL injection)
    if (typeof class_id !== 'string' || class_id.length > 50) {
      await logAction(connection, req.user.id, 'Fetch Class Students Failed', `Invalid class_id format: ${class_id}`);
      return res.status(400).json({ error: 'Invalid class_id format' });
    }
    const [lecturerClass] = await connection.execute(
      `SELECT class_id FROM lecturer_classes WHERE lecturer_id = ? AND class_id = ?`,
      [req.user.id, class_id]
    );
    if (lecturerClass.length === 0) {
      await logAction(connection, req.user.id, 'Fetch Class Students Failed', `Not assigned to class: ${class_id}`);
      return res.status(403).json({ error: 'You are not assigned to this class' });
    }
    const [students] = await connection.execute(
      `SELECT u.id, u.full_name, u.email
       FROM users u
       JOIN student_classes sc ON u.id = sc.student_id
       WHERE sc.class_id = ? AND u.role = 'Student'`,
      [class_id]
    );
    await logAction(connection, req.user.id, 'Fetch Class Students', `Fetched ${students.length} students for class: ${class_id}`);
    res.json(students);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Class Students Error', err.message);
    res.status(500).json({ error: 'Failed to fetch class students', details: err.message });
  } finally {
    await connection.end();
  }
});

app.get('/lecturer/attendance', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Lecturer') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Lecturer accessed /lecturer/attendance');
      return res.status(403).json({ error: 'Access denied' });
    }
    const report_id = req.query.report_id ? parseInt(req.query.report_id) : null;
    if (!report_id) {
      await logAction(connection, req.user.id, 'Fetch Attendance Failed', 'Missing report_id');
      return res.status(400).json({ error: 'Report ID is required' });
    }
    const [report] = await connection.execute(
      `SELECT id, class_id FROM reports WHERE id = ? AND lecturer_id = ?`,
      [report_id, req.user.id]
    );
    if (report.length === 0) {
      await logAction(connection, req.user.id, 'Fetch Attendance Failed', `Not authorized for report: ${report_id}`);
      return res.status(403).json({ error: 'You are not authorized to view this report' });
    }
    const class_id = report[0].class_id;
    // Fetch all students in the class to ensure all are listed, even if no attendance record exists
    const [students] = await connection.execute(
      `SELECT u.id AS student_id, u.full_name AS student_name
       FROM users u
       JOIN student_classes sc ON u.id = sc.student_id
       WHERE sc.class_id = ? AND u.role = 'Student'`,
      [class_id]
    );
    const [attendanceRecords] = await connection.execute(
      `SELECT sa.student_id, sa.attended
       FROM student_attendance sa
       WHERE sa.report_id = ?`,
      [report_id]
    );
    // Merge attendance with student list, defaulting to false if no record
    const attendance = students.map(student => {
      const record = attendanceRecords.find(r => r.student_id === student.student_id);
      return {
        student_id: student.student_id,
        student_name: student.student_name,
        attended: record ? !!record.attended : false
      };
    });
    await logAction(connection, req.user.id, 'Fetch Attendance', `Fetched ${attendance.length} attendance records for report: ${report_id}`);
    res.json(attendance);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Attendance Error', err.message);
    res.status(500).json({ error: 'Failed to fetch attendance', details: err.message });
  } finally {
    await connection.end();
  }
});

app.post('/lecturer/submit-attendance', authenticateToken, async (req, res) => {
  const { report_id, attendance } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Lecturer') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Lecturer accessed /lecturer/submit-attendance');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!report_id || !Array.isArray(attendance)) {
      await logAction(connection, req.user.id, 'Submit Attendance Failed', 'Missing report_id or attendance array');
      return res.status(400).json({ error: 'Report ID and attendance array are required' });
    }
    const [report] = await connection.execute(
      `SELECT id, class_id FROM reports WHERE id = ? AND lecturer_id = ?`,
      [report_id, req.user.id]
    );
    if (report.length === 0) {
      await logAction(connection, req.user.id, 'Submit Attendance Failed', `Not authorized for report: ${report_id}`);
      return res.status(403).json({ error: 'You are not authorized to submit attendance for this report' });
    }
    const class_id = report[0].class_id;
    let actual_students_present = 0;
    for (const { student_id, attended } of attendance) {
      if (!student_id || typeof attended !== 'boolean') {
        await logAction(connection, req.user.id, 'Submit Attendance Failed', `Invalid student_id or attended for report: ${report_id}`);
        return res.status(400).json({ error: 'Invalid student_id or attended value' });
      }
      const [studentCheck] = await connection.execute(
        `SELECT student_id FROM student_classes WHERE student_id = ? AND class_id = ?`,
        [student_id, class_id]
      );
      if (studentCheck.length === 0) {
        await logAction(connection, req.user.id, 'Submit Attendance Failed', `Student ${student_id} not in class: ${class_id}`);
        return res.status(400).json({ error: `Student ${student_id} is not enrolled in this class` });
      }
      const [existingAttendance] = await connection.execute(
        `SELECT id FROM student_attendance WHERE report_id = ? AND student_id = ?`,
        [report_id, student_id]
      );
      if (existingAttendance.length > 0) {
        await connection.execute(
          `UPDATE student_attendance SET attended = ? WHERE report_id = ? AND student_id = ?`,
          [attended ? 1 : 0, report_id, student_id]
        );
      } else {
        await connection.execute(
          `INSERT INTO student_attendance (report_id, student_id, attended) VALUES (?, ?, ?)`,
          [report_id, student_id, attended ? 1 : 0]
        );
      }
      if (attended) actual_students_present++;
    }
    await connection.execute(
      `UPDATE reports SET actual_students_present = ? WHERE id = ?`,
      [actual_students_present, report_id]
    );
    await logAction(connection, req.user.id, 'Submit Attendance', `Submitted attendance for ${attendance.length} students in report: ${report_id}`);
    res.status(201).json({ message: 'Attendance submitted successfully' });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Submit Attendance Error', err.message);
    res.status(500).json({ error: 'Failed to submit attendance', details: err.message });
  } finally {
    await connection.end();
  }
});

app.get('/lecturer/class-reports', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Lecturer') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Lecturer accessed /lecturer/class-reports');
      return res.status(403).json({ error: 'Access denied' });
    }
    const class_id = req.query.class_id || null;
    const course_id = req.query.course_id ? parseInt(req.query.course_id) : null;
    let query = `
      SELECT r.id, r.date_of_lecture AS date, c.name AS course_name, cl.name AS class_name, r.topic_taught, r.actual_students_present, r.total_registered_students
      FROM reports r
      JOIN courses c ON r.course_id = c.id
      JOIN classes cl ON r.class_id = cl.id
      JOIN lecturer_classes lc ON r.class_id = lc.class_id
      WHERE lc.lecturer_id = ?
    `;
    const params = [req.user.id];
    if (class_id) {
      query += ' AND r.class_id = ?';
      params.push(class_id);
    }
    if (course_id) {
      query += ' AND r.course_id = ?';
      params.push(course_id);
    }
    query += ' ORDER BY r.date_of_lecture DESC';
    const [reports] = await connection.execute(query, params);
    await logAction(connection, req.user.id, 'Fetch Class Reports', `Fetched ${reports.length} reports for lecturer: ${req.user.id}`);
    res.json(reports);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Class Reports Error', err.message);
    res.status(500).json({ error: 'Failed to fetch class reports', details: err.message });
  } finally {
    await connection.end();
  }
});

//Appended-==-=-=========== Lecturer Monitoring ===========//
// GET /lecturer/classes
app.get('/lecturer/classes', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Lecturer') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Lecturer accessed /lecturer/classes');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [classes] = await connection.execute(
      `SELECT c.id, c.name AS class_name,
              GROUP_CONCAT(co.id) AS course_ids,
              GROUP_CONCAT(co.name) AS course_names
       FROM classes c
       JOIN lecturer_classes lc ON c.id = lc.class_id
       LEFT JOIN class_courses cc ON c.id = cc.class_id
       LEFT JOIN courses co ON cc.course_id = co.id
       WHERE lc.lecturer_id = ?
       GROUP BY c.id, c.name`,
      [req.user.id]
    );
    const formattedClasses = classes.map(cls => ({
      ...cls,
      course_ids: cls.course_ids ? cls.course_ids.split(',').map(Number) : [],
      course_names: cls.course_names ? cls.course_names.split(',') : []
    }));
    await logAction(connection, req.user.id, 'Fetch Classes', `Fetched ${formattedClasses.length} classes for lecturer ${req.user.id}`);
    res.json(formattedClasses);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Classes Error', err.message);
    res.status(500).json({ error: 'Failed to fetch classes', details: err.message });
  } finally {
    await connection.end();
  }
});

// GET /venues
app.get('/venues', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [venues] = await connection.execute(
      `SELECT id, name, capacity FROM venues ORDER BY name`
    );
    await logAction(connection, req.user?.id, 'Fetch Venues', `Fetched ${venues.length} venues`);
    res.json(venues);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Venues Error', err.message);
    res.status(500).json({ error: 'Failed to fetch venues', details: err.message });
  } finally {
    await connection.end();
  }
});

// POST /lecturer/reports
app.post('/lecturer/reports', authenticateToken, async (req, res) => {
  const {
    class_id,
    course_id,
    week_of_reporting,
    date_of_lecture,
    actual_students_present,
    total_registered_students,
    venue_id,
    scheduled_lecture_time,
    topic_taught,
    learning_outcomes,
    recommendations
  } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Lecturer') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Lecturer accessed /lecturer/reports');
      return res.status(403).json({ error: 'Access denied' });
    }
    // Validate required fields
    if (!class_id || !course_id || !week_of_reporting || !date_of_lecture ||
        actual_students_present === undefined || total_registered_students === undefined ||
        !venue_id || !scheduled_lecture_time || !topic_taught || !learning_outcomes) {
      await logAction(connection, req.user.id, 'Create Report Failed', 'Missing required fields');
      return res.status(400).json({ error: 'All required fields must be provided' });
    }
    // Validate numeric fields
    if (!Number.isInteger(week_of_reporting) || week_of_reporting < 1 || week_of_reporting > 52) {
      await logAction(connection, req.user.id, 'Create Report Failed', `Invalid week_of_reporting: ${week_of_reporting}`);
      return res.status(400).json({ error: 'Week of reporting must be between 1 and 52' });
    }
    if (!Number.isInteger(actual_students_present) || actual_students_present < 0) {
      await logAction(connection, req.user.id, 'Create Report Failed', `Invalid actual_students_present: ${actual_students_present}`);
      return res.status(400).json({ error: 'Actual students present must be non-negative' });
    }
    if (!Number.isInteger(total_registered_students) || total_registered_students < 0) {
      await logAction(connection, req.user.id, 'Create Report Failed', `Invalid total_registered_students: ${total_registered_students}`);
      return res.status(400).json({ error: 'Total registered students must be non-negative' });
    }
    if (actual_students_present > total_registered_students) {
      await logAction(connection, req.user.id, 'Create Report Failed', 'Actual students present exceeds total registered');
      return res.status(400).json({ error: 'Actual students present cannot exceed total registered students' });
    }
    // Validate class assignment
    const [classCheck] = await connection.execute(
      `SELECT class_id FROM lecturer_classes WHERE lecturer_id = ? AND class_id = ?`,
      [req.user.id, class_id]
    );
    if (classCheck.length === 0) {
      await logAction(connection, req.user.id, 'Create Report Failed', `Lecturer not assigned to class ${class_id}`);
      return res.status(403).json({ error: 'You are not assigned to this class' });
    }
    // Validate course belongs to class
    const [courseCheck] = await connection.execute(
      `SELECT course_id FROM class_courses WHERE class_id = ? AND course_id = ?`,
      [class_id, course_id]
    );
    if (courseCheck.length === 0) {
      await logAction(connection, req.user.id, 'Create Report Failed', `Course ${course_id} not associated with class ${class_id}`);
      return res.status(400).json({ error: 'Course is not associated with the selected class' });
    }
    // Validate venue exists
    const [venueCheck] = await connection.execute(
      `SELECT id FROM venues WHERE id = ?`,
      [venue_id]
    );
    if (venueCheck.length === 0) {
      await logAction(connection, req.user.id, 'Create Report Failed', `Invalid venue_id: ${venue_id}`);
      return res.status(400).json({ error: 'Invalid venue' });
    }
    // Validate total_registered_students matches course data
    const [courseData] = await connection.execute(
      `SELECT COALESCE(total_registered_students, 0) AS total_registered_students
       FROM courses WHERE id = ?`,
      [course_id]
    );
    if (courseData.length === 0 || courseData[0].total_registered_students !== total_registered_students) {
      await logAction(connection, req.user.id, 'Create Report Failed', `Invalid total_registered_students: ${total_registered_students}`);
      return res.status(400).json({ error: 'Total registered students does not match course data' });
    }
    // Insert report
    const [result] = await connection.execute(
      `INSERT INTO reports (
        class_id, course_id, lecturer_id, week_of_reporting, date_of_lecture,
        actual_students_present, total_registered_students, venue_id,
        scheduled_lecture_time, topic_taught, learning_outcomes, recommendations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        class_id,
        course_id,
        req.user.id,
        week_of_reporting,
        date_of_lecture,
        actual_students_present,
        total_registered_students,
        venue_id,
        scheduled_lecture_time,
        topic_taught,
        learning_outcomes,
        recommendations || null
      ]
    );
    await logAction(connection, req.user.id, 'Create Report', `Report created for class ${class_id}, course ${course_id}`);
    res.status(201).json({ message: 'Report created successfully', report_id: result.insertId });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Create Report Error', err.message);
    res.status(500).json({ error: 'Failed to create report', details: err.message });
  } finally {
    await connection.end();
  }
});


// GET /lecturer/ratings
app.get('/lecturer/ratings', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Lecturer') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Lecturer accessed /lecturer/ratings');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [ratings] = await connection.execute(
      `SELECT r.id, r.rating AS rating_value, r.created_at AS rating_date, r.comments,
              c.name AS course_name, cl.name AS class_name, u.full_name AS student_name
       FROM ratings r
       JOIN courses c ON r.course_id = c.id
       JOIN class_courses cc ON c.id = cc.course_id
       JOIN classes cl ON cc.class_id = cl.id
       LEFT JOIN users u ON r.student_id = u.id
       WHERE r.lecturer_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    await logAction(connection, req.user.id, 'Fetch Ratings', `Fetched ${ratings.length} ratings for lecturer ${req.user.id}`);
    res.json(ratings);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Ratings Error', err.message);
    res.status(500).json({ error: 'Failed to fetch ratings', details: err.message });
  } finally {
    await connection.end();
  }
});

//PRL Ratings enpoint
// Append to server.js
app.get('/prl/ratings', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /prl/ratings');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [ratings] = await connection.execute(
      `SELECT r.id, r.rating AS rating_value, r.created_at AS rating_date, r.comments,
              c.name AS course_name, cl.name AS class_name, u.full_name AS student_name, l.full_name AS lecturer_name
       FROM ratings r
       JOIN courses c ON r.course_id = c.id
       JOIN faculties f ON c.faculty_id = f.id
       JOIN principal_lecturer_faculties plf ON f.id = plf.faculty_id
       JOIN classes cl ON r.class_id = cl.id
       LEFT JOIN users u ON r.student_id = u.id
       JOIN users l ON r.lecturer_id = l.id
       WHERE plf.prl_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    await logAction(connection, req.user.id, 'Fetch PRL Ratings', `Fetched ${ratings.length} ratings for PRL ${req.user.id}`);
    res.json(ratings);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch PRL Ratings Error', err.message);
    res.status(500).json({ error: 'Failed to fetch ratings', details: err.message });
  } finally {
    await connection.end();
  }
});

// Append to server.js

// GET /lecturer/available-prls
app.get('/lecturer/available-prls', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Lecturer') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Lecturer accessed /lecturer/available-prls');
      return res.status(403).json({ error: 'Access denied' });
    }
    // Fetch PRLs that share at least one faculty with the lecturer's courses
    const [prls] = await connection.execute(
      `SELECT DISTINCT u.id, u.full_name, u.email
       FROM users u
       JOIN principal_lecturer_faculties plf ON u.id = plf.prl_id
       JOIN courses c ON plf.faculty_id = c.faculty_id
       JOIN lecturer_courses lc ON c.id = lc.course_id
       WHERE u.role = 'PRL' AND lc.lecturer_id = ?`,
      [req.user.id]
    );
    await logAction(connection, req.user.id, 'Fetch Available PRLs', `Fetched ${prls.length} PRLs for lecturer ${req.user.id}`);
    res.json(prls);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Available PRLs Error', err.message);
    res.status(500).json({ error: 'Failed to fetch Principal Lecturers', details: err.message });
  } finally {
    await connection.end();
  }
});


// POST /prl/select-faculty
app.post('/prl/select-faculty', authenticateToken, async (req, res) => {
  const { faculty_id } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /prl/select-faculty');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!faculty_id) {
      await logAction(connection, req.user.id, 'Select Faculty Failed', 'Missing faculty_id');
      return res.status(400).json({ error: 'Faculty ID is required' });
    }
    // Verify faculty exists
    const [faculty] = await connection.execute(
      `SELECT id FROM faculties WHERE id = ?`,
      [faculty_id]
    );
    if (faculty.length === 0) {
      await logAction(connection, req.user.id, 'Select Faculty Failed', `Invalid faculty ID: ${faculty_id}`);
      return res.status(400).json({ error: 'Invalid faculty ID' });
    }
    // Check if PRL already assigned to this faculty
    const [existingAssignment] = await connection.execute(
      `SELECT faculty_id FROM principal_lecturer_faculties WHERE prl_id = ? AND faculty_id = ?`,
      [req.user.id, faculty_id]
    );
    if (existingAssignment.length > 0) {
      await logAction(connection, req.user.id, 'Select Faculty Failed', `PRL already assigned to faculty ${faculty_id}`);
      return res.status(400).json({ error: 'You are already assigned to this faculty' });
    }
    // Assign PRL to faculty
    await connection.execute(
      `INSERT INTO principal_lecturer_faculties (prl_id, faculty_id) VALUES (?, ?)`,
      [req.user.id, faculty_id]
    );
    await logAction(connection, req.user.id, 'Select Faculty', `PRL ${req.user.id} assigned to faculty ${faculty_id}`);
    res.status(201).json({ message: 'Faculty selected successfully' });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Select Faculty Error', err.message);
    res.status(500).json({ error: 'Failed to select faculty', details: err.message });
  } finally {
    await connection.end();
  }
});

//get-current faculty===========++++++++++++++=//
app.get('/prl/current-faculty', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /prl/current-faculty');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [faculty] = await connection.execute(
      `SELECT f.id, f.name
       FROM faculties f
       JOIN principal_lecturer_faculties plf ON f.id = plf.faculty_id
       WHERE plf.prl_id = ?`,
      [req.user.id]
    );
    if (faculty.length === 0) {
      await logAction(connection, req.user.id, 'Fetch Faculty Failed', 'No faculty assigned to PRL');
      return res.status(404).json({ error: 'No faculty assigned to this PRL' });
    }
    res.json(faculty[0]);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Faculty Error', err.message);
    res.status(500).json({ error: 'Failed to fetch faculty', details: err.message });
  } finally {
    await connection.end();
  }
});

// POST /prl/select-faculty (Updated)
app.post('/prl/select-faculty', authenticateToken, async (req, res) => {
  const { faculty_id } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /prl/select-faculty');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!faculty_id) {
      await logAction(connection, req.user.id, 'Select Faculty Failed', 'Missing faculty_id');
      return res.status(400).json({ error: 'Faculty ID is required' });
    }
    // Verify faculty exists
    const [faculty] = await connection.execute(
      `SELECT id, name FROM faculties WHERE id = ?`,
      [faculty_id]
    );
    if (faculty.length === 0) {
      await logAction(connection, req.user.id, 'Select Faculty Failed', `Invalid faculty ID: ${faculty_id}`);
      return res.status(400).json({ error: 'Invalid faculty ID' });
    }
    // Check if PRL already assigned to any faculty
    const [existingAssignment] = await connection.execute(
      `SELECT faculty_id FROM principal_lecturer_faculties WHERE prl_id = ?`,
      [req.user.id]
    );
    if (existingAssignment.length > 0) {
      await logAction(connection, req.user.id, 'Select Faculty Failed', `PRL already assigned to faculty ${existingAssignment[0].faculty_id}`);
      return res.status(400).json({ error: 'You are already assigned to a faculty' });
    }
    // Assign PRL to faculty
    await connection.execute(
      `INSERT INTO principal_lecturer_faculties (prl_id, faculty_id) VALUES (?, ?)`,
      [req.user.id, faculty_id]
    );
    await logAction(connection, req.user.id, 'Select Faculty', `PRL ${req.user.id} assigned to faculty ${faculty_id}`);
    res.status(201).json({
      message: 'Faculty selected successfully',
      faculty: { id: faculty[0].id, name: faculty[0].name }
    });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Select Faculty Error', err.message);
    res.status(500).json({ error: 'Failed to select faculty', details: err.message });
  } finally {
    await connection.end();
  }
});

// Append to server.js

// GET /lecturer/current-prl
app.get('/lecturer/current-prl', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Lecturer') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Lecturer accessed /lecturer/current-prl');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [prl] = await connection.execute(
      `SELECT u.id, u.full_name, u.email
       FROM users u
       JOIN lecturer_prl lp ON u.id = lp.prl_id
       WHERE lp.lecturer_id = ?`,
      [req.user.id]
    );
    if (prl.length === 0) {
      await logAction(connection, req.user.id, 'Fetch Current PRL', 'No PRL assigned');
      return res.status(404).json({ error: 'No PRL assigned' });
    }
    await logAction(connection, req.user.id, 'Fetch Current PRL', `Fetched PRL ${prl[0].full_name} for lecturer ${req.user.id}`);
    res.json(prl[0]);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Current PRL Error', err.message);
    res.status(500).json({ error: 'Failed to fetch current PRL', details: err.message });
  } finally {
    await connection.end();
  }
});

// Append to server.js (replace all existing /lecturer/select-prl endpoints)

// GET /lecturer/current-prl
app.get('/lecturer/current-prl', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Lecturer') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Lecturer accessed /lecturer/current-prl');
      return res.status(403).json({ error: 'Access denied' });
    }
    const [prl] = await connection.execute(
      `SELECT u.id, u.full_name, u.email
       FROM users u
       JOIN lecturer_prl lp ON u.id = lp.prl_id
       WHERE lp.lecturer_id = ?`,
      [req.user.id]
    );
    if (prl.length === 0) {
      await logAction(connection, req.user.id, 'Fetch Current PRL', 'No PRL assigned');
      return res.status(404).json({ error: 'No PRL assigned' });
    }
    await logAction(connection, req.user.id, 'Fetch Current PRL', `Fetched PRL ${prl[0].full_name} for lecturer ${req.user.id}`);
    res.json(prl[0]);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Current PRL Error', err.message);
    res.status(500).json({ error: 'Failed to fetch current PRL', details: err.message });
  } finally {
    await connection.end();
  }
});

// POST /lecturer/select-prl
app.post('/lecturer/select-prl', authenticateToken, async (req, res) => {
  const { prl_id } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'Lecturer') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-Lecturer accessed /lecturer/select-prl');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!prl_id) {
      await logAction(connection, req.user.id, 'Select PRL Failed', 'Missing prl_id');
      return res.status(400).json({ error: 'Principal Lecturer ID is required' });
    }
    // Verify PRL exists and has role 'PRL'
    const [prl] = await connection.execute(
      `SELECT id, full_name, email FROM users WHERE id = ? AND role = 'PRL'`,
      [prl_id]
    );
    if (prl.length === 0) {
      await logAction(connection, req.user.id, 'Select PRL Failed', `Invalid PRL ID: ${prl_id}`);
      return res.status(400).json({ error: 'Invalid Principal Lecturer ID' });
    }
    // Verify lecturer and PRL share at least one faculty
    const [facultyMatch] = await connection.execute(
      `SELECT 1
       FROM principal_lecturer_faculties plf
       JOIN courses c ON plf.faculty_id = c.faculty_id
       JOIN lecturer_courses lc ON c.id = lc.course_id
       WHERE plf.prl_id = ? AND lc.lecturer_id = ?`,
      [prl_id, req.user.id]
    );
    if (facultyMatch.length === 0) {
      await logAction(connection, req.user.id, 'Select PRL Failed', `No shared faculty with PRL ${prl_id}`);
      return res.status(400).json({ error: 'You cannot select this PRL as you do not share any faculties' });
    }
    // Check if lecturer already has a PRL
    const [existingAssignment] = await connection.execute(
      `SELECT prl_id FROM lecturer_prl WHERE lecturer_id = ?`,
      [req.user.id]
    );
    if (existingAssignment.length > 0) {
      await logAction(connection, req.user.id, 'Select PRL Failed', `Lecturer already assigned to PRL ${existingAssignment[0].prl_id}`);
      return res.status(400).json({ error: 'You are already assigned to a Principal Lecturer' });
    }
    // Assign lecturer to PRL
    await connection.execute(
      `INSERT INTO lecturer_prl (lecturer_id, prl_id) VALUES (?, ?)`,
      [req.user.id, prl_id]
    );
    await logAction(connection, req.user.id, 'Select PRL', `Lecturer ${req.user.id} assigned to PRL ${prl_id}`);
    res.status(201).json({
      message: 'Principal Lecturer selected successfully',
      prl: { id: prl[0].id, full_name: prl[0].full_name, email: prl[0].email }
    });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Select PRL Error', err.message);
    res.status(500).json({ error: 'Failed to select Principal Lecturer', details: err.message });
  } finally {
    await connection.end();
  }
});

// Append to server.js

// GET /prl/lecturer-ratings
app.get('/prl/lecturer-ratings', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /prl/lecturer-ratings');
      return res.status(403).json({ error: 'Access denied' });
    }
    // Get PRL's assigned faculty
    const [faculty] = await connection.execute(
      `SELECT f.id
       FROM faculties f
       JOIN principal_lecturer_faculties plf ON f.id = plf.faculty_id
       WHERE plf.prl_id = ?`,
      [req.user.id]
    );
    if (faculty.length === 0) {
      await logAction(connection, req.user.id, 'Fetch Ratings Failed', 'No faculty assigned to PRL');
      return res.status(400).json({ error: 'No faculty assigned to this PRL' });
    }
    // Fetch ratings for lecturers in PRL's stream
    const [ratings] = await connection.execute(
      `SELECT lpr.lecturer_id, lpr.rating, lpr.comments
       FROM lecturer_prl_ratings lpr
       JOIN lecturer_prl lp ON lpr.lecturer_id = lp.lecturer_id
       JOIN lecturer_courses lc ON lp.lecturer_id = lc.lecturer_id
       JOIN courses c ON lc.course_id = c.id
       WHERE lpr.prl_id = ? AND c.faculty_id = ?`,
      [req.user.id, faculty[0].id]
    );
    await logAction(connection, req.user.id, 'Fetch Ratings', `Fetched ${ratings.length} ratings for PRL ${req.user.id}`);
    res.json(ratings);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Ratings Error', err.message);
    res.status(500).json({ error: 'Failed to fetch ratings', details: err.message });
  } finally {
    await connection.end();
  }
});

// POST /prl/submit-rating
app.post('/prl/submit-rating', authenticateToken, async (req, res) => {
  const { lecturer_id, rating, comments } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /prl/submit-rating');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!lecturer_id || !rating) {
      await logAction(connection, req.user.id, 'Submit Rating Failed', 'Missing lecturer_id or rating');
      return res.status(400).json({ error: 'Lecturer ID and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      await logAction(connection, req.user.id, 'Submit Rating Failed', `Invalid rating: ${rating}`);
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    // Verify lecturer is assigned to PRL and in their faculty
    const [faculty] = await connection.execute(
      `SELECT f.id
       FROM faculties f
       JOIN principal_lecturer_faculties plf ON f.id = plf.faculty_id
       WHERE plf.prl_id = ?`,
      [req.user.id]
    );
    if (faculty.length === 0) {
      await logAction(connection, req.user.id, 'Submit Rating Failed', 'No faculty assigned to PRL');
      return res.status(400).json({ error: 'No faculty assigned to this PRL' });
    }
    const [lecturerCheck] = await connection.execute(
      `SELECT 1
       FROM lecturer_prl lp
       JOIN lecturer_courses lc ON lp.lecturer_id = lc.lecturer_id
       JOIN courses c ON lc.course_id = c.id
       WHERE lp.lecturer_id = ? AND lp.prl_id = ? AND c.faculty_id = ?`,
      [lecturer_id, req.user.id, faculty[0].id]
    );
    if (lecturerCheck.length === 0) {
      await logAction(connection, req.user.id, 'Submit Rating Failed', `Lecturer ${lecturer_id} not in PRL's stream`);
      return res.status(400).json({ error: 'Lecturer not assigned to your stream' });
    }
    // Insert or update rating
    await connection.execute(
      `INSERT INTO lecturer_prl_ratings (lecturer_id, prl_id, rating, comments)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = ?, comments = ?, created_at = CURRENT_TIMESTAMP`,
      [lecturer_id, req.user.id, rating, comments || null, rating, comments || null]
    );
    await logAction(connection, req.user.id, 'Submit Rating', `PRL ${req.user.id} rated lecturer ${lecturer_id} with ${rating}`);
    res.status(201).json({ message: 'Rating submitted successfully' });
  } catch (err) {
    await logAction(connection, req.user?.id, 'Submit Rating Error', err.message);
    res.status(500).json({ error: 'Failed to submit rating', details: err.message });
  } finally {
    await connection.end();
  }
});

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});