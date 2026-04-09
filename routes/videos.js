// routes/videos.js  — GitHub video management
const express = require('express');
const multer  = require('multer');
const { protect, authorize } = require('../middleware/auth');
const github  = require('../config/github');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// GET /api/videos/index — scan GitHub repo
router.get('/index', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    const videos = await github.buildVideoIndex(req.query.path || '');
    res.json({ success: true, count: videos.length, videos });
  } catch (err) { next(err); }
});

// GET /api/videos/url — get raw URL for a path (checks enrollment)
router.get('/url', protect, async (req, res, next) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'path is required' });
    res.json({ success: true, url: github.getVideoUrl(filePath), path: filePath });
  } catch (err) { next(err); }
});

// POST /api/videos/upload — upload small file (<25MB) via GitHub API
router.post('/upload', protect, authorize('admin', 'instructor'), upload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const { folder, filename } = req.body;
    if (!folder || !filename) return res.status(400).json({ error: 'folder and filename are required' });
    const safeName = filename.replace(/[^a-z0-9._-]/gi, '-').toLowerCase();
    const filePath = `${folder.replace(/\/$/, '')}/${safeName}`;
    const base64   = req.file.buffer.toString('base64');
    const result   = await github.uploadFile(filePath, base64, `Upload via LMS: ${safeName}`);
    res.json({ success: true, message: 'File uploaded to GitHub', file: result });
  } catch (err) { next(err); }
});

// POST /api/videos/sync — scan repo and return all videos
router.post('/sync', protect, authorize('admin'), async (req, res, next) => {
  try {
    const videos = await github.buildVideoIndex();
    res.json({ success: true, message: 'Repo scanned', videoCount: videos.length, videos });
  } catch (err) { next(err); }
});

// PUT /api/videos/assign — link a GitHub path to a course lesson
router.put('/assign', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    const { courseId, sectionIndex, lessonIndex, githubPath } = req.body;
    if (!courseId || sectionIndex == null || lessonIndex == null || !githubPath) {
      return res.status(400).json({ error: 'courseId, sectionIndex, lessonIndex, githubPath all required' });
    }
    const { db } = require('../config/firebase');
    const doc = await db.collection('courses').doc(courseId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Course not found' });
    const course = doc.data();
    if (!course.sections?.[sectionIndex]?.lessons?.[lessonIndex]) {
      return res.status(404).json({ error: 'Lesson not found at given indices' });
    }
    course.sections[sectionIndex].lessons[lessonIndex].githubPath = githubPath;
    await db.collection('courses').doc(courseId).update({ sections: course.sections });
    res.json({ success: true, message: 'Video assigned', githubPath, videoUrl: github.getVideoUrl(githubPath) });
  } catch (err) { next(err); }
});

// DELETE /api/videos — delete a file from GitHub
router.delete('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { path: filePath, sha } = req.body;
    if (!filePath || !sha) return res.status(400).json({ error: 'path and sha required' });
    await github.deleteFile(filePath, sha);
    res.json({ success: true, message: 'File deleted from GitHub' });
  } catch (err) { next(err); }
});

module.exports = router;
