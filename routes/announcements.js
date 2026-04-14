// routes/announcements.js
const express = require('express');
const { db, ts } = require('../config/firebase');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const snap = await db.collection('announcements').where('isActive','==',true).orderBy('createdAt','desc').limit(20).get();
    res.json({ success: true, announcements: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) { next(err); }
});

router.post('/', protect, authorize('admin','instructor'), async (req, res, next) => {
  try {
    const { title, body, tag } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body required' });
    const ref = await db.collection('announcements').add({ title, body, tag: tag||'info', authorName: req.user.name, isActive: true, createdAt: ts() });
    res.status(201).json({ success: true, id: ref.id });
  } catch (err) { next(err); }
});

router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await db.collection('announcements').doc(req.params.id).update({ isActive: false });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
