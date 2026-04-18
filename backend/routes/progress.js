const express = require('express');
const router = express.Router();
const { db, admin } = require('../server');
const { authenticate } = require('../middleware/auth');

// GET /api/progress/user/all
router.get('/user/all', authenticate, async (req, res) => {
  try {
    const snapshot = await db.collection('progress').where('uid', '==', req.user.uid).get();
    const progress = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/progress/:courseId/complete-lesson
router.post('/:courseId/complete-lesson', authenticate, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonId } = req.body;
    if (!lessonId) return res.status(400).json({ error: 'lessonId required' });

    const uid = req.user.uid;
    const progressRef = db.collection('progress').doc(`${uid}_${courseId}`);
    const progressDoc = await progressRef.get();

    if (!progressDoc.exists) return res.status(403).json({ error: 'Not enrolled in this course' });

    const progress = progressDoc.data();
    if (progress.completedLessons.includes(lessonId)) {
      return res.json({ success: true, alreadyCompleted: true, xpEarned: 0 });
    }

    // Get course to calculate percentage
    const courseDoc = await db.collection('courses').doc(courseId).get();
    const course = courseDoc.data();
    const totalLessons = course.sections.reduce((a, s) => a + s.lessons.length, 0);
    const newCompleted = [...progress.completedLessons, lessonId];
    const percentComplete = Math.round((newCompleted.length / totalLessons) * 100);
    const isCompleted = percentComplete === 100;

    await db.runTransaction(async (tx) => {
      tx.update(progressRef, {
        completedLessons: admin.firestore.FieldValue.arrayUnion(lessonId),
        percentComplete,
        isCompleted,
        lastAccessedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // +20 XP for lesson, +500 XP + certificate for course completion
      const xpEarned = isCompleted ? 520 : 20;
      const userUpdate = { xp: admin.firestore.FieldValue.increment(xpEarned) };

      if (isCompleted) {
        userUpdate.certificates = admin.firestore.FieldValue.arrayUnion({
          courseId,
          courseTitle: course.title,
          issuedAt: new Date().toISOString(),
        });
      }

      tx.update(db.collection('users').doc(uid), userUpdate);
    });

    res.json({ success: true, percentComplete, isCompleted, xpEarned: isCompleted ? 520 : 20 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
