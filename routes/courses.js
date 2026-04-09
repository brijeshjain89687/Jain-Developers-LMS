// routes/courses.js
const express = require('express');
const { db, timestamp, increment, arrayUnion } = require('../config/firebase');
const { getVideoUrl } = require('../config/github');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const injectVideoUrls = (course, enrolled) => {
  if (!course.sections) return course;
  course.sections = course.sections.map(s => ({
    ...s,
    lessons: (s.lessons || []).map(l => ({
      ...l,
      videoUrl: (enrolled || l.isFree) && l.githubPath ? getVideoUrl(l.githubPath) : null,
    })),
  }));
  return course;
};

// GET /api/courses
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { category, difficulty, search, limit = 20 } = req.query;
    let q = db.collection('courses').where('isPublished', '==', true);
    if (category)   q = q.where('category', '==', category);
    if (difficulty) q = q.where('difficulty', '==', difficulty);
    q = q.orderBy('createdAt', 'desc').limit(Number(limit));
    const snap = await q.get();
    let courses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (search) {
      const s = search.toLowerCase();
      courses = courses.filter(c => c.title?.toLowerCase().includes(s) || c.instructorName?.toLowerCase().includes(s) || (c.tags||[]).some(t=>t.toLowerCase().includes(s)));
    }
    const listing = courses.map(({ sections, ...rest }) => rest);
    res.json({ success: true, total: listing.length, courses: listing });
  } catch (err) { next(err); }
});

// GET /api/courses/:id
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const doc = await db.collection('courses').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Course not found' });
    const course = { id: doc.id, ...doc.data() };
    if (!course.isPublished && !['admin','instructor'].includes(req.user?.role)) {
      return res.status(404).json({ error: 'Course not found' });
    }
    const enrolled = req.user
      ? (req.user.enrolledCourses||[]).includes(doc.id) || req.user.role === 'admin'
      : false;
    res.json({ success: true, course: injectVideoUrls(course, enrolled), isEnrolled: enrolled });
  } catch (err) { next(err); }
});

// POST /api/courses/:id/enroll
router.post('/:id/enroll', protect, async (req, res, next) => {
  try {
    const courseDoc = await db.collection('courses').doc(req.params.id).get();
    if (!courseDoc.exists) return res.status(404).json({ error: 'Course not found' });
    if ((req.user.enrolledCourses||[]).includes(req.params.id)) return res.status(400).json({ error: 'Already enrolled' });

    const batch = db.batch();
    batch.update(db.collection('users').doc(req.user.uid), { enrolledCourses: arrayUnion(req.params.id), xp: (req.user.xp||0) + 50 });
    batch.update(db.collection('courses').doc(req.params.id), { enrolledCount: increment(1) });
    batch.set(db.collection('progress').doc(`${req.user.uid}_${req.params.id}`), {
      uid: req.user.uid, courseId: req.params.id, completedLessons: [], percentComplete: 0,
      isCompleted: false, lastLessonId: null, lastWatchedAt: null, watchTime: {}, quizScores: [],
      createdAt: timestamp(), updatedAt: timestamp(),
    });
    await batch.commit();
    res.json({ success: true, message: `Enrolled in ${courseDoc.data().title}!`, xpEarned: 50 });
  } catch (err) { next(err); }
});

// POST /api/courses
router.post('/', protect, authorize('admin','instructor'), async (req, res, next) => {
  try {
    const data = { ...req.body, instructor: req.user.uid, instructorName: req.user.name,
      enrolledCount: 0, totalLessons: (req.body.sections||[]).reduce((n,s)=>n+(s.lessons?.length||0),0),
      createdAt: timestamp(), updatedAt: timestamp() };
    const ref = await db.collection('courses').add(data);
    res.status(201).json({ success: true, course: { id: ref.id, ...data } });
  } catch (err) { next(err); }
});

// PUT /api/courses/:id
router.put('/:id', protect, authorize('admin','instructor'), async (req, res, next) => {
  try {
    const updates = { ...req.body, updatedAt: timestamp() };
    if (updates.sections) updates.totalLessons = updates.sections.reduce((n,s)=>n+(s.lessons?.length||0),0);
    await db.collection('courses').doc(req.params.id).update(updates);
    res.json({ success: true, message: 'Course updated' });
  } catch (err) { next(err); }
});

// DELETE /api/courses/:id
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await db.collection('courses').doc(req.params.id).delete();
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
