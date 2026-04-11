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

// ── GET /api/courses/requests/my ──────────────────────────────
// Student: get their own pending/approved/rejected requests
// NOTE: must be defined BEFORE /:id or Express will match 'requests' as an id
router.get('/requests/my', protect, async (req, res, next) => {
  try {
    const snap = await db.collection('enrollmentRequests')
      .where('uid', '==', req.user.uid)
      .orderBy('requestedAt', 'desc')
      .get();
    const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, requests });
  } catch (err) { next(err); }
});

// ── GET /api/courses/requests/all ─────────────────────────────
// Admin: get ALL enrollment requests
// NOTE: must be defined BEFORE /:id
router.get('/requests/all', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;
    let q = db.collection('enrollmentRequests').orderBy('requestedAt', 'desc');
    if (status !== 'all') q = db.collection('enrollmentRequests').where('status', '==', status).orderBy('requestedAt', 'desc');
    const snap = await q.get();
    const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, requests });
  } catch (err) { next(err); }
});

// GET /api/courses — public listing
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
      courses = courses.filter(c =>
        c.title?.toLowerCase().includes(s) ||
        c.instructorName?.toLowerCase().includes(s) ||
        (c.tags||[]).some(t => t.toLowerCase().includes(s))
      );
    }
    const listing = courses.map(({ sections, ...rest }) => rest);
    res.json({ success: true, total: listing.length, courses: listing });
  } catch (err) { next(err); }
});

// GET /api/courses/:id — single course
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

// ── POST /api/courses/:id/request-enrollment ──────────────────
// Student sends an enrollment request — admin must approve it.
// Creates a document in the 'enrollmentRequests' collection.
router.post('/:id/request-enrollment', protect, async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(400).json({ error: 'Admins do not need to request enrollment.' });
    }

    const courseDoc = await db.collection('courses').doc(req.params.id).get();
    if (!courseDoc.exists) return res.status(404).json({ error: 'Course not found' });

    // Check already enrolled
    if ((req.user.enrolledCourses||[]).includes(req.params.id)) {
      return res.status(400).json({ error: 'Already enrolled in this course.' });
    }

    // Check if request already pending
    const existing = await db.collection('enrollmentRequests')
      .where('uid', '==', req.user.uid)
      .where('courseId', '==', req.params.id)
      .where('status', '==', 'pending')
      .limit(1).get();

    if (!existing.empty) {
      return res.status(400).json({ error: 'Enrollment request already pending. Please wait for admin approval.' });
    }

    // Create request document
    await db.collection('enrollmentRequests').add({
      uid:          req.user.uid,
      userName:     req.user.name,
      userEmail:    req.user.email,
      courseId:     req.params.id,
      courseTitle:  courseDoc.data().title,
      courseEmoji:  courseDoc.data().emoji || '📚',
      status:       'pending',     // pending | approved | rejected
      requestedAt:  timestamp(),
      reviewedAt:   null,
      reviewedBy:   null,
    });

    res.json({
      success: true,
      message: 'Enrollment request sent! You will be enrolled once an admin approves it.',
    });
  } catch (err) { next(err); }
});


// ── POST /api/courses/requests/:requestId/approve ─────────────
// Admin: approve an enrollment request → actually enrolls the student
router.post('/requests/:requestId/approve', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    const reqDoc = await db.collection('enrollmentRequests').doc(req.params.requestId).get();
    if (!reqDoc.exists) return res.status(404).json({ error: 'Request not found' });
    const request = reqDoc.data();
    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request already ${request.status}` });
    }

    const batch = db.batch();

    // Update request status
    batch.update(db.collection('enrollmentRequests').doc(req.params.requestId), {
      status:     'approved',
      reviewedAt: timestamp(),
      reviewedBy: req.user.uid,
    });

    // Enroll the student
    batch.update(db.collection('users').doc(request.uid), {
      enrolledCourses: arrayUnion(request.courseId),
      xp: increment(50),
    });

    // Increment course enrolled count
    batch.update(db.collection('courses').doc(request.courseId), {
      enrolledCount: increment(1),
    });

    // Create progress document
    batch.set(db.collection('progress').doc(`${request.uid}_${request.courseId}`), {
      uid: request.uid, courseId: request.courseId,
      completedLessons: [], percentComplete: 0,
      isCompleted: false, lastLessonId: null, lastWatchedAt: null,
      watchTime: {}, quizScores: [],
      createdAt: timestamp(), updatedAt: timestamp(),
    });

    await batch.commit();

    res.json({
      success: true,
      message: `${request.userName} has been enrolled in ${request.courseTitle}!`,
    });
  } catch (err) { next(err); }
});

// ── POST /api/courses/requests/:requestId/reject ──────────────
// Admin: reject an enrollment request
router.post('/requests/:requestId/reject', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    const reqDoc = await db.collection('enrollmentRequests').doc(req.params.requestId).get();
    if (!reqDoc.exists) return res.status(404).json({ error: 'Request not found' });
    if (reqDoc.data().status !== 'pending') {
      return res.status(400).json({ error: `Request already ${reqDoc.data().status}` });
    }
    await db.collection('enrollmentRequests').doc(req.params.requestId).update({
      status:     'rejected',
      reviewedAt: timestamp(),
      reviewedBy: req.user.uid,
    });
    res.json({ success: true, message: 'Request rejected.' });
  } catch (err) { next(err); }
});

// ── POST /api/courses/:id/enroll (Admin only direct enroll) ───
// Admin can directly enroll a student without a request
router.post('/:id/enroll', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const courseDoc = await db.collection('courses').doc(req.params.id).get();
    if (!courseDoc.exists) return res.status(404).json({ error: 'Course not found' });

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    if ((userDoc.data().enrolledCourses||[]).includes(req.params.id)) {
      return res.status(400).json({ error: 'User already enrolled' });
    }

    const batch = db.batch();
    batch.update(db.collection('users').doc(userId), {
      enrolledCourses: arrayUnion(req.params.id),
      xp: increment(50),
    });
    batch.update(db.collection('courses').doc(req.params.id), { enrolledCount: increment(1) });
    batch.set(db.collection('progress').doc(`${userId}_${req.params.id}`), {
      uid: userId, courseId: req.params.id,
      completedLessons: [], percentComplete: 0, isCompleted: false,
      lastLessonId: null, lastWatchedAt: null, watchTime: {}, quizScores: [],
      createdAt: timestamp(), updatedAt: timestamp(),
    });
    await batch.commit();

    res.json({ success: true, message: `User enrolled in ${courseDoc.data().title}!` });
  } catch (err) { next(err); }
});

// POST /api/courses — create
router.post('/', protect, authorize('admin','instructor'), async (req, res, next) => {
  try {
    const data = { ...req.body, instructor: req.user.uid, instructorName: req.user.name,
      enrolledCount: 0, totalLessons: (req.body.sections||[]).reduce((n,s)=>n+(s.lessons?.length||0),0),
      createdAt: timestamp(), updatedAt: timestamp() };
    const ref = await db.collection('courses').add(data);
    res.status(201).json({ success: true, course: { id: ref.id, ...data } });
  } catch (err) { next(err); }
});

// PUT /api/courses/:id — update
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
