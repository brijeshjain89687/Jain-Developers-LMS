// routes/announcements.js
const express = require('express');
const { db, timestamp } = require('../config/firebase');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const snap = await db.collection('announcements').where('isActive', '==', true).orderBy('createdAt', 'desc').limit(20).get();
    const announcements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, announcements });
  } catch (err) { next(err); }
});

router.post('/', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    const { title, body, tag } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body required' });
    const data = { title, body, tag: tag || 'info', authorName: req.user.name, isActive: true, createdAt: timestamp() };
    const ref  = await db.collection('announcements').add(data);
    res.status(201).json({ success: true, announcement: { id: ref.id, ...data } });
  } catch (err) { next(err); }
});

router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await db.collection('announcements').doc(req.params.id).update({ isActive: false });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
