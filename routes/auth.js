// routes/auth.js
const express = require('express');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { db, auth, timestamp } = require('../config/firebase');
const { protect } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'jain-lms-secret-key-2024';
const signJwt = (uid) => jwt.sign({ uid }, JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', [
  body('name').trim().isLength({ min: 2 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role = 'student' } = req.body;
    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({ email, password, displayName: name });
    } catch (e) {
      if (e.code === 'auth/email-already-exists') return res.status(400).json({ error: 'Email already registered' });
      throw e;
    }

    const uid  = firebaseUser.uid;
    const hash = await bcrypt.hash(password, 10);
    const safeRole = ['admin','instructor','student'].includes(role) ? role : 'student';

    await db.collection('users').doc(uid).set({
      uid, name, email, role: safeRole, xp: 0, streakDays: 0,
      passwordHash: hash, enrolledCourses: [], certificates: [], badges: [],
      isActive: true, lastActiveAt: timestamp(), createdAt: timestamp(),
    });
    await auth.setCustomUserClaims(uid, { role: safeRole });

    res.status(201).json({ success: true, token: signJwt(uid), user: { uid, name, email, role: safeRole, xp: 0, streakDays: 0 } });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', [body('email').isEmail(), body('password').notEmpty()], async (req, res, next) => {
  try {
    const { email, password } = req.body;
    let firebaseUser;
    try { firebaseUser = await auth.getUserByEmail(email); }
    catch { return res.status(401).json({ error: 'Invalid email or password' }); }

    const doc = await db.collection('users').doc(firebaseUser.uid).get();
    if (!doc.exists) return res.status(401).json({ error: 'User profile not found' });
    const profile = doc.data();
    if (!profile.isActive) return res.status(403).json({ error: 'Account deactivated' });
    if (!profile.passwordHash) return res.status(400).json({ error: 'Use Firebase sign-in on the student platform.' });

    const valid = await bcrypt.compare(password, profile.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    // Update streak
    const now = new Date(), last = profile.lastActiveAt?.toDate?.() || new Date(0);
    const diffH = (now - last) / 3600000;
    let streak = profile.streakDays || 0;
    if (diffH >= 20 && diffH < 48) streak += 1;
    else if (diffH >= 48) streak = 1;

    await db.collection('users').doc(firebaseUser.uid).update({ lastActiveAt: timestamp(), streakDays: streak });

    res.json({
      success: true, token: signJwt(firebaseUser.uid),
      user: { uid: firebaseUser.uid, name: profile.name, email: profile.email, role: profile.role, xp: profile.xp, streakDays: streak, badges: profile.badges || [], enrolledCourses: profile.enrolledCourses || [] },
    });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  const { passwordHash, ...safe } = req.user;
  res.json({ success: true, user: safe });
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    await auth.updateUser(req.user.uid, { password: newPassword });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.collection('users').doc(req.user.uid).update({ passwordHash: hash });
    res.json({ success: true, message: 'Password updated' });
  } catch (err) { next(err); }
});

module.exports = router;
