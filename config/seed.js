// config/seed.js — Run with: npm run seed
// Seeds Firestore with demo users, courses, quizzes, announcements
// Uses serviceAccountKey.json directly — no .env needed for Firebase

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Init Firebase (loads serviceAccountKey.json automatically)
require('./firebase');
const { db, auth, timestamp, arrayUnion } = require('./firebase');
const bcrypt = require('bcryptjs');

const seed = async () => {
  console.log('\n🌱 Seeding Firestore — project: jain-lms-f14cd\n');

  const createUser = async ({ name, email, password, role, xp = 0, streakDays = 0, badges = [] }) => {
    let uid;
    try {
      const u = await auth.createUser({ email, password, displayName: name });
      uid = u.uid;
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        const u = await auth.getUserByEmail(email);
        uid = u.uid;
        console.log(`   ♻️  Reusing: ${email}`);
      } else throw e;
    }
    const hash = await bcrypt.hash(password, 10);
    await db.collection('users').doc(uid).set({
      uid, name, email, role, xp, streakDays, badges,
      passwordHash: hash,
      enrolledCourses: [],
      certificates: [],
      isActive: true,
      lastActiveAt: timestamp(),
      createdAt: timestamp(),
    }, { merge: true });
    await auth.setCustomUserClaims(uid, { role });
    console.log(`   ✅ [${role}] ${email}`);
    return uid;
  };

  // ── Users ──────────────────────────────────────────────────
  console.log('👤 Creating users…');
  const adminUid   = await createUser({ name:'Rahul Jain',   email:'admin@jaindevelopers.com', password:'admin123',  role:'admin' });
  const priyaUid   = await createUser({ name:'Priya Sharma', email:'priya@jaindevelopers.com', password:'priya123',  role:'instructor' });
  const arjunUid   = await createUser({ name:'Arjun Mehta',  email:'arjun@jaindevelopers.com', password:'arjun123',  role:'instructor' });
  const studentUid = await createUser({ name:'Aarav Joshi',  email:'aarav@email.com',          password:'aarav123',  role:'student', xp:2840, streakDays:7, badges:['🔥 7-Day Streak','⭐ Top Learner'] });

  // ── Courses ────────────────────────────────────────────────
  console.log('\n📚 Creating courses…');

  const reactRef = db.collection('courses').doc();
  await reactRef.set({
    title: 'React.js Complete Guide',
    description: 'Master React from zero to hero. Hooks, Context API, React Router, and real projects.',
    shortDesc: 'Build modern React apps from scratch',
    emoji: '⚛️',
    instructor: arjunUid, instructorName: 'Arjun Mehta',
    category: 'web', difficulty: 'intermediate',
    tags: ['react', 'javascript', 'hooks', 'frontend'],
    githubFolder: 'web-development/react-complete-guide',
    isPublished: true, isFeatured: true,
    totalLessons: 6, durationStr: '22h 10m', enrolledCount: 1,
    sections: [
      {
        title: 'Section 1 — Getting Started', order: 1,
        lessons: [
          { id: 'l1', title: 'Course Introduction',  order: 1, durationStr: '3 min',  duration: 180,  isFree: true,
            githubPath: 'web-development/react-complete-guide/lesson-01-introduction.mp4' },
          { id: 'l2', title: 'Setup & Installation', order: 2, durationStr: '8 min',  duration: 480,  isFree: true,
            githubPath: 'web-development/react-complete-guide/lesson-02-setup.mp4' },
          { id: 'l3', title: 'Your First React App', order: 3, durationStr: '15 min', duration: 900,
            githubPath: 'web-development/react-complete-guide/lesson-03-first-app.mp4' },
        ],
      },
      {
        title: 'Section 2 — React Hooks', order: 2,
        lessons: [
          { id: 'l4', title: 'useState Deep Dive',       order: 1, durationStr: '25 min', duration: 1500,
            githubPath: 'web-development/react-complete-guide/lesson-04-usestate.mp4' },
          { id: 'l5', title: 'useEffect & Side Effects', order: 2, durationStr: '30 min', duration: 1800,
            githubPath: 'web-development/react-complete-guide/lesson-05-useeffect.mp4' },
          { id: 'l6', title: 'Custom Hooks',             order: 3, durationStr: '22 min', duration: 1320,
            githubPath: 'web-development/react-complete-guide/lesson-06-custom-hooks.mp4' },
        ],
      },
    ],
    createdAt: timestamp(), updatedAt: timestamp(),
  });
  console.log('   ✅ React.js Complete Guide — ID:', reactRef.id);

  const pythonRef = db.collection('courses').doc();
  await pythonRef.set({
    title: 'Python for Data Science', emoji: '🐍',
    description: 'Pandas, NumPy, Matplotlib, and Scikit-learn. Learn data analysis from scratch.',
    shortDesc: 'Data science with Python',
    instructor: priyaUid, instructorName: 'Priya Sharma',
    category: 'data', difficulty: 'beginner',
    tags: ['python', 'data', 'pandas', 'numpy'],
    githubFolder: 'data-science/python-for-data-science',
    isPublished: true, totalLessons: 4, durationStr: '14h 45m', enrolledCount: 1,
    sections: [{
      title: 'Section 1 — Python Basics', order: 1,
      lessons: [
        { id: 'p1', title: 'Python Setup & Jupyter', order: 1, durationStr: '10 min', isFree: true,
          githubPath: 'data-science/python-for-data-science/lesson-01-setup.mp4' },
        { id: 'p2', title: 'Variables & Data Types', order: 2, durationStr: '20 min',
          githubPath: 'data-science/python-for-data-science/lesson-02-variables.mp4' },
        { id: 'p3', title: 'Lists & Dictionaries',   order: 3, durationStr: '25 min',
          githubPath: 'data-science/python-for-data-science/lesson-03-lists.mp4' },
        { id: 'p4', title: 'Pandas Introduction',    order: 4, durationStr: '35 min',
          githubPath: 'data-science/python-for-data-science/lesson-04-pandas.mp4' },
      ],
    }],
    createdAt: timestamp(), updatedAt: timestamp(),
  });
  console.log('   ✅ Python for Data Science — ID:', pythonRef.id);

  const jsRef = await db.collection('courses').add({
    title: 'JavaScript ES6+', emoji: '💛',
    description: 'Modern JS: arrow functions, destructuring, promises, async/await, modules.',
    shortDesc: 'Modern JavaScript from scratch',
    instructor: priyaUid, instructorName: 'Priya Sharma',
    category: 'web', difficulty: 'beginner',
    tags: ['javascript', 'es6', 'frontend'],
    githubFolder: 'web-development/javascript-es6',
    isPublished: true, totalLessons: 28, durationStr: '10h', enrolledCount: 287,
    sections: [], createdAt: timestamp(), updatedAt: timestamp(),
  });
  console.log('   ✅ JavaScript ES6+ — ID:', jsRef.id);

  await db.collection('courses').add({
    title: 'Flutter Mobile Dev', emoji: '📱',
    description: 'Build iOS and Android apps with Flutter and Dart.',
    shortDesc: 'Cross-platform mobile development',
    instructor: arjunUid, instructorName: 'Arjun Mehta',
    category: 'mobile', difficulty: 'intermediate',
    tags: ['flutter', 'dart', 'mobile'],
    githubFolder: 'mobile/flutter-mobile-dev',
    isPublished: false, totalLessons: 42, durationStr: '18h 15m', enrolledCount: 0,
    sections: [], createdAt: timestamp(), updatedAt: timestamp(),
  });
  console.log('   ✅ Flutter Mobile Dev (draft)');

  // Enroll student in React + Python
  await db.collection('users').doc(studentUid).update({
    enrolledCourses: [reactRef.id, pythonRef.id],
  });

  // Progress doc for student
  await db.collection('progress').doc(`${studentUid}_${reactRef.id}`).set({
    uid: studentUid, courseId: reactRef.id,
    completedLessons: ['l1', 'l2'], percentComplete: 33,
    isCompleted: false, lastLessonId: 'l3',
    watchTime: { l1: 180, l2: 480 }, quizScores: [],
    createdAt: timestamp(), updatedAt: timestamp(),
  });

  // ── Quizzes ────────────────────────────────────────────────
  console.log('\n📝 Creating quizzes…');
  await db.collection('quizzes').add({
    courseId: reactRef.id, title: 'React Fundamentals Quiz',
    timeLimit: 300, passMark: 60, isActive: true,
    questions: [
      { question: 'Which hook manages local state in React?', options: ['useEffect','useState','useContext','useReducer'], correct: 1, explanation: 'useState manages local component state.' },
      { question: 'What does JSX stand for?', options: ['JavaScript XML','JavaScript Extension','Java Syntax','JSON XML'], correct: 0, explanation: 'JSX = JavaScript XML.' },
      { question: 'Which hook runs after every render by default?', options: ['useState','useMemo','useEffect','useRef'], correct: 2, explanation: 'useEffect runs after every render unless given a dep array.' },
      { question: 'How is data passed from parent to child in React?', options: ['State','Context','Props','Redux'], correct: 2, explanation: 'Props pass data from parent to child.' },
      { question: 'Command to create a React app?', options: ['npm init react','npx create-react-app','npm install react','react new'], correct: 1, explanation: 'npx create-react-app my-app is the standard command.' },
    ],
    createdAt: timestamp(),
  });
  console.log('   ✅ React Fundamentals Quiz');

  await db.collection('quizzes').add({
    courseId: pythonRef.id, title: 'Python Basics Quiz',
    timeLimit: 240, passMark: 60, isActive: true,
    questions: [
      { question: 'Which library is used for data analysis in Python?', options: ['NumPy','Pandas','Matplotlib','Scikit-learn'], correct: 1, explanation: 'Pandas is the primary data analysis library.' },
      { question: 'How do you create a list in Python?', options: ['{}','()','[]','<>'], correct: 2, explanation: 'Square brackets [] create a list.' },
      { question: 'What does print(type(3.14)) return?', options: ['int','str','float','double'], correct: 2, explanation: '3.14 is a float in Python.' },
      { question: 'Which keyword defines a function in Python?', options: ['function','def','fn','func'], correct: 1, explanation: 'def is used to define functions.' },
    ],
    createdAt: timestamp(),
  });
  console.log('   ✅ Python Basics Quiz');

  // ── Announcements ──────────────────────────────────────────
  console.log('\n📢 Creating announcements…');
  await db.collection('announcements').add({ title:'Welcome to Jain Developers LMS!', body:'We are excited to launch our new learning platform. Browse courses, track progress, and earn certificates!', tag:'info', authorName:'Rahul Jain', isActive:true, createdAt:timestamp() });
  await db.collection('announcements').add({ title:'New Course Coming: Flutter Mobile Dev', body:'Our Flutter & Dart course is in development. Watch this space for the launch!', tag:'event', authorName:'Rahul Jain', isActive:true, createdAt:timestamp() });
  console.log('   ✅ 2 announcements');

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Firestore seed complete!

   Firebase Project : jain-lms-f14cd
   Firestore DB     : (default)

   Admin      : admin@jaindevelopers.com / admin123
   Instructor : priya@jaindevelopers.com / priya123
   Instructor : arjun@jaindevelopers.com / arjun123
   Student    : aarav@email.com          / aarav123

   ⚠️  Change passwords before sharing publicly!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  process.exit(0);
};

seed().catch(err => { console.error('❌', err.message); process.exit(1); });
