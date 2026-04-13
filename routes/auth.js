// routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { db, fba, ts } = require('../config/firebase');
const { protect } = require('../middleware/auth');

const router  = express.Router();
const SECRET  = process.env.JWT_SECRET || 'jain-lms-2024';
const signJwt = uid => jwt.sign({ uid }, SECRET, { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role = 'student' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    let uid;
    try {
      const u = await fba.createUser({ email, password, displayName: name });
      uid = u.uid;
    } catch (e) {
      if (e.code === 'auth/email-already-exists') return res.status(400).json({ error: 'Email already registered' });
      throw e;
    }

    const safeRole = ['admin','instructor','student'].includes(role) ? role : 'student';
    const hash = await bcrypt.hash(password, 10);
    await db.collection('users').doc(uid).set({
      uid, name, email, role: safeRole, xp: 0, streakDays: 0,
      passwordHash: hash, enrolledCourses: [], certificates: [], badges: [],
      isActive: true, createdAt: ts(),
    });
    await fba.setCustomUserClaims(uid, { role: safeRole });

    res.status(201).json({ success: true, token: signJwt(uid), user: { uid, name, email, role: safeRole, xp: 0, streakDays: 0, enrolledCourses: [] } });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    // Get Firebase Auth user
    let fbUser;
    try { fbUser = await fba.getUserByEmail(email); }
    catch { return res.status(401).json({ error: 'Invalid email or password' }); }

    // Get Firestore profile
    const doc = await db.collection('users').doc(fbUser.uid).get();
    if (!doc.exists) return res.status(401).json({ error: 'User profile not found. Please register.' });

    const profile = doc.data();
    if (!profile.isActive) return res.status(403).json({ error: 'Account deactivated. Contact admin.' });
    if (!profile.passwordHash) return res.status(400).json({ error: 'No password set. Contact admin.' });

    const valid = await bcrypt.compare(password, profile.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    // Update last active & streak
    const now   = new Date();
    const last  = profile.lastActiveAt?.toDate?.() || new Date(0);
    const diffH = (now - last) / 3600000;
    let streak  = profile.streakDays || 0;
    if (diffH >= 20 && diffH < 48) streak++;
    else if (diffH >= 48) streak = 1;

    await db.collection('users').doc(fbUser.uid).update({ lastActiveAt: ts(), streakDays: streak });

    res.json({
      success: true,
      token: signJwt(fbUser.uid),
      user: {
        uid: fbUser.uid, name: profile.name, email: profile.email,
        role: profile.role, xp: profile.xp || 0, streakDays: streak,
        enrolledCourses: profile.enrolledCourses || [],
        badges: profile.badges || [], certificates: profile.certificates || [],
      },
    });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  const { passwordHash, ...safe } = req.user;
  res.json({ success: true, user: safe });
});

module.exports = router;
