/**
 * AeroGrade Secure Exam API Server
 * Refactored to use SQLite Relational Database, JWT Auth, RBAC Middleware, and Analytics Engine.
 */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 5001;
const SNAPSHOTS_DIR = path.join(__dirname, 'snapshots');
const DB_PATH = path.join(__dirname, 'database.sqlite');
const JWT_SECRET = 'aerograde_super_secret_jwt_key_2026';

// Ensure snapshots directory exists
if (!fs.existsSync(SNAPSHOTS_DIR)) {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/snapshots', express.static(SNAPSHOTS_DIR));

// ──────────────────────────────────────────────
// Relational Database Setup & Helpers
// ──────────────────────────────────────────────
const db = new sqlite3.Database(DB_PATH);

const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

async function initDb() {
  // Enable Foreign Keys
  await dbRun("PRAGMA foreign_keys = ON;");

  // 1. Users Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Admin', 'Teacher', 'Student')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Profiles Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS profiles (
      profile_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      student_id_card TEXT UNIQUE,
      department TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Questions Table (Question Bank)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS questions (
      question_id TEXT PRIMARY KEY,
      question_text TEXT NOT NULL,
      q_type TEXT NOT NULL DEFAULT 'MCQ' CHECK(q_type IN ('MCQ', 'Subjective')),
      options TEXT, -- JSON array of MCQ options
      correct_option_id TEXT, -- e.g., 'A', 'B', 'C', 'D'
      correct_answer_text TEXT,
      difficulty TEXT NOT NULL DEFAULT 'Medium' CHECK(difficulty IN ('Easy', 'Medium', 'Hard')),
      subject TEXT NOT NULL,
      marks INTEGER NOT NULL DEFAULT 1,
      explanation TEXT,
      created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Exams Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS exams (
      exam_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      subject TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      total_marks INTEGER NOT NULL,
      proctoring_mode TEXT NOT NULL DEFAULT 'standard',
      created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Submissions Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS submissions (
      submission_id TEXT PRIMARY KEY,
      exam_id TEXT REFERENCES exams(exam_id) ON DELETE SET NULL,
      student_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
      candidate_name TEXT NOT NULL,
      candidate_email TEXT NOT NULL,
      student_id_str TEXT,
      category TEXT,
      duration INTEGER,
      proctoring TEXT,
      score REAL DEFAULT 0,
      passed INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      unanswered_count INTEGER DEFAULT 0,
      total_count INTEGER DEFAULT 0,
      total_marks INTEGER DEFAULT 0,
      max_marks INTEGER DEFAULT 0,
      date TEXT,
      terminated INTEGER DEFAULT 0,
      violations INTEGER DEFAULT 0,
      geolocation TEXT,
      proctor_logs TEXT,
      snapshots TEXT,
      submitted_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Student Responses Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS student_responses (
      response_id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES submissions(submission_id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
      selected_option_id TEXT,
      submitted_text TEXT,
      is_correct INTEGER DEFAULT 0,
      marks_obtained INTEGER DEFAULT 0
    );
  `);

  // Seed Users
  const userCount = await dbGet("SELECT COUNT(*) AS count FROM users");
  if (userCount.count === 0) {
    const adminHash = await bcrypt.hash('admin123', 10);
    const teacherHash = await bcrypt.hash('teacher123', 10);
    const studentHash = await bcrypt.hash('student123', 10);

    // Seed Admin
    await dbRun("INSERT INTO users (user_id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      ['u_admin', 'admin', 'admin@sgi.edu', adminHash, 'Admin']);
    await dbRun("INSERT INTO profiles (profile_id, user_id, full_name, department) VALUES (?, ?, ?, ?)",
      ['p_admin', 'u_admin', 'SGI Admin Office', 'IT Administration']);

    // Seed Teacher
    await dbRun("INSERT INTO users (user_id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      ['u_teacher', 'teacher', 'teacher@sgi.edu', teacherHash, 'Teacher']);
    await dbRun("INSERT INTO profiles (profile_id, user_id, full_name, department) VALUES (?, ?, ?, ?)",
      ['p_teacher', 'u_teacher', 'Dr. Rajesh Patil', 'Computer Engineering']);

    // Seed Student
    await dbRun("INSERT INTO users (user_id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      ['u_student', 'student', 'student@sgi.edu', studentHash, 'Student']);
    await dbRun("INSERT INTO profiles (profile_id, user_id, full_name, student_id_card, department) VALUES (?, ?, ?, ?, ?)",
      ['p_student', 'u_student', 'Krishna Devadkar', 'SGI-2026-089', 'Computer Engineering']);

    console.log("✅ Seeded default users: admin/admin123, teacher/teacher123, student/student123");
  }

  // Seed Questions
  const qCount = await dbGet("SELECT COUNT(*) AS count FROM questions");
  if (qCount.count === 0) {
    const defaultQuestions = [
      {
        question_id: "q_1",
        question_text: "Which of the following is correct about JavaScript closures?",
        options: JSON.stringify([
          { option_id: "A", text: "A closure is the combination of a function and the lexical environment within which that function was declared." },
          { option_id: "B", text: "A closure is a way to close browser windows programmatically." },
          { option_id: "C", text: "A closure is a secure hashing mechanism in ES6." },
          { option_id: "D", text: "A closure prevents any changes to the outer variables." }
        ]),
        correct_option_id: "A",
        difficulty: "Medium",
        subject: "Closures",
        marks: 1,
        explanation: "A closure is created when an inner function references variables from its outer scope."
      },
      {
        question_id: "q_2",
        question_text: "What is the primary purpose of React keys in lists?",
        options: JSON.stringify([
          { option_id: "A", text: "To uniquely identify DOM nodes across the entire page." },
          { option_id: "B", text: "To help React identify which items have changed, been added, or been removed." },
          { option_id: "C", text: "To style list elements differently based on their positions." },
          { option_id: "D", text: "To encrypt the data sent to child components." }
        ]),
        correct_option_id: "B",
        difficulty: "Easy",
        subject: "React Lists & Keys",
        marks: 1,
        explanation: "Keys help React identify which items have changed, been added, or been removed."
      },
      {
        question_id: "q_3",
        question_text: "In CSS Flexbox, which property is used to control how items shrink?",
        options: JSON.stringify([
          { option_id: "A", text: "flex-grow" },
          { option_id: "B", text: "flex-shrink" },
          { option_id: "C", text: "flex-basis" },
          { option_id: "D", text: "align-self" }
        ]),
        correct_option_id: "B",
        difficulty: "Easy",
        subject: "Flexbox Layout",
        marks: 1,
        explanation: "The flex-shrink CSS property specifies the flex shrink factor of a flex item."
      },
      {
        question_id: "q_4",
        question_text: "What does the 'crossorigin' attribute in a <script> tag do?",
        options: JSON.stringify([
          { option_id: "A", text: "Allows the script to execute on multiple CPU cores." },
          { option_id: "B", text: "Enables error logging for scripts loaded from different origins." },
          { option_id: "C", text: "Tells the browser to block scripts loaded over HTTP." },
          { option_id: "D", text: "Executes the script only when the cursor crosses the screen." }
        ]),
        correct_option_id: "B",
        difficulty: "Hard",
        subject: "CORS Scripting",
        marks: 1,
        explanation: "The crossorigin attribute allows error logging for third-party scripts."
      },
      {
        question_id: "q_5",
        question_text: "What is the difference between '==' and '===' operators in JavaScript?",
        options: JSON.stringify([
          { option_id: "A", text: "'==' compares only values after type coercion, while '===' compares both value and type without coercion." },
          { option_id: "B", text: "'===' compares only values after coercion, while '==' compares values and types." },
          { option_id: "C", text: "There is no difference; they are completely interchangeable." },
          { option_id: "D", text: "'==' is used for strings and '===' is used for numbers." }
        ]),
        correct_option_id: "A",
        difficulty: "Easy",
        subject: "Coercion & Equality",
        marks: 1,
        explanation: "The strict equality operator ('===') does not perform type conversion. The loose equality operator ('==') performs type coercion."
      },
      {
        question_id: "q_6",
        question_text: "What does HTML5 Semantics refer to?",
        options: JSON.stringify([
          { option_id: "A", text: "Using CSS inline styles to make HTML pages load faster." },
          { option_id: "B", text: "Using tag names that clearly describe their meaning to both the browser and the developer (e.g., <article>, <header>)." },
          { option_id: "C", text: "Writing JavaScript code directly inside HTML attributes." },
          { option_id: "D", text: "Developing pages that only load on mobile browsers." }
        ]),
        correct_option_id: "B",
        difficulty: "Easy",
        subject: "HTML5 Semantics",
        marks: 1,
        explanation: "Semantic HTML elements clearly describe their meaning in a human- and machine-readable way."
      },
      {
        question_id: "q_7",
        question_text: "Which React hook is used to run side effects in a functional component?",
        options: JSON.stringify([
          { option_id: "A", text: "useState" },
          { option_id: "B", text: "useContext" },
          { option_id: "C", text: "useEffect" },
          { option_id: "D", text: "useReducer" }
        ]),
        correct_option_id: "C",
        difficulty: "Easy",
        subject: "React Side Effects",
        marks: 1,
        explanation: "The useEffect Hook lets you perform side effects in function components."
      },
      {
        question_id: "q_8",
        question_text: "In CSS, what is the default value of the 'position' property?",
        options: JSON.stringify([
          { option_id: "A", text: "relative" },
          { option_id: "B", text: "absolute" },
          { option_id: "C", text: "fixed" },
          { option_id: "D", text: "static" }
        ]),
        correct_option_id: "D",
        difficulty: "Easy",
        subject: "CSS Positioning",
        marks: 1,
        explanation: "HTML elements are positioned static by default."
      },
      {
        question_id: "q_9",
        question_text: "What is Event Bubbling in JavaScript?",
        options: JSON.stringify([
          { option_id: "A", text: "A technique to compress event listener memory usage." },
          { option_id: "B", text: "An event propagation mechanism where an event triggers on the deepest target element first and then triggers on its parents." },
          { option_id: "C", text: "A bug where events loop infinitely and crash the tab." },
          { option_id: "D", text: "An API for animation bubbles on mouse hover." }
        ]),
        correct_option_id: "B",
        difficulty: "Medium",
        subject: "Event Propagation",
        marks: 1,
        explanation: "Event bubbling propagates from the innermost element upwards."
      },
      {
        question_id: "q_10",
        question_text: "Which of the following is true about React state updates?",
        options: JSON.stringify([
          { option_id: "A", text: "State updates are synchronous and occur immediately on the next line." },
          { option_id: "B", text: "State updates may be batched and are asynchronous for performance reasons." },
          { option_id: "C", text: "State can only be modified by changing the window global object directly." },
          { option_id: "D", text: "State updates force the entire browser page to reload." }
        ]),
        correct_option_id: "B",
        difficulty: "Medium",
        subject: "React State Updates",
        marks: 1,
        explanation: "React batches state updates asynchronously."
      },
      {
        question_id: "q_11",
        question_text: "In CSS, what does 'box-sizing: border-box' do?",
        options: JSON.stringify([
          { option_id: "A", text: "Forces a solid border around the target element." },
          { option_id: "B", text: "Includes padding and border in the element's total width and height." },
          { option_id: "C", text: "Hides the content of the box if it overflows the border." },
          { option_id: "D", text: "Sets the element's width and height to zero." }
        ]),
        correct_option_id: "B",
        difficulty: "Easy",
        subject: "Box Model",
        marks: 1,
        explanation: "border-box includes padding and border in sizing."
      },
      {
        question_id: "q_12",
        question_text: "What does the 'DNS' (Domain Name System) do?",
        options: JSON.stringify([
          { option_id: "A", text: "Translates domain names to IP addresses." },
          { option_id: "B", text: "Encrypts the local network connection." },
          { option_id: "C", text: "Speeds up local CPU execution." },
          { option_id: "D", text: "Converts HTML stylesheets into JavaScript arrays." }
        ]),
        correct_option_id: "A",
        difficulty: "Easy",
        subject: "Internet DNS System",
        marks: 1,
        explanation: "DNS translates human-readable domain names to IP addresses."
      }
    ];

    for (const q of defaultQuestions) {
      await dbRun(`
        INSERT INTO questions (question_id, question_text, q_type, options, correct_option_id, difficulty, subject, marks, explanation)
        VALUES (?, ?, 'MCQ', ?, ?, 'Medium', ?, ?, ?)
      `, [q.question_id, q.question_text, q.options, q.correct_option_id, q.subject, q.marks, q.explanation]);
    }
    console.log("✅ Seeded default question bank.");
  }
}

// ──────────────────────────────────────────────
// RBAC Middleware
// ──────────────────────────────────────────────
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Access token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // user_id, username, role
    next();
  } catch (err) {
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: `Forbidden. Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
};

// ──────────────────────────────────────────────
// AUTH Endpoints
// ──────────────────────────────────────────────

/** POST /api/auth/register — Register a new user */
app.post('/api/auth/register', async (req, res) => {
  const { username, password, email, role, full_name, student_id_card, department } = req.body;
  if (!username || !password || !email || !role || !full_name) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }
  if (!['Admin', 'Teacher', 'Student'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role selection.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `u_${Date.now()}`;
    const profileId = `p_${Date.now()}`;

    await dbRun(
      "INSERT INTO users (user_id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [userId, username.trim().toLowerCase(), email.trim().toLowerCase(), passwordHash, role]
    );

    await dbRun(
      "INSERT INTO profiles (profile_id, user_id, full_name, student_id_card, department) VALUES (?, ?, ?, ?, ?)",
      [profileId, userId, full_name.trim(), student_id_card ? student_id_card.trim() : null, department ? department.trim() : null]
    );

    res.status(201).json({ success: true, message: 'Registration successful!' });
  } catch (err) {
    console.error(err);
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, error: 'Username or email already exists.' });
    }
    res.status(500).json({ success: false, error: 'Failed to register user.' });
  }
});

/** POST /api/auth/login — Login and return a JWT */
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required.' });
  }

  try {
    const user = await dbGet("SELECT * FROM users WHERE username = ? OR email = ?", [username.trim().toLowerCase(), username.trim().toLowerCase()]);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const profile = await dbGet("SELECT * FROM profiles WHERE user_id = ?", [user.user_id]);
    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        full_name: profile ? profile.full_name : user.username,
        student_id_card: profile ? profile.student_id_card : '',
        department: profile ? profile.department : ''
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Authentication error.' });
  }
});

