// routes/users.js
const express = require('express');
const { db, ts } = require('../config/firebase');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.get('/leaderboard', protect, async (req, res, next) => {
  try {
    const snap = await db.collection('users').where('role','==','student').where('isActive','==',true).orderBy('xp','desc').limit(10).get();
    res.json({ success: true, leaders: snap.docs.map(d => { const { passwordHash, ...s } = d.data(); return { id: d.id, ...s }; }) });
  } catch (err) { next(err); }
});

router.get('/profile', protect, (req, res) => {
  const { passwordHash, ...safe } = req.user;
  res.json({ success: true, user: safe });
});

router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { role, limit = 100 } = req.query;
    let q = db.collection('users').orderBy('createdAt','desc').limit(Number(limit));
    if (role) q = db.collection('users').where('role','==',role).limit(Number(limit));
    const snap = await q.get();
    res.json({ success: true, users: snap.docs.map(d => { const { passwordHash, ...s } = d.data(); return { id: d.id, ...s }; }) });
  } catch (err) { next(err); }
});

router.patch('/:id/deactivate', protect, authorize('admin'), async (req, res, next) => {
  try {
    await db.collection('users').doc(req.params.id).update({ isActive: false });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
