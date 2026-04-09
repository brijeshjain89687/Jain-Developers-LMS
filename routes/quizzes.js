// routes/quizzes.js
const express = require('express');
const { db, timestamp, arrayUnion, increment } = require('../config/firebase');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/quizzes/course/:courseId
router.get('/course/:courseId', protect, async (req, res, next) => {
  try {
    const snap = await db.collection('quizzes')
      .where('courseId', '==', req.params.courseId)
      .where('isActive', '==', true)
      .get();
    const quizzes = snap.docs.map(d => {
      const data = d.data();
      if (req.user.role !== 'admin') {
        data.questions = (data.questions || []).map(({ correct, explanation, ...q }) => q);
      }
      return { id: d.id, ...data };
    });
    res.json({ success: true, quizzes });
  } catch (err) { next(err); }
});

// POST /api/quizzes/:id/submit
router.post('/:id/submit', protect, async (req, res, next) => {
  try {
    const { answers, courseId } = req.body;
    const doc = await db.collection('quizzes').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Quiz not found' });
    const quiz = doc.data();
    let correct = 0;
    const results = (quiz.questions || []).map((q, i) => {
      const ok = answers[i] === q.correct;
      if (ok) correct++;
      return { question: q.question, yourAnswer: answers[i], correctAnswer: q.correct, isCorrect: ok, explanation: q.explanation };
    });
    const score    = Math.round((correct / quiz.questions.length) * 100);
    const passed   = score >= (quiz.passMark || 60);
    const xpEarned = passed ? Math.round(score / 10) * 10 : 0;
    if (courseId) {
      const pRef = db.collection('progress').doc(`${req.user.uid}_${courseId}`);
      const pDoc = await pRef.get();
      if (pDoc.exists) {
        await pRef.update({ quizScores: arrayUnion({ quizId: req.params.id, score, maxScore: 100, takenAt: new Date().toISOString() }), updatedAt: timestamp() });
      }
    }
    if (xpEarned > 0) await db.collection('users').doc(req.user.uid).update({ xp: increment(xpEarned) });
    res.json({ success: true, score, correct, total: quiz.questions.length, passed, xpEarned, results });
  } catch (err) { next(err); }
});

// POST /api/quizzes
router.post('/', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    const data = { ...req.body, isActive: true, createdAt: timestamp() };
    const ref  = await db.collection('quizzes').add(data);
    res.status(201).json({ success: true, quiz: { id: ref.id, ...data } });
  } catch (err) { next(err); }
});

// DELETE /api/quizzes/:id
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await db.collection('quizzes').doc(req.params.id).delete();
    res.json({ success: true, message: 'Quiz deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
