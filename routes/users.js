// routes/users.js
const express = require('express');
const { db, timestamp } = require('../config/firebase');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.get('/leaderboard', protect, async (req, res, next) => {
  try {
    const snap = await db.collection('users').where('role','==','student').where('isActive','==',true).orderBy('xp','desc').limit(10).get();
    const leaders = snap.docs.map(d => { const { passwordHash, ...s } = d.data(); return { id: d.id, ...s }; });
    res.json({ success: true, leaders });
  } catch (err) { next(err); }
});

router.get('/profile', protect, (req, res) => {
  const { passwordHash, ...safe } = req.user;
  res.json({ success: true, user: safe });
});

router.put('/profile', protect, async (req, res, next) => {
  try {
    const allowed = ['name','avatar'];
    const updates = {}; allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updatedAt = timestamp();
    await db.collection('users').doc(req.user.uid).update(updates);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) { next(err); }
});

router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { role, limit = 50 } = req.query;
    let q = db.collection('users').orderBy('createdAt','desc').limit(Number(limit));
    if (role) q = db.collection('users').where('role','==',role).orderBy('createdAt','desc').limit(Number(limit));
    const snap = await q.get();
    const users = snap.docs.map(d => { const { passwordHash, ...s } = d.data(); return { id: d.id, ...s }; });
    res.json({ success: true, total: users.length, users });
  } catch (err) { next(err); }
});

router.patch('/:id/deactivate', protect, authorize('admin'), async (req, res, next) => {
  try {
    await db.collection('users').doc(req.params.id).update({ isActive: false, updatedAt: timestamp() });
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;
