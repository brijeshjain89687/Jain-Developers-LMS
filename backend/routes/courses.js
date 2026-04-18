const express = require('express');
const router = express.Router();
const { db, admin } = require('../server');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

// GET /api/courses - list all published courses
router.get('/', optionalAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('courses').where('isPublished', '==', true).limit(50).get();
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: undefined }));
    res.json({ courses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/courses/:id - get single course with sections
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const doc = await db.collection('courses').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Course not found' });
    const course = { id: doc.id, ...doc.data() };

    // Hide video URLs for non-enrolled students (only return free lesson URLs)
    if (!req.user || req.user.role === 'student') {
      // Check enrollment
      const enrollSnap = await db.collection('enrollmentRequests')
        .where('uid', '==', req.user?.uid || '')
        .where('courseId', '==', doc.id)
        .where('status', '==', 'approved')
        .limit(1).get();

      const isEnrolled = !enrollSnap.empty;
      if (!isEnrolled && course.sections) {
        course.sections = course.sections.map(section => ({
          ...section,
          lessons: section.lessons.map(lesson => ({
            ...lesson,
            videoUrl: lesson.isFree ? lesson.videoUrl : undefined,
          })),
        }));
      }
    }

    res.json({ course });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/courses/:id/request-enrollment
router.post('/:id/request-enrollment', authenticate, async (req, res) => {
  try {
    const courseId = req.params.id;
    const uid = req.user.uid;

    // Check if already requested
    const existing = await db.collection('enrollmentRequests')
      .where('uid', '==', uid).where('courseId', '==', courseId).limit(1).get();

    if (!existing.empty) {
      const existing_data = existing.docs[0].data();
      return res.status(400).json({ error: `Already ${existing_data.status}` });
    }

    const courseDoc = await db.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) return res.status(404).json({ error: 'Course not found' });

    const requestRef = db.collection('enrollmentRequests').doc();
    await requestRef.set({
      uid,
      studentName: req.user.name,
      studentEmail: req.user.email,
      courseId,
      courseTitle: courseDoc.data().title,
      status: 'pending',
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedAt: null,
    });

    res.status(201).json({ success: true, requestId: requestRef.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/courses/requests/my - get my enrollment requests
router.get('/requests/my', authenticate, async (req, res) => {
  try {
    const snapshot = await db.collection('enrollmentRequests')
      .where('uid', '==', req.user.uid).get();
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/courses/requests/all - admin: get all requests
router.get('/requests/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.collection('enrollmentRequests');
    if (status) query = query.where('status', '==', status);
    const snapshot = await query.limit(100).get();
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/courses/requests/:id/approve
router.post('/requests/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const requestRef = db.collection('enrollmentRequests').doc(req.params.id);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) return res.status(404).json({ error: 'Request not found' });

    const request = requestDoc.data();

    await db.runTransaction(async (tx) => {
      // Update request status
      tx.update(requestRef, { status: 'approved', reviewedAt: admin.firestore.FieldValue.serverTimestamp() });

      // Create progress document
      const progressRef = db.collection('progress').doc(`${request.uid}_${request.courseId}`);
      tx.set(progressRef, {
        uid: request.uid,
        courseId: request.courseId,
        completedLessons: [],
        percentComplete: 0,
        quizScores: [],
        watchTime: 0,
        isCompleted: false,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Award 50 XP to student
      const userRef = db.collection('users').doc(request.uid);
      tx.update(userRef, {
        xp: admin.firestore.FieldValue.increment(50),
        enrolledCourses: admin.firestore.FieldValue.arrayUnion(request.courseId),
      });
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/courses/requests/:id/reject
router.post('/requests/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.collection('enrollmentRequests').doc(req.params.id).update({
      status: 'rejected',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/courses - create course (admin/instructor)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, emoji, description, category, difficulty, duration, githubFolder, sections, projectTitle, projectDescription, projectDeadlineDays } = req.body;
    if (!title || !category) return res.status(400).json({ error: 'Title and category required' });

    const courseRef = db.collection('courses').doc();
    await courseRef.set({
      title, emoji: emoji || '📚', description, category, difficulty, duration,
      githubFolder, sections: sections || [], projectTitle, projectDescription,
      projectDeadlineDays: projectDeadlineDays || 14,
      instructor: req.user.name,
      enrolledCount: 0,
      isPublished: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: courseRef.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/courses/:id - update course
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.collection('courses').doc(req.params.id).update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/courses/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.collection('courses').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
