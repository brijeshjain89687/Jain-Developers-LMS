// routes/quizzes.js
const express = require('express');
const { db, ts, inc, arrUnion } = require('../config/firebase');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.get('/course/:courseId', protect, async (req, res, next) => {
  try {
    const snap = await db.collection('quizzes').where('courseId', '==', req.params.courseId).where('isActive', '==', true).get();
    const quizzes = snap.docs.map(d => {
      const data = d.data();
      if (req.user.role !== 'admin') data.questions = (data.questions || []).map(({ correct, explanation, ...q }) => q);
      return { id: d.id, ...data };
    });
    res.json({ success: true, quizzes });
  } catch (err) { next(err); }
});

router.post('/:id/submit', protect, async (req, res, next) => {
  try {
    const { answers, courseId } = req.body;
    const doc = await db.collection('quizzes').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Quiz not found' });
    const quiz = doc.data();
    let correct = 0;
    const results = (quiz.questions || []).map((q, i) => {
      const ok = answers[i] === q.correct; if (ok) correct++;
      return { question: q.question, yourAnswer: answers[i], correctAnswer: q.correct, isCorrect: ok, explanation: q.explanation };
    });
    const score = Math.round(correct / quiz.questions.length * 100);
    const passed = score >= (quiz.passMark || 60);
    const xpEarned = passed ? Math.round(score / 10) * 10 : 0;
    if (courseId) {
      const pRef = db.collection('progress').doc(`${req.user.uid}_${courseId}`);
      const pDoc = await pRef.get();
      if (pDoc.exists) await pRef.update({ quizScores: arrUnion({ quizId: req.params.id, score, takenAt: new Date().toISOString() }), updatedAt: ts() });
    }
    if (xpEarned > 0) await db.collection('users').doc(req.user.uid).update({ xp: inc(xpEarned) });
    res.json({ success: true, score, correct, total: quiz.questions.length, passed, xpEarned, results });
  } catch (err) { next(err); }
});

router.post('/', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    const ref = await db.collection('quizzes').add({ ...req.body, isActive: true, createdAt: ts() });
    res.status(201).json({ success: true, quiz: { id: ref.id, ...req.body } });
  } catch (err) { next(err); }
});

router.put('/:id', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    await db.collection('quizzes').doc(req.params.id).update({ ...req.body, updatedAt: ts() });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await db.collection('quizzes').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
