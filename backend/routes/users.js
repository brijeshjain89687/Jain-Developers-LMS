const express = require('express');
const router = express.Router();
const { db, admin } = require('../server');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/users - list all students (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('users').where('role', '==', 'student').limit(100).get();
    const users = snapshot.docs.map(doc => {
      const { passwordHash, ...user } = doc.data();
      return { id: doc.id, ...user };
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
