// routes/courses.js
const express = require('express');
const { db, ts, inc, arrUnion } = require('../config/firebase');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/courses
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { category, search, limit = 50 } = req.query;
    let q = db.collection('courses').where('isPublished', '==', true).orderBy('createdAt', 'desc').limit(Number(limit));
    if (category) q = db.collection('courses').where('isPublished', '==', true).where('category', '==', category).orderBy('createdAt', 'desc').limit(Number(limit));
    const snap = await q.get();
    let courses = snap.docs.map(d => { const { sections, ...rest } = d.data(); return { id: d.id, ...rest }; });
    if (search) {
      const s = search.toLowerCase();
      courses = courses.filter(c => c.title?.toLowerCase().includes(s) || c.instructorName?.toLowerCase().includes(s));
    }
    res.json({ success: true, courses });
  } catch (err) { next(err); }
});

// IMPORTANT: specific sub-routes BEFORE /:id to avoid Express matching 'requests' as an id

// GET /api/courses/requests/my
router.get('/requests/my', protect, async (req, res, next) => {
  try {
    const snap = await db.collection('enrollmentRequests').where('uid', '==', req.user.uid).orderBy('requestedAt', 'desc').get();
    res.json({ success: true, requests: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) { next(err); }
});

// GET /api/courses/requests/all  (admin)
router.get('/requests/all', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;
    const snap = status === 'all'
      ? await db.collection('enrollmentRequests').orderBy('requestedAt', 'desc').get()
      : await db.collection('enrollmentRequests').where('status', '==', status).orderBy('requestedAt', 'desc').get();
    res.json({ success: true, requests: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) { next(err); }
});

// POST /api/courses/requests/:rid/approve
router.post('/requests/:rid/approve', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    const rdoc = await db.collection('enrollmentRequests').doc(req.params.rid).get();
    if (!rdoc.exists) return res.status(404).json({ error: 'Request not found' });
    const r = rdoc.data();
    if (r.status !== 'pending') return res.status(400).json({ error: `Already ${r.status}` });

    const batch = db.batch();
    batch.update(db.collection('enrollmentRequests').doc(req.params.rid), { status: 'approved', reviewedAt: ts(), reviewedBy: req.user.uid });
    batch.update(db.collection('users').doc(r.uid), { enrolledCourses: arrUnion(r.courseId), xp: inc(50) });
    batch.update(db.collection('courses').doc(r.courseId), { enrolledCount: inc(1) });
    batch.set(db.collection('progress').doc(`${r.uid}_${r.courseId}`), {
      uid: r.uid, courseId: r.courseId, completedLessons: [], percentComplete: 0,
      isCompleted: false, lastLessonId: null, watchTime: {}, quizScores: [],
      createdAt: ts(), updatedAt: ts(),
    });
    await batch.commit();
    res.json({ success: true, message: `${r.userName} enrolled in ${r.courseTitle}!` });
  } catch (err) { next(err); }
});

// POST /api/courses/requests/:rid/reject
router.post('/requests/:rid/reject', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    const rdoc = await db.collection('enrollmentRequests').doc(req.params.rid).get();
    if (!rdoc.exists) return res.status(404).json({ error: 'Request not found' });
    if (rdoc.data().status !== 'pending') return res.status(400).json({ error: `Already ${rdoc.data().status}` });
    await db.collection('enrollmentRequests').doc(req.params.rid).update({ status: 'rejected', reviewedAt: ts(), reviewedBy: req.user.uid });
    res.json({ success: true, message: 'Request rejected.' });
  } catch (err) { next(err); }
});

// GET /api/courses/:id  — NOW after all /requests/* routes
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const doc = await db.collection('courses').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Course not found' });
    const course = { id: doc.id, ...doc.data() };
    if (!course.isPublished && !['admin','instructor'].includes(req.user?.role)) return res.status(404).json({ error: 'Course not found' });
    const enrolled = req.user ? (req.user.enrolledCourses || []).includes(doc.id) || req.user.role === 'admin' : false;
    // Only give video URLs to enrolled users; non-enrolled get isFree lessons only
    if (course.sections) {
      course.sections = course.sections.map(s => ({
        ...s,
        lessons: (s.lessons || []).map(l => ({
          ...l,
          videoUrl: (enrolled || l.isFree) && l.githubPath
            ? `https://raw.githubusercontent.com/${process.env.GITHUB_OWNER || 'owner'}/${process.env.GITHUB_REPO || 'lms-videos'}/main/${l.githubPath}`
            : null,
        })),
      }));
    }
    res.json({ success: true, course, isEnrolled: enrolled });
  } catch (err) { next(err); }
});

// POST /api/courses/:id/request-enrollment
router.post('/:id/request-enrollment', protect, async (req, res, next) => {
  try {
    if (req.user.role === 'admin') return res.status(400).json({ error: 'Admins are auto-enrolled' });
    const cdoc = await db.collection('courses').doc(req.params.id).get();
    if (!cdoc.exists) return res.status(404).json({ error: 'Course not found' });
    if ((req.user.enrolledCourses || []).includes(req.params.id)) return res.status(400).json({ error: 'Already enrolled' });

    const existing = await db.collection('enrollmentRequests')
      .where('uid', '==', req.user.uid).where('courseId', '==', req.params.id).where('status', '==', 'pending').limit(1).get();
    if (!existing.empty) return res.status(400).json({ error: 'Request already pending' });

    await db.collection('enrollmentRequests').add({
      uid: req.user.uid, userName: req.user.name, userEmail: req.user.email,
      courseId: req.params.id, courseTitle: cdoc.data().title, courseEmoji: cdoc.data().emoji || '📚',
      status: 'pending', requestedAt: ts(), reviewedAt: null, reviewedBy: null,
    });
    res.json({ success: true, message: 'Request sent! Awaiting admin approval.' });
  } catch (err) { next(err); }
});

// POST /api/courses (create)
router.post('/', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    const data = { ...req.body, instructor: req.user.uid, instructorName: req.user.name,
      enrolledCount: 0, totalLessons: (req.body.sections || []).reduce((n, s) => n + (s.lessons?.length || 0), 0),
      createdAt: ts(), updatedAt: ts() };
    const ref = await db.collection('courses').add(data);
    res.status(201).json({ success: true, course: { id: ref.id, ...data } });
  } catch (err) { next(err); }
});

// PUT /api/courses/:id
router.put('/:id', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    const u = { ...req.body, updatedAt: ts() };
    if (u.sections) u.totalLessons = u.sections.reduce((n, s) => n + (s.lessons?.length || 0), 0);
    await db.collection('courses').doc(req.params.id).update(u);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/courses/:id
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await db.collection('courses').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
