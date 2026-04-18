require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const admin = require('firebase-admin');

// ─── Firebase Init ───────────────────────────────────────────────────────────
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
module.exports = { db, admin };

// ─── App Setup ───────────────────────────────────────────────────────────────
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Rate limiting
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// ─── Static Files ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res) => res.setHeader('Content-Type-Options', 'nosniff'),
}));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/quizzes', require('./routes/quizzes'));
app.use('/api/users', require('./routes/users'));
app.use('/api/announcements', require('./routes/announcements'));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    project: 'Jain Developers LMS',
    version: '3.0',
  });
});

// ─── Seed Endpoint ───────────────────────────────────────────────────────────
app.get('/api/seed', async (req, res) => {
  if (req.query.secret !== process.env.SEED_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const bcrypt = require('bcryptjs');
    const batch = db.batch();

    // Admin user
    const adminRef = db.collection('users').doc('admin-001');
    batch.set(adminRef, {
      uid: 'admin-001',
      name: 'Admin',
      email: 'admin@jaindevelopers.com',
      role: 'admin',
      passwordHash: bcrypt.hashSync('admin123', 10),
      xp: 0,
      streakDays: 0,
      enrolledCourses: [],
      badges: [],
      certificates: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Sample courses
    const courses = [
      {
        id: 'course-001',
        title: 'Full-Stack Web Development',
        emoji: '🌐',
        description: 'Master Node.js, React, and MongoDB from scratch.',
        category: 'Web Dev',
        difficulty: 'Intermediate',
        duration: '48h',
        instructor: 'Arjun Mehta',
        enrolledCount: 312,
        isPublished: true,
        githubFolder: 'web-dev',
        projectTitle: 'Build a Full-Stack Todo App',
        projectDescription: 'Create a complete todo application with authentication, CRUD operations, and deployment to Render.',
        projectDeadlineDays: 14,
        sections: [
          {
            title: 'JavaScript Fundamentals',
            lessons: [
              { id: 'l1', title: 'Variables & Data Types', duration: '12:30', isFree: true },
              { id: 'l2', title: 'Functions & Closures', duration: '18:45', isFree: true },
              { id: 'l3', title: 'Async/Await Deep Dive', duration: '22:10', isFree: false },
              { id: 'l4', title: 'ES6+ Modern JavaScript', duration: '19:00', isFree: false },
            ],
          },
          {
            title: 'Node.js & Express',
            lessons: [
              { id: 'l5', title: 'Node.js Fundamentals', duration: '15:20', isFree: false },
              { id: 'l6', title: 'REST API Design', duration: '28:00', isFree: false },
              { id: 'l7', title: 'Middleware & Auth', duration: '24:15', isFree: false },
            ],
          },
          {
            title: 'React Frontend',
            lessons: [
              { id: 'l8', title: 'Components & Props', duration: '16:00', isFree: false },
              { id: 'l9', title: 'State & useEffect', duration: '22:30', isFree: false },
              { id: 'l10', title: 'React Router & Context', duration: '20:00', isFree: false },
            ],
          },
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {
        id: 'course-002',
        title: 'Data Science with Python',
        emoji: '📊',
        description: 'Learn pandas, NumPy, matplotlib and ML basics.',
        category: 'Data Science',
        difficulty: 'Beginner',
        duration: '36h',
        instructor: 'Priya Sharma',
        enrolledCount: 198,
        isPublished: true,
        githubFolder: 'data-science',
        projectTitle: 'Sales Data Analysis Dashboard',
        projectDescription: 'Analyze a real-world sales dataset and create interactive visualizations using matplotlib and seaborn.',
        projectDeadlineDays: 10,
        sections: [
          {
            title: 'Python Basics',
            lessons: [
              { id: 'l11', title: 'Python Setup & Syntax', duration: '10:00', isFree: true },
              { id: 'l12', title: 'Data Structures', duration: '16:30', isFree: false },
              { id: 'l13', title: 'Functions & OOP', duration: '20:00', isFree: false },
            ],
          },
          {
            title: 'Data Analysis',
            lessons: [
              { id: 'l14', title: 'NumPy Essentials', duration: '18:00', isFree: false },
              { id: 'l15', title: 'Pandas DataFrames', duration: '25:00', isFree: false },
              { id: 'l16', title: 'Data Visualization', duration: '22:00', isFree: false },
            ],
          },
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {
        id: 'course-003',
        title: 'React Native Mobile Dev',
        emoji: '📱',
        description: 'Build cross-platform mobile apps with React Native.',
        category: 'Mobile',
        difficulty: 'Advanced',
        duration: '52h',
        instructor: 'Vikram Patel',
        enrolledCount: 143,
        isPublished: true,
        githubFolder: 'react-native',
        projectTitle: 'Expense Tracker App',
        projectDescription: 'Build a mobile expense tracker with local storage, charts, and push notifications.',
        projectDeadlineDays: 21,
        sections: [
          {
            title: 'React Native Basics',
            lessons: [
              { id: 'l17', title: 'Environment Setup', duration: '08:15', isFree: true },
              { id: 'l18', title: 'Core Components', duration: '20:00', isFree: false },
              { id: 'l19', title: 'Navigation', duration: '18:30', isFree: false },
            ],
          },
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {
        id: 'course-004',
        title: 'DevOps & Cloud Fundamentals',
        emoji: '☁️',
        description: 'Docker, Kubernetes, CI/CD pipelines and AWS basics.',
        category: 'DevOps',
        difficulty: 'Intermediate',
        duration: '30h',
        instructor: 'Sneha Gupta',
        enrolledCount: 89,
        isPublished: true,
        githubFolder: 'devops',
        projectTitle: 'Deploy a Node App to AWS',
        projectDescription: 'Containerize and deploy a Node.js app using Docker and AWS EC2 with a full CI/CD pipeline.',
        projectDeadlineDays: 18,
        sections: [
          {
            title: 'Docker & Containers',
            lessons: [
              { id: 'l20', title: 'What is Docker?', duration: '11:00', isFree: true },
              { id: 'l21', title: 'Writing Dockerfiles', duration: '19:30', isFree: false },
              { id: 'l22', title: 'Docker Compose', duration: '16:00', isFree: false },
            ],
          },
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    ];

    for (const course of courses) {
      const { id, ...data } = course;
      batch.set(db.collection('courses').doc(id), data);
    }

    // Sample quizzes
    const quizzes = [
      {
        courseId: 'course-001',
        title: 'Web Dev Fundamentals Quiz',
        timeLimit: 900,
        passMark: 70,
        questions: [
          { question: 'What does DOM stand for?', options: ['Document Object Model', 'Data Object Model', 'Document Order Manager', 'Dynamic Object Module'], correctAnswer: 0, explanation: 'DOM stands for Document Object Model.' },
          { question: 'Which keyword declares a block-scoped variable?', options: ['var', 'let', 'define', 'const'], correctAnswer: 1, explanation: 'let declares a block-scoped variable.' },
          { question: 'What does CSS stand for?', options: ['Computer Style Sheet', 'Cascading Style Sheets', 'Creative Style System', 'Coded Stylesheet'], correctAnswer: 1, explanation: 'CSS stands for Cascading Style Sheets.' },
          { question: 'Which HTTP method creates a new resource?', options: ['GET', 'DELETE', 'POST', 'PATCH'], correctAnswer: 2, explanation: 'POST creates new resources.' },
          { question: 'What is a closure in JavaScript?', options: ['A way to close the browser', 'A function retaining lexical scope', 'A CSS property', 'A type of loop'], correctAnswer: 1, explanation: 'A closure retains access to its enclosing scope.' },
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {
        courseId: 'course-002',
        title: 'Python Basics Quiz',
        timeLimit: 600,
        passMark: 60,
        questions: [
          { question: 'Which of the following is a Python list?', options: ['(1, 2, 3)', '{1, 2, 3}', '[1, 2, 3]', '{1: 2}'], correctAnswer: 2, explanation: 'Lists use square brackets [].' },
          { question: 'What does len() return?', options: ['Last element', 'Length of object', 'First element', 'Type of object'], correctAnswer: 1, explanation: 'len() returns the length/count of elements.' },
          { question: 'Which keyword is used to define a function in Python?', options: ['function', 'def', 'func', 'define'], correctAnswer: 1, explanation: 'def is used to define functions in Python.' },
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    ];

    for (const quiz of quizzes) {
      batch.set(db.collection('quizzes').doc(), quiz);
    }

    // Sample announcements
    const announcements = [
      { title: 'Welcome to Jain Developers LMS!', body: 'Start browsing our courses and begin your learning journey today.', tag: 'Info', isActive: true, createdAt: admin.firestore.FieldValue.serverTimestamp() },
      { title: 'New Course: UI/UX Design Bootcamp', body: 'We have just launched our design fundamentals course. Early bird pricing available this week!', tag: 'Event', isActive: true, createdAt: admin.firestore.FieldValue.serverTimestamp() },
      { title: 'System Maintenance Tonight', body: 'The platform will be under brief maintenance from 2-3 AM IST. Please save your progress before then.', tag: 'Urgent', isActive: true, createdAt: admin.firestore.FieldValue.serverTimestamp() },
    ];

    for (const ann of announcements) {
      batch.set(db.collection('announcements').doc(), ann);
    }

    await batch.commit();
    res.json({ success: true, message: 'Database seeded successfully!' });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── SPA Fallback ─────────────────────────────────────────────────────────────
app.get('/student', (req, res) => res.sendFile(path.join(__dirname, '../public/student.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../public/admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

// ─── Keep-Alive (Render Free Tier) ───────────────────────────────────────────
if (process.env.RENDER_APP_URL) {
  setInterval(() => {
    fetch(`${process.env.RENDER_APP_URL}/api/health`).catch(() => {});
  }, 13 * 60 * 1000);
}

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Jain LMS running on port ${PORT}`));
