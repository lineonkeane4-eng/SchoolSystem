-- Create new database
CREATE DATABASE `luct_management_new`;
USE `luct_management_new`;

-- 1. Users table
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('PL','PRL','Lecturer','Student') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Faculties table
CREATE TABLE `faculties` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Courses table
CREATE TABLE `courses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `faculty_id` int(11) NOT NULL,
  `code` varchar(10) DEFAULT NULL,
  `total_registered_students` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `faculty_id` (`faculty_id`),
  CONSTRAINT `courses_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculties` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Classes table
CREATE TABLE `classes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `course_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `course_id` (`course_id`),
  CONSTRAINT `classes_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Venues table
CREATE TABLE `venues` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `capacity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Reports table
CREATE TABLE `reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lecturer_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `week_of_reporting` int(11) NOT NULL,
  `date_of_lecture` date NOT NULL,
  `course_id` int(11) NOT NULL,
  `actual_students_present` int(11) NOT NULL,
  `total_registered_students` int(11) NOT NULL,
  `venue_id` int(11) NOT NULL,
  `scheduled_lecture_time` time NOT NULL,
  `topic_taught` text NOT NULL,
  `learning_outcomes` text NOT NULL,
  `recommendations` text DEFAULT NULL,
  `prl_feedback` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `lecturer_id` (`lecturer_id`),
  KEY `class_id` (`class_id`),
  KEY `course_id` (`course_id`),
  KEY `venue_id` (`venue_id`),
  CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`lecturer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `reports_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  CONSTRAINT `reports_ibfk_3` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`),
  CONSTRAINT `reports_ibfk_4` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. PL Reports table
CREATE TABLE `pl_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `generated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Enrollments table
CREATE TABLE `enrollments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `grade` varchar(2) DEFAULT NULL,
  `attendance_count` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `course_id` (`course_id`),
  CONSTRAINT `enrollments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  CONSTRAINT `enrollments_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Lecturer-Courses table
