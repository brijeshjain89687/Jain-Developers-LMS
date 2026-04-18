const express = require('express');
const router = express.Router();
const { db, admin } = require('../server');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/announcements
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('announcements')
      .where('isActive', '==', true).limit(20).get();
    const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/announcements
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, body, tag } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body required' });
    if (!['Info', 'Urgent', 'Event'].includes(tag)) return res.status(400).json({ error: 'tag must be Info, Urgent, or Event' });

    const ref = db.collection('announcements').doc();
    await ref.set({
      title, body, tag: tag || 'Info',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: ref.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.collection('announcements').doc(req.params.id).update({ isActive: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
