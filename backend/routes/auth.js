const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, admin } = require('../server');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    // Check if user already exists
    const existing = await db.collection('users').where('email', '==', email).get();
    if (!existing.empty) return res.status(400).json({ error: 'Email already registered' });

    // Create Firebase Auth user
    const firebaseUser = await admin.auth().createUser({ email, password, displayName: name });

    // Hash password and store in Firestore
    const passwordHash = bcrypt.hashSync(password, 10);
    const userData = {
      uid: firebaseUser.uid,
      name,
      email,
      role: 'student',
      passwordHash,
      xp: 0,
      streakDays: 0,
      enrolledCourses: [],
      badges: [],
      certificates: [],
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(firebaseUser.uid).set(userData);

    const token = jwt.sign({ uid: firebaseUser.uid, email, role: 'student' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { uid: firebaseUser.uid, name, email, role: 'student', xp: 0 },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) return res.status(401).json({ error: 'Invalid credentials' });

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ uid: user.uid, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { uid: user.uid, name: user.name, email: user.email, role: user.role, xp: user.xp, streakDays: user.streakDays },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const { passwordHash, ...user } = req.user;
  res.json({ user });
});

module.exports = router;
