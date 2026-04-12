// routes/progress.js
const express = require('express');
const { db, timestamp, arrayUnion, increment } = require('../config/firebase');
const { protect } = require('../middleware/auth');
const router = express.Router();
const pid = (uid, cid) => `${uid}_${cid}`;

router.get('/user/all', protect, async (req, res, next) => {
  try {
    const snap = await db.collection('progress').where('uid','==',req.user.uid).get();
    const records = await Promise.all(snap.docs.map(async d => {
      const p = { id: d.id, ...d.data() };
      const cDoc = await db.collection('courses').doc(p.courseId).get();
      return { ...p, course: cDoc.exists ? { id: cDoc.id, title: cDoc.data().title, emoji: cDoc.data().emoji, totalLessons: cDoc.data().totalLessons, instructorName: cDoc.data().instructorName } : { id: p.courseId } };
    }));
    res.json({ success: true, records });
  } catch (err) { next(err); }
});

router.get('/:courseId', protect, async (req, res, next) => {
  try {
    const doc = await db.collection('progress').doc(pid(req.user.uid, req.params.courseId)).get();
    if (!doc.exists) return res.json({ success: true, progress: null, percentComplete: 0 });
    res.json({ success: true, progress: { id: doc.id, ...doc.data() } });
  } catch (err) { next(err); }
});

router.post('/:courseId/complete-lesson', protect, async (req, res, next) => {
  try {
    const { lessonId, watchSeconds } = req.body;
    if (!lessonId) return res.status(400).json({ error: 'lessonId required' });
    const cDoc = await db.collection('courses').doc(req.params.courseId).get();
    if (!cDoc.exists) return res.status(404).json({ error: 'Course not found' });
    const course = cDoc.data();

    const pRef = db.collection('progress').doc(pid(req.user.uid, req.params.courseId));
    const pDoc = await pRef.get();

    // Use set+merge to safely initialise doc if it does not exist yet
    if (!pDoc.exists) {
      await pRef.set({
        uid: req.user.uid, courseId: req.params.courseId,
        completedLessons: [], percentComplete: 0, isCompleted: false,
        lastLessonId: null, lastWatchedAt: null, watchTime: {}, quizScores: [],
        createdAt: timestamp(), updatedAt: timestamp(),
      }, { merge: true });
    }

    const prog = pDoc.exists ? pDoc.data() : { completedLessons: [], watchTime: {} };
    const alreadyDone = (prog.completedLessons || []).includes(lessonId);
    const updates = { lastLessonId: lessonId, lastWatchedAt: timestamp(), updatedAt: timestamp() };

    if (!alreadyDone) {
      updates.completedLessons = arrayUnion(lessonId);
      // +1 because arrayUnion hasn't been committed yet — we compute from current known count
      const newCount = (prog.completedLessons?.length || 0) + 1;
      const totalLessons = course.totalLessons || 1;
      updates.percentComplete = Math.min(100, Math.round((newCount / totalLessons) * 100));
      await db.collection('users').doc(req.user.uid).update({ xp: increment(20) });

      if (updates.percentComplete >= 100) {
        updates.isCompleted = true;
        updates.completedAt = timestamp();
        const uDoc = await db.collection('users').doc(req.user.uid).get();
        const hasCert = (uDoc.data().certificates || []).some(c => c.courseId === req.params.courseId);
        if (!hasCert) {
          const certId = `JD-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
          await db.collection('users').doc(req.user.uid).update({
            certificates: arrayUnion({ courseId: req.params.courseId, certId, issuedAt: new Date().toISOString() }),
            xp: increment(500),
          });
        }
      }
    }

    if (watchSeconds) {
      updates[`watchTime.${lessonId}`] = (prog.watchTime?.[lessonId] || 0) + Number(watchSeconds);
    }

    await pRef.update(updates);
    const final = (await pRef.get()).data();
    res.json({ success: true, percentComplete: final.percentComplete, isCompleted: final.isCompleted, xpEarned: alreadyDone ? 0 : 20 });
  } catch (err) { next(err); }
});

module.exports = router;
