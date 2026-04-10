// routes/seed.js
// ============================================================
//  Remote seed endpoint — POST /api/seed
//  Allows seeding Firestore from the browser (no terminal needed)
//  Protected by SEED_SECRET env var or defaults to 'jain-seed-2024'
// ============================================================

const express = require('express');
const bcrypt  = require('bcryptjs');
const { db, auth, timestamp, arrayUnion } = require('../config/firebase');

const router = express.Router();

// Accept both GET (browser) and POST (curl/fetch)
const seedHandler = async (req, res, next) => {
  try {
    // Simple secret check — set SEED_SECRET in Render env vars
    const secret = req.body.secret || req.query.secret;
    const expected = process.env.SEED_SECRET || 'jain-seed-2024';
    if (secret !== expected) {
      return res.status(403).json({ error: 'Invalid seed secret' });
    }

    const results = [];

    const createUser = async ({ name, email, password, role, xp = 0, streakDays = 0, badges = [] }) => {
      let uid;
      try {
        const u = await auth.createUser({ email, password, displayName: name });
        uid = u.uid;
        results.push(`Created auth user: ${email}`);
      } catch (e) {
        if (e.code === 'auth/email-already-exists') {
          const u = await auth.getUserByEmail(email);
          uid = u.uid;
          results.push(`Reusing auth user: ${email}`);
        } else throw e;
      }
      const hash = await bcrypt.hash(password, 10);
      await db.collection('users').doc(uid).set({
        uid, name, email, role, xp, streakDays, badges,
        passwordHash: hash, enrolledCourses: [], certificates: [],
        isActive: true, lastActiveAt: timestamp(), createdAt: timestamp(),
      }, { merge: true });
      await auth.setCustomUserClaims(uid, { role });
      return uid;
    };

    // Users
    const adminUid   = await createUser({ name: 'Rahul Jain',   email: 'admin@jaindevelopers.com', password: 'admin123',  role: 'admin' });
    const priyaUid   = await createUser({ name: 'Priya Sharma', email: 'priya@jaindevelopers.com', password: 'priya123',  role: 'instructor' });
    const arjunUid   = await createUser({ name: 'Arjun Mehta',  email: 'arjun@jaindevelopers.com', password: 'arjun123',  role: 'instructor' });
    const studentUid = await createUser({ name: 'Aarav Joshi',  email: 'aarav@email.com',          password: 'aarav123',  role: 'student', xp: 2840, streakDays: 7, badges: ['🔥 7-Day Streak', '⭐ Top Learner'] });
    results.push('All users created');

    // React course
    const reactRef = db.collection('courses').doc();
    await reactRef.set({
      title: 'React.js Complete Guide', emoji: '⚛️',
      description: 'Master React from zero to hero. Hooks, Context API, React Router, and real projects.',
      shortDesc: 'Build modern React apps from scratch',
      instructor: arjunUid, instructorName: 'Arjun Mehta',
      category: 'web', difficulty: 'intermediate',
      tags: ['react', 'javascript', 'hooks'],
      githubFolder: 'web-development/react-complete-guide',
      isPublished: true, isFeatured: true,
      totalLessons: 6, durationStr: '22h 10m', enrolledCount: 1,
      sections: [
        { title: 'Section 1 — Getting Started', order: 1, lessons: [
          { id: 'l1', title: 'Course Introduction',  order: 1, durationStr: '3 min',  duration: 180,  isFree: true,  githubPath: 'web-development/react-complete-guide/lesson-01-introduction.mp4' },
          { id: 'l2', title: 'Setup & Installation', order: 2, durationStr: '8 min',  duration: 480,  isFree: true,  githubPath: 'web-development/react-complete-guide/lesson-02-setup.mp4' },
          { id: 'l3', title: 'Your First React App', order: 3, durationStr: '15 min', duration: 900,                 githubPath: 'web-development/react-complete-guide/lesson-03-first-app.mp4' },
        ]},
        { title: 'Section 2 — React Hooks', order: 2, lessons: [
          { id: 'l4', title: 'useState Deep Dive',       order: 1, durationStr: '25 min', duration: 1500, githubPath: 'web-development/react-complete-guide/lesson-04-usestate.mp4' },
          { id: 'l5', title: 'useEffect & Side Effects', order: 2, durationStr: '30 min', duration: 1800, githubPath: 'web-development/react-complete-guide/lesson-05-useeffect.mp4' },
          { id: 'l6', title: 'Custom Hooks',             order: 3, durationStr: '22 min', duration: 1320, githubPath: 'web-development/react-complete-guide/lesson-06-custom-hooks.mp4' },
        ]},
      ],
      createdAt: timestamp(), updatedAt: timestamp(),
    });
    results.push('React course created: ' + reactRef.id);

    // Python course
    const pythonRef = db.collection('courses').doc();
    await pythonRef.set({
      title: 'Python for Data Science', emoji: '🐍',
      description: 'Pandas, NumPy, Matplotlib, and Scikit-learn.',
      shortDesc: 'Data science with Python',
      instructor: priyaUid, instructorName: 'Priya Sharma',
      category: 'data', difficulty: 'beginner',
      tags: ['python', 'data', 'pandas'],
      githubFolder: 'data-science/python-for-data-science',
      isPublished: true, totalLessons: 4, durationStr: '14h 45m', enrolledCount: 1,
      sections: [{ title: 'Section 1 — Python Basics', order: 1, lessons: [
        { id: 'p1', title: 'Python Setup & Jupyter', order: 1, durationStr: '10 min', isFree: true,  githubPath: 'data-science/python-for-data-science/lesson-01-setup.mp4' },
        { id: 'p2', title: 'Variables & Data Types', order: 2, durationStr: '20 min',                githubPath: 'data-science/python-for-data-science/lesson-02-variables.mp4' },
        { id: 'p3', title: 'Lists & Dictionaries',   order: 3, durationStr: '25 min',                githubPath: 'data-science/python-for-data-science/lesson-03-lists.mp4' },
        { id: 'p4', title: 'Pandas Introduction',    order: 4, durationStr: '35 min',                githubPath: 'data-science/python-for-data-science/lesson-04-pandas.mp4' },
      ]}],
      createdAt: timestamp(), updatedAt: timestamp(),
    });
    results.push('Python course created: ' + pythonRef.id);

    // More courses
    await db.collection('courses').add({ title: 'JavaScript ES6+', emoji: '💛', description: 'Modern JS: arrow functions, destructuring, async/await.', shortDesc: 'Modern JS from scratch', instructor: priyaUid, instructorName: 'Priya Sharma', category: 'web', difficulty: 'beginner', tags: ['javascript', 'es6'], githubFolder: 'web-development/javascript-es6', isPublished: true, totalLessons: 28, durationStr: '10h', enrolledCount: 287, sections: [], createdAt: timestamp(), updatedAt: timestamp() });
    await db.collection('courses').add({ title: 'Flutter Mobile Dev', emoji: '📱', description: 'Build iOS and Android apps with Flutter and Dart.', shortDesc: 'Cross-platform mobile', instructor: arjunUid, instructorName: 'Arjun Mehta', category: 'mobile', difficulty: 'intermediate', tags: ['flutter', 'dart'], githubFolder: 'mobile/flutter-mobile-dev', isPublished: false, totalLessons: 42, durationStr: '18h', enrolledCount: 0, sections: [], createdAt: timestamp(), updatedAt: timestamp() });
    results.push('Extra courses created');

    // Enroll student
    await db.collection('users').doc(studentUid).update({ enrolledCourses: [reactRef.id, pythonRef.id] });
    await db.collection('progress').doc(`${studentUid}_${reactRef.id}`).set({ uid: studentUid, courseId: reactRef.id, completedLessons: ['l1', 'l2'], percentComplete: 33, isCompleted: false, lastLessonId: 'l3', watchTime: { l1: 180, l2: 480 }, quizScores: [], createdAt: timestamp(), updatedAt: timestamp() });
    results.push('Student enrolled and progress created');

    // Quiz
    await db.collection('quizzes').add({
      courseId: reactRef.id, title: 'React Fundamentals Quiz', timeLimit: 300, passMark: 60, isActive: true,
      questions: [
        { question: 'Which hook manages local state in React?', options: ['useEffect','useState','useContext','useReducer'], correct: 1, explanation: 'useState manages local component state.' },
        { question: 'What does JSX stand for?', options: ['JavaScript XML','JavaScript Extension','Java Syntax','JSON XML'], correct: 0, explanation: 'JSX = JavaScript XML.' },
        { question: 'Which hook runs after every render by default?', options: ['useState','useMemo','useEffect','useRef'], correct: 2, explanation: 'useEffect runs after every render by default.' },
        { question: 'How is data passed from parent to child?', options: ['State','Context','Props','Redux'], correct: 2, explanation: 'Props pass data from parent to child.' },
        { question: 'Command to create a React app?', options: ['npm init react','npx create-react-app','npm install react','react new'], correct: 1, explanation: 'npx create-react-app is the standard command.' },
      ],
      createdAt: timestamp(),
    });
    results.push('Quiz created');

    // Announcements
    await db.collection('announcements').add({ title: 'Welcome to Jain Developers LMS!', body: 'Browse courses, track progress, and earn certificates. Happy learning!', tag: 'info', authorName: 'Rahul Jain', isActive: true, createdAt: timestamp() });
    await db.collection('announcements').add({ title: 'New Course Coming: Flutter Mobile Dev', body: 'Our Flutter & Dart course is in development. Stay tuned!', tag: 'event', authorName: 'Rahul Jain', isActive: true, createdAt: timestamp() });
    results.push('Announcements created');

    res.json({
      success: true,
      message: 'Firestore seeded successfully!',
      accounts: {
        admin:      'admin@jaindevelopers.com / admin123',
        instructor: 'priya@jaindevelopers.com / priya123',
        student:    'aarav@email.com / aarav123',
      },
      results,
    });
  } catch (err) {
    console.error('Seed error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', seedHandler);
router.post('/', seedHandler);

module.exports = router;