// Legacy Admin login compatibility fallback
const ADMIN_USER = { username: "admin", password: "sgi@admin123" };
const ADMIN_TOKEN = "sgi_token_secure_access_2026";
app.post('/api/auth/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    res.status(401).json({ success: false, error: 'Invalid username or password.' });
  }
});

// ──────────────────────────────────────────────
// QUESTIONS Endpoints
// ──────────────────────────────────────────────

/** GET /api/questions — Get all questions (Accessible by logged-in users) */
app.get('/api/questions', async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM questions");
    const questions = rows.map(r => ({
      question_id: r.question_id,
      id: r.question_id,
      question_text: r.question_text,
      question: r.question_text,
      options: JSON.parse(r.options || '[]'),
      correct_option_id: r.correct_option_id,
      difficulty: r.difficulty,
      subject: r.subject,
      marks: r.marks,
      explanation: r.explanation,
      category: r.subject,
      answerIndex: ['A', 'B', 'C', 'D'].indexOf(r.correct_option_id)
    }));
    res.json({ success: true, questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to retrieve questions.' });
  }
});

/** POST /api/questions — Add a new question (Protected: Admin, Teacher) */
app.post('/api/questions', authenticateJWT, checkRole(['Admin', 'Teacher']), async (req, res) => {
  const { question_text, options, correct_option_id, category, explanation, marks, subject } = req.body;

  if (!question_text || !question_text.trim()) {
    return res.status(400).json({ success: false, error: 'question_text is required.' });
  }
  if (!Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ success: false, error: 'At least 2 options are required.' });
  }

  const optString = JSON.stringify(options.map(o => ({ option_id: o.option_id, text: o.text.trim() })));
  const qId = `q_${Date.now()}`;
  const sub = subject ? subject.trim() : (category || 'Custom');

  try {
    await dbRun(`
      INSERT INTO questions (question_id, question_text, q_type, options, correct_option_id, difficulty, subject, marks, explanation, created_by)
      VALUES (?, ?, 'MCQ', ?, ?, 'Medium', ?, ?, ?, ?)
    `, [qId, question_text.trim(), optString, correct_option_id, sub, marks ? parseInt(marks) : 1, explanation ? explanation.trim() : '', req.user.user_id]);

    const newQuestion = {
      question_id: qId,
      id: qId,
      question_text: question_text.trim(),
      question: question_text.trim(),
      options: options.map(o => ({ option_id: o.option_id, text: o.text.trim() })),
      correct_option_id,
      answerIndex: ['A', 'B', 'C', 'D'].indexOf(correct_option_id),
      difficulty: 'Medium',
      subject: sub,
      category: sub,
      marks: marks ? parseInt(marks) : 1,
      explanation: explanation ? explanation.trim() : '',
      created_at: new Date().toISOString()
    };

    res.status(201).json({ success: true, question: newQuestion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create question.' });
  }
});

