// routes/progress.js
const express = require('express');
const { db, ts, inc, arrUnion } = require('../config/firebase');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/user/all', protect, async (req, res, next) => {
  try {
    const snap = await db.collection('progress').where('uid', '==', req.user.uid).get();
    const records = await Promise.all(snap.docs.map(async d => {
      const p = { id: d.id, ...d.data() };
      try {
        const c = await db.collection('courses').doc(p.courseId).get();
        p.course = c.exists ? { id: c.id, title: c.data().title, emoji: c.data().emoji, totalLessons: c.data().totalLessons, instructorName: c.data().instructorName } : { id: p.courseId };
      } catch { p.course = { id: p.courseId }; }
      return p;
    }));
    res.json({ success: true, records });
  } catch (err) { next(err); }
});

router.get('/:courseId', protect, async (req, res, next) => {
  try {
    const doc = await db.collection('progress').doc(`${req.user.uid}_${req.params.courseId}`).get();
    res.json({ success: true, progress: doc.exists ? { id: doc.id, ...doc.data() } : null });
  } catch (err) { next(err); }
});

router.post('/:courseId/complete-lesson', protect, async (req, res, next) => {
  try {
    const { lessonId, watchSeconds } = req.body;
    if (!lessonId) return res.status(400).json({ error: 'lessonId required' });
    const cdoc = await db.collection('courses').doc(req.params.courseId).get();
    if (!cdoc.exists) return res.status(404).json({ error: 'Course not found' });

    const pRef = db.collection('progress').doc(`${req.user.uid}_${req.params.courseId}`);
    const pdoc = await pRef.get();
    if (!pdoc.exists) await pRef.set({ uid: req.user.uid, courseId: req.params.courseId, completedLessons: [], percentComplete: 0, isCompleted: false, lastLessonId: null, watchTime: {}, quizScores: [], createdAt: ts(), updatedAt: ts() });

    const prog = pdoc.exists ? pdoc.data() : { completedLessons: [], watchTime: {} };
    const done = (prog.completedLessons || []).includes(lessonId);
    const upd  = { lastLessonId: lessonId, lastWatchedAt: ts(), updatedAt: ts() };

    if (!done) {
      upd.completedLessons = arrUnion(lessonId);
      const newCount = (prog.completedLessons?.length || 0) + 1;
      upd.percentComplete = Math.min(100, Math.round(newCount / (cdoc.data().totalLessons || 1) * 100));
      await db.collection('users').doc(req.user.uid).update({ xp: inc(20) });
      if (upd.percentComplete >= 100) {
        upd.isCompleted = true; upd.completedAt = ts();
        const udoc = await db.collection('users').doc(req.user.uid).get();
        const hasCert = (udoc.data().certificates || []).some(c => c.courseId === req.params.courseId);
        if (!hasCert) {
          const certId = `JD-${new Date().getFullYear()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
          await db.collection('users').doc(req.user.uid).update({ certificates: arrUnion({ courseId: req.params.courseId, certId, issuedAt: new Date().toISOString() }), xp: inc(500) });
        }
      }
    }
    if (watchSeconds) upd[`watchTime.${lessonId}`] = (prog.watchTime?.[lessonId] || 0) + watchSeconds;
    await pRef.update(upd);
    const final = (await pRef.get()).data();
    res.json({ success: true, percentComplete: final.percentComplete, isCompleted: final.isCompleted, xpEarned: done ? 0 : 20 });
  } catch (err) { next(err); }
});

module.exports = router;
