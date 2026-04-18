const express = require('express');
const router = express.Router();
const { db, admin } = require('../server');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/quizzes/course/:courseId
router.get('/course/:courseId', authenticate, async (req, res) => {
  try {
    const snapshot = await db.collection('quizzes')
      .where('courseId', '==', req.params.courseId).get();

    // Strip correct answers for students
    const quizzes = snapshot.docs.map(doc => {
      const data = doc.data();
      const questions = data.questions.map(({ correctAnswer, explanation, ...rest }) => rest);
      return { id: doc.id, ...data, questions };
    });

    res.json({ quizzes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quizzes/:id/submit
router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const { answers } = req.body; // array of selected option indices
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers array required' });

    const quizDoc = await db.collection('quizzes').doc(req.params.id).get();
    if (!quizDoc.exists) return res.status(404).json({ error: 'Quiz not found' });

    const quiz = quizDoc.data();
    let correct = 0;
    const results = quiz.questions.map((q, i) => {
      const isCorrect = answers[i] === q.correctAnswer;
      if (isCorrect) correct++;
      return { isCorrect, correctAnswer: q.correctAnswer, explanation: q.explanation };
    });

    const score = Math.round((correct / quiz.questions.length) * 100);
    const passed = score >= quiz.passMark;
    const xpEarned = passed ? Math.max(10, Math.round(score)) : 0;

    // Save quiz score
    await db.collection('progress').doc(`${req.user.uid}_${quiz.courseId}`).update({
      quizScores: admin.firestore.FieldValue.arrayUnion({
        quizId: req.params.id,
        score,
        passed,
        submittedAt: new Date().toISOString(),
      }),
    }).catch(() => {}); // ignore if no progress doc yet

    // Award XP
    if (xpEarned > 0) {
      await db.collection('users').doc(req.user.uid).update({
        xp: admin.firestore.FieldValue.increment(xpEarned),
      });
    }

    res.json({ score, passed, correct, total: quiz.questions.length, xpEarned, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quizzes - create quiz (admin/instructor)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, courseId, timeLimit, passMark, questions } = req.body;
    if (!title || !courseId || !questions?.length) {
      return res.status(400).json({ error: 'title, courseId, and questions required' });
    }
    // Validate all questions
    for (const q of questions) {
      if (!q.question || !q.options || q.options.length !== 4 || q.correctAnswer === undefined) {
        return res.status(400).json({ error: 'Each question needs question, 4 options, and correctAnswer' });
      }
    }

    const quizRef = db.collection('quizzes').doc();
    await quizRef.set({
      title, courseId, timeLimit: timeLimit || 600,
      passMark: passMark || 70, questions,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: quizRef.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