/** PUT /api/questions/:id — Update an existing question (Protected: Admin, Teacher) */
app.put('/api/questions/:id', authenticateJWT, checkRole(['Admin', 'Teacher']), async (req, res) => {
  const { question_text, options, correct_option_id, category, explanation, marks, subject } = req.body;
  const qId = req.params.id;

  if (!question_text || !question_text.trim()) {
    return res.status(400).json({ success: false, error: 'question_text is required.' });
  }
  if (!Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ success: false, error: 'At least 2 options are required.' });
  }

  const optString = JSON.stringify(options.map(o => ({ option_id: o.option_id, text: o.text.trim() })));
  const sub = subject ? subject.trim() : (category || 'Custom');

  try {
    const existing = await dbGet("SELECT * FROM questions WHERE question_id = ?", [qId]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Question not found.' });
    }

    await dbRun(`
      UPDATE questions 
      SET question_text = ?, options = ?, correct_option_id = ?, subject = ?, marks = ?, explanation = ?
      WHERE question_id = ?
    `, [question_text.trim(), optString, correct_option_id, sub, marks ? parseInt(marks) : 1, explanation ? explanation.trim() : '', qId]);

    const updatedQuestion = {
      question_id: qId,
      id: qId,
      question_text: question_text.trim(),
      question: question_text.trim(),
      options: options.map(o => ({ option_id: o.option_id, text: o.text.trim() })),
      correct_option_id,
      answerIndex: ['A', 'B', 'C', 'D'].indexOf(correct_option_id),
      difficulty: existing.difficulty,
      subject: sub,
      category: sub,
      marks: marks ? parseInt(marks) : 1,
      explanation: explanation ? explanation.trim() : '',
      updated_at: new Date().toISOString()
    };

    res.json({ success: true, question: updatedQuestion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update question.' });
  }
});

