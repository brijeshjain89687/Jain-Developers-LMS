// routes/seed.js  — visit /api/seed?secret=jain-seed-2024
const express = require('express');
const bcrypt  = require('bcryptjs');
const { db, fba, ts, arrUnion } = require('../config/firebase');
const router  = express.Router();

const handler = async (req, res) => {
  try {
    const secret = req.query.secret || (req.body && req.body.secret);
    if (secret !== (process.env.SEED_SECRET || 'jain-seed-2024')) {
      return res.status(403).json({ error: 'Wrong secret. Add ?secret=jain-seed-2024' });
    }

    const log = [];

    const mkUser = async (name, email, password, role, xp, streak, badges) => {
      let uid;
      try { const u = await fba.createUser({ email, password, displayName: name }); uid = u.uid; log.push('Created: ' + email); }
      catch (e) {
        if (e.code === 'auth/email-already-exists') { const u = await fba.getUserByEmail(email); uid = u.uid; log.push('Exists: ' + email); }
        else throw e;
      }
      await db.collection('users').doc(uid).set({
        uid, name, email, role, xp: xp||0, streakDays: streak||0, badges: badges||[],
        passwordHash: await bcrypt.hash(password, 10),
        enrolledCourses: [], certificates: [], isActive: true, createdAt: ts(),
      }, { merge: true });
      await fba.setCustomUserClaims(uid, { role });
      return uid;
    };

    const adminUid   = await mkUser('Rahul Jain',   'admin@jaindevelopers.com', 'admin123', 'admin');
    const priyaUid   = await mkUser('Priya Sharma', 'priya@jaindevelopers.com', 'priya123', 'instructor');
    const arjunUid   = await mkUser('Arjun Mehta',  'arjun@jaindevelopers.com', 'arjun123', 'instructor');
    const aaravUid   = await mkUser('Aarav Joshi',  'aarav@email.com',          'aarav123', 'student', 2840, 7, ['🔥 7-Day Streak']);

    const reactRef = db.collection('courses').doc();
    await reactRef.set({
      title: 'React.js Complete Guide', emoji: '⚛️',
      description: 'Master React from zero to hero. Hooks, Context API, React Router.',
      shortDesc: 'Build modern React apps', instructor: arjunUid, instructorName: 'Arjun Mehta',
      category: 'web', difficulty: 'intermediate', tags: ['react','javascript'],
      githubFolder: 'web-development/react-complete-guide',
      isPublished: true, totalLessons: 6, durationStr: '22h 10m', enrolledCount: 1,
      projectTitle: 'Build a Full Todo App with React',
      projectDescription: 'Create a complete Todo application using React hooks, local state, and component composition. Must include add, edit, delete, and filter functionality.',
      projectDeadlineDays: 7,
      sections: [
        { title: 'Section 1 — Getting Started', order: 1, lessons: [
          { id:'l1', title:'Course Introduction', order:1, durationStr:'3 min', isFree:true,  githubPath:'web-development/react-complete-guide/lesson-01-introduction.mp4' },
          { id:'l2', title:'Setup & Installation', order:2, durationStr:'8 min', isFree:true,  githubPath:'web-development/react-complete-guide/lesson-02-setup.mp4' },
          { id:'l3', title:'Your First React App', order:3, durationStr:'15 min', isFree:false, githubPath:'web-development/react-complete-guide/lesson-03-first-app.mp4' },
        ]},
        { title: 'Section 2 — React Hooks', order: 2, lessons: [
          { id:'l4', title:'useState Deep Dive', order:1, durationStr:'25 min', isFree:false, githubPath:'web-development/react-complete-guide/lesson-04-usestate.mp4' },
          { id:'l5', title:'useEffect & Side Effects', order:2, durationStr:'30 min', isFree:false, githubPath:'web-development/react-complete-guide/lesson-05-useeffect.mp4' },
          { id:'l6', title:'Custom Hooks', order:3, durationStr:'22 min', isFree:false, githubPath:'web-development/react-complete-guide/lesson-06-custom-hooks.mp4' },
        ]},
      ],
      createdAt: ts(), updatedAt: ts(),
    });
    log.push('React course: ' + reactRef.id);

    const pythonRef = db.collection('courses').doc();
    await pythonRef.set({
      title: 'Python for Data Science', emoji: '🐍',
      description: 'Pandas, NumPy, Matplotlib, Scikit-learn from scratch.',
      shortDesc: 'Data science with Python', instructor: priyaUid, instructorName: 'Priya Sharma',
      category: 'data', difficulty: 'beginner', tags: ['python','data','pandas'],
      githubFolder: 'data-science/python-for-data-science',
      isPublished: true, totalLessons: 4, durationStr: '14h 45m', enrolledCount: 1,
      projectTitle: 'Data Analysis Report — Sales Dataset',
      projectDescription: 'Analyze a provided sales CSV dataset using Pandas. Create visualizations with Matplotlib and submit a Jupyter notebook with your findings.',
      projectDeadlineDays: 10,
      sections: [{ title: 'Section 1 — Python Basics', order: 1, lessons: [
        { id:'p1', title:'Python Setup & Jupyter', order:1, durationStr:'10 min', isFree:true,  githubPath:'data-science/python-for-data-science/lesson-01-setup.mp4' },
        { id:'p2', title:'Variables & Data Types', order:2, durationStr:'20 min', isFree:false, githubPath:'data-science/python-for-data-science/lesson-02-variables.mp4' },
        { id:'p3', title:'Lists & Dictionaries', order:3, durationStr:'25 min', isFree:false, githubPath:'data-science/python-for-data-science/lesson-03-lists.mp4' },
        { id:'p4', title:'Pandas Introduction', order:4, durationStr:'35 min', isFree:false, githubPath:'data-science/python-for-data-science/lesson-04-pandas.mp4' },
      ]}],
      createdAt: ts(), updatedAt: ts(),
    });
    log.push('Python course: ' + pythonRef.id);

    await db.collection('courses').add({ title:'JavaScript ES6+', emoji:'💛', description:'Modern JS: arrow functions, destructuring, async/await.', shortDesc:'Modern JS', instructor:priyaUid, instructorName:'Priya Sharma', category:'web', difficulty:'beginner', tags:['javascript'], githubFolder:'web-development/javascript-es6', isPublished:true, totalLessons:28, durationStr:'10h', enrolledCount:287, projectTitle:'Build a Weather App', projectDescription:'Create a weather app using fetch API and a free weather API. Display current weather and 5-day forecast.', projectDeadlineDays:5, sections:[], createdAt:ts(), updatedAt:ts() });
    await db.collection('courses').add({ title:'Flutter Mobile Dev', emoji:'📱', description:'Build iOS and Android apps with Flutter and Dart.', shortDesc:'Cross-platform mobile', instructor:arjunUid, instructorName:'Arjun Mehta', category:'mobile', difficulty:'intermediate', tags:['flutter','dart'], githubFolder:'mobile/flutter-mobile-dev', isPublished:false, totalLessons:42, durationStr:'18h', enrolledCount:0, projectTitle:'Build a Chat App', projectDescription:'Build a simple real-time chat app using Flutter and Firebase Realtime Database.', projectDeadlineDays:14, sections:[], createdAt:ts(), updatedAt:ts() });

    // Enroll aarav in react + python
    await db.collection('users').doc(aaravUid).update({ enrolledCourses: [reactRef.id, pythonRef.id] });
    await db.collection('progress').doc(`${aaravUid}_${reactRef.id}`).set({ uid:aaravUid, courseId:reactRef.id, completedLessons:['l1','l2'], percentComplete:33, isCompleted:false, lastLessonId:'l3', watchTime:{l1:180,l2:480}, quizScores:[], createdAt:ts(), updatedAt:ts() });

    // Quiz for React
    await db.collection('quizzes').add({
      courseId: reactRef.id, title: 'React Fundamentals Quiz', timeLimit: 300, passMark: 60, isActive: true,
      questions: [
        { question:'Which hook manages local state?', options:['useEffect','useState','useContext','useReducer'], correct:1, explanation:'useState manages local component state.' },
        { question:'What does JSX stand for?', options:['JavaScript XML','JavaScript Extension','Java Syntax','JSON XML'], correct:0, explanation:'JSX = JavaScript XML.' },
        { question:'Which hook runs after every render by default?', options:['useState','useMemo','useEffect','useRef'], correct:2, explanation:'useEffect runs after every render.' },
        { question:'How is data passed from parent to child?', options:['State','Context','Props','Redux'], correct:2, explanation:'Props pass data from parent to child.' },
        { question:'Command to create a React app?', options:['npm init react','npx create-react-app','npm install react','react new'], correct:1, explanation:'npx create-react-app my-app' },
      ],
      createdAt: ts(),
    });

    // Announcements
    await db.collection('announcements').add({ title:'Welcome to Jain Developers LMS!', body:'Browse courses, track progress, and earn certificates!', tag:'info', authorName:'Rahul Jain', isActive:true, createdAt:ts() });

    res.json({ success: true, message: 'Seeded!', accounts: { admin:'admin@jaindevelopers.com / admin123', student:'aarav@email.com / aarav123' }, log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/',  handler);
router.post('/', handler);
module.exports = router;