CREATE TABLE `lecturer_courses` (
  `lecturer_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  PRIMARY KEY (`lecturer_id`,`course_id`),
  CONSTRAINT `lecturer_courses_ibfk_1` FOREIGN KEY (`lecturer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `lecturer_courses_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Lecturer-Classes table
CREATE TABLE `lecturer_classes` (
  `lecturer_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  PRIMARY KEY (`lecturer_id`,`class_id`),
  CONSTRAINT `lecturer_classes_ibfk_1` FOREIGN KEY (`lecturer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `lecturer_classes_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Grades table
CREATE TABLE `grades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `grade` float NOT NULL,
  `comments` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `course_id` (`course_id`),
  KEY `class_id` (`class_id`),
  CONSTRAINT `grades_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  CONSTRAINT `grades_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`),
  CONSTRAINT `grades_ibfk_3` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Principal Lecturer Faculties table
CREATE TABLE `principal_lecturer_faculties` (
  `prl_id` int(11) NOT NULL,
  `faculty_id` int(11) NOT NULL,
  PRIMARY KEY (`prl_id`,`faculty_id`),
  CONSTRAINT `plf_ibfk_1` FOREIGN KEY (`prl_id`) REFERENCES `users` (`id`),
  CONSTRAINT `plf_ibfk_2` FOREIGN KEY (`faculty_id`) REFERENCES `faculties` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Student-Classes table
CREATE TABLE `student_classes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_id` (`student_id`),
  KEY `class_id` (`class_id`),
  CONSTRAINT `student_classes_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  CONSTRAINT `student_classes_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Student Attendance table
CREATE TABLE `student_attendance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `report_id` int(11) NOT NULL,
  `attended` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `report_id` (`report_id`),
  CONSTRAINT `student_attendance_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  CONSTRAINT `student_attendance_ibfk_2` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Ratings table
CREATE TABLE `ratings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `lecturer_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `lecturer_id` (`lecturer_id`),
  KEY `course_id` (`course_id`),
  CONSTRAINT `ratings_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  CONSTRAINT `ratings_ibfk_2` FOREIGN KEY (`lecturer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `ratings_ibfk_3` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Course Lecturers table
CREATE TABLE `course_lecturers` (
  `course_id` int(11) NOT NULL,
  `lecturer_id` int(11) NOT NULL,
  PRIMARY KEY (`course_id`,`lecturer_id`),
  CONSTRAINT `cl_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`),
  CONSTRAINT `cl_ibfk_2` FOREIGN KEY (`lecturer_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Class Courses table
CREATE TABLE `class_courses` (
  `class_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  PRIMARY KEY (`class_id`,`course_id`),
  CONSTRAINT `cc_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  CONSTRAINT `cc_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Audit Logs table
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `details` text NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



//
what! yoh, we were talking about the prl only seeing the caourses from their faculty so that they will not touch the others from the other faculties,
i mean, this is the portion of the server.js that you gave me! and i am confuesd as to what parts it must replace
// Replace GET /prl/classes, GET /prl/courses, POST /class-courses, and DELETE /class-courses in server.js
// GET /prl/classes
app.get('/prl/classes', authenticateToken, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (req.user.role !== 'PRL') {
      await logAction(connection, req.user?.id, 'Unauthorized Access', 'Non-PRL accessed /prl/classes');
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
      await logAction(connection, req.user.id, 'Fetch Classes Failed', 'No faculty assigned to PRL');
      return res.status(400).json({ error: 'No faculty assigned to this PRL' });
    }
    const [classes] = await connection.execute(
      `SELECT c.id, c.name AS class_name, GROUP_CONCAT(cc.course_id) AS course_ids, GROUP_CONCAT(co.name) AS course_names
       FROM classes c
       JOIN courses co ON c.course_id = co.id
       LEFT JOIN class_courses cc ON c.id = cc.class_id
       WHERE co.faculty_id = ?
       GROUP BY c.id, c.name`,
      [faculty[0].id]
    );
    await logAction(connection, req.user.id, 'Fetch Classes', `Fetched ${classes.length} classes for PRL ${req.user.id}`);
    res.json(classes);
  } catch (err) {
    await logAction(connection, req.user?.id, 'Fetch Classes Error', err.message);
    res.status(500).json({ error: 'Failed to fetch classes', details: err.message });
  } finally {
    await connection.end();
  }
});
// GET /prl/courses
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
      return res.status(400).json({ error: 'No faculty assigned to this PRL' });
    }
    const [courses] = await connection.execute(
      `SELECT id, name, total_registered_students
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
// POST /class-courses
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
    // Get PRL's assigned faculty
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
    // Validate class belongs to PRL's faculty via course_id
    const [classRecord] = await connection.execute(
      `SELECT c.id
       FROM classes c
       JOIN courses co ON c.course_id = co.id
       WHERE c.id = ? AND co.faculty_id = ?`,
      [class_id, faculty[0].id]
    );
    if (classRecord.length === 0) {
      await logAction(connection, req.user?.id, 'Assign Class Course Failed', `Class not found or not in PRL's faculty: ${class_id}`);
      return res.status(404).json({ error: 'Class not found or not in your faculty' });
    }
    // Validate course belongs to PRL's faculty
    const [course] = await connection.execute(
      `SELECT id FROM courses WHERE id = ? AND faculty_id = ?`,
      [course_id, faculty[0].id]
    );
    if (course.length === 0) {
      await logAction(connection, req.user?.id, 'Assign Class Course Failed', `Course not found or not in PRL's faculty: ${course_id}`);
      return res.status(404).json({ error: 'Course not found or not in your faculty' });
    }
    // Check for existing assignment
    const [existingAssignment] = await connection.execute(
      'SELECT class_id FROM class_courses WHERE class_id = ? AND course_id = ?',
      [class_id, course_id]
    );
    if (existingAssignment.length > 0) {
      await logAction(connection, req.user?.id, 'Assign Class Course Failed', `Assignment already exists: ${class_id}, ${course_id}`);
      return res.status(400).json({ error: 'Class is already assigned to this course' });
    }
    // Insert assignment
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
// DELETE /class-courses
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
    // Get PRL's assigned faculty
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
    // Validate class belongs to PRL's faculty via course_id
    const [classRecord] = await connection.execute(
      `SELECT c.id
       FROM classes c
       JOIN courses co ON c.course_id = co.id
       WHERE c.id = ? AND co.faculty_id = ?`,
      [class_id, faculty[0].id]
    );
    if (classRecord.length === 0) {
      await logAction(connection, req.user?.id, 'Unassign Class Course Failed', `Class not found or not in PRL's faculty: ${class_id}`);
      return res.status(404).json({ error: 'Class not found or not in your faculty' });
    }
    // Validate course belongs to PRL's faculty
    const [course] = await connection.execute(
      `SELECT id FROM courses WHERE id = ? AND faculty_id = ?`,
      [course_id, faculty[0].id]
    );
    if (course.length === 0) {
      await logAction(connection, req.user?.id, 'Unassign Class Course Failed', `Course not found or not in PRL's faculty: ${course_id}`);
      return res.status(404).json({ error: 'Course not found or not in your faculty' });
    }
    // Check for existing assignment
    const [assignment] = await connection.execute(
      'SELECT class_id FROM class_courses WHERE class_id = ? AND course_id = ?',
      [class_id, course_id]
    );
    if (assignment.length === 0) {
      await logAction(connection, req.user?.id, 'Unassign Class Course Failed', `Assignment not found: ${class_id}, ${course_id}`);
      return res.status(404).json({ error: 'Assignment not found' });
    }
    // Delete assignment
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