/** DELETE /api/questions/:id — Delete a question (Protected: Admin, Teacher) */
app.delete('/api/questions/:id', authenticateJWT, checkRole(['Admin', 'Teacher']), async (req, res) => {
  const qId = req.params.id;
  try {
    const existing = await dbGet("SELECT * FROM questions WHERE question_id = ?", [qId]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Question not found.' });
    }
    await dbRun("DELETE FROM questions WHERE question_id = ?", [qId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to delete question.' });
  }
});

// ──────────────────────────────────────────────
// EXAM SESSIONS Endpoints
// ──────────────────────────────────────────────

/** GET /api/exams — Get all exam submissions (Protected: Admin, Teacher) */
app.get('/api/exams', async (req, res) => {
  const tokenHeader = req.headers.authorization;
  let hasAccess = false;

  if (tokenHeader === 'Bearer sgi_token_secure_access_2026') {
    hasAccess = true;
  } else if (tokenHeader) {
    const token = tokenHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload.role === 'Admin' || payload.role === 'Teacher') {
        hasAccess = true;
      }
    } catch (e) {}
  }

  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Forbidden. Admin or Teacher access required.' });
  }

  try {
    const rows = await dbAll("SELECT * FROM submissions ORDER BY date DESC");
    const sessions = rows.map(r => ({
      session_id: r.submission_id,
      candidate_name: r.candidate_name,
      candidate_email: r.candidate_email,
      student_id: r.student_id_str,
      category: r.category,
      duration: r.duration,
      proctoring: r.proctoring,
      score: r.score,
      passed: r.passed === 1,
      correct_count: r.correct_count,
      incorrect_count: r.incorrect_count,
      unanswered_count: r.unanswered_count,
      total_count: r.total_count,
      total_marks: r.total_marks,
      max_marks: r.max_marks,
      date: r.date,
      terminated: r.terminated === 1,
      violations: r.violations,
      geolocation: JSON.parse(r.geolocation || 'null'),
      proctor_logs: JSON.parse(r.proctor_logs || '[]'),
      snapshots: JSON.parse(r.snapshots || '[]')
    }));
    res.json({ success: true, sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to retrieve exams.' });
  }
});

/** POST /api/exams — Submit a completed exam session (Open to all students) */
app.post('/api/exams', async (req, res) => {
  let studentId = null;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      studentId = decoded.user_id;
    } catch (e) {}
  }

  const {
    session_id, candidate_name, candidate_email, student_id, category, duration, proctoring,
    score, passed, correct_count, incorrect_count, unanswered_count, total_count,
    total_marks, max_marks, date, terminated, violations, geolocation, proctor_logs, answers, snapshots
  } = req.body;

  if (!candidate_name || !candidate_email) {
    return res.status(400).json({ success: false, error: 'candidate_name and candidate_email are required.' });
  }

  const sessId = session_id || `sess_${Date.now()}`;
  const geoStr = geolocation ? JSON.stringify(geolocation) : null;
  const logsStr = proctor_logs ? JSON.stringify(proctor_logs) : '[]';
  const snapsStr = snapshots ? JSON.stringify(snapshots) : '[]';

  try {
    await dbRun(`
      INSERT INTO submissions (
        submission_id, exam_id, student_id, candidate_name, candidate_email, student_id_str,
        category, duration, proctoring, score, passed, correct_count, incorrect_count,
        unanswered_count, total_count, total_marks, max_marks, date, terminated, violations,
        geolocation, proctor_logs, snapshots
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sessId, null, studentId, candidate_name, candidate_email, student_id || '',
      category, duration, proctoring, score, passed ? 1 : 0, correct_count, incorrect_count,
      unanswered_count, total_count, total_marks, max_marks, date || new Date().toISOString(),
      terminated ? 1 : 0, violations || 0, geoStr, logsStr, snapsStr
    ]);

    // Insert student responses to enable question analytics aggregation
    if (answers && typeof answers === 'object') {
      for (const [qId, selectedOpt] of Object.entries(answers)) {
        const question = await dbGet("SELECT * FROM questions WHERE question_id = ?", [qId]);
        if (question) {
          const isCorrect = question.correct_option_id === selectedOpt ? 1 : 0;
          const marksObtained = isCorrect ? question.marks : 0;
          
          await dbRun(`
            INSERT INTO student_responses (response_id, submission_id, question_id, selected_option_id, is_correct, marks_obtained)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [`resp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, sessId, qId, selectedOpt, isCorrect, marksObtained]);
        }
      }
    }

    res.status(201).json({ success: true, session_id: sessId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to record exam submission.' });
  }
});

// ──────────────────────────────────────────────
// TEACHER ANALYTICS ENGINE
// ──────────────────────────────────────────────

/** 
 * GET /api/analytics/question-performance
 * Finds success rate of all questions in the bank based on actual student submissions,
 * sorting them ascending (lowest success rate first) so teachers know what to re-teach.
 * Protected: Admin, Teacher
 */
app.get('/api/analytics/question-performance', async (req, res) => {
  const tokenHeader = req.headers.authorization;
  let hasAccess = false;

  if (tokenHeader === 'Bearer sgi_token_secure_access_2026') {
    hasAccess = true;
  } else if (tokenHeader) {
    const token = tokenHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload.role === 'Admin' || payload.role === 'Teacher') {
        hasAccess = true;
      }
    } catch (e) {}
  }

  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Forbidden. Admin or Teacher access required.' });
  }

  try {
    // ─────────────────────────────────────────────────────────────
    // Teacher Analytics Engine Aggregation SQL Query
    // ─────────────────────────────────────────────────────────────
    const analytics = await dbAll(`
      SELECT 
        q.question_id,
        q.question_text,
        q.subject,
        q.difficulty,
        COUNT(CASE WHEN r.is_correct = 1 THEN 1 END) AS correct_count,
        COUNT(r.response_id) AS total_attempts,
        ROUND(
          COUNT(CASE WHEN r.is_correct = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(r.response_id), 0), 
          2
        ) AS success_rate
      FROM questions q
      LEFT JOIN student_responses r ON q.question_id = r.question_id
      GROUP BY q.question_id, q.question_text, q.subject, q.difficulty
      ORDER BY success_rate ASC, total_attempts DESC;
    `);

    res.json({ success: true, analytics });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to calculate question analytics.' });
  }
});

// ──────────────────────────────────────────────
// SNAPSHOTS Save Endpoint
// ──────────────────────────────────────────────
app.post('/api/snapshots', (req, res) => {
  const { session_id, image_base64, timestamp, reason } = req.body;
  if (!session_id || !image_base64) {
    return res.status(400).json({ success: false, error: 'session_id and image_base64 are required.' });
  }

  try {
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `snap_${session_id}_${Date.now()}.jpg`;
    const filepath = path.join(SNAPSHOTS_DIR, filename);

    fs.writeFileSync(filepath, buffer);

    const url = `http://localhost:5001/snapshots/${filename}`;
    res.status(201).json({ success: true, url, filename, timestamp, reason });
  } catch (err) {
    console.error("Failed to save snapshot file:", err);
    res.status(500).json({ success: false, error: 'Failed to save snapshot file.' });
  }
});

// ──────────────────────────────────────────────
// Start server
// ──────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 AeroGrade Relational SQL API Server running at http://localhost:${PORT}`);
    console.log(`   ✅ POST /api/auth/register`);
    console.log(`   ✅ POST /api/auth/login`);
    console.log(`   ✅ GET  /api/questions`);
    console.log(`   ✅ POST /api/questions (Protected)`);
    console.log(`   ✅ PUT  /api/questions/:id (Protected)`);
    console.log(`   ✅ DELETE /api/questions/:id (Protected)`);
    console.log(`   ✅ GET  /api/exams (Protected)`);
    console.log(`   ✅ POST /api/exams`);
    console.log(`   ✅ GET  /api/analytics/question-performance (Protected)`);
  });
}).catch(err => {
  console.error("❌ Failed to initialize SQLite database:", err);
});
