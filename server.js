// ============================================================
//  JAIN DEVELOPERS LMS  —  server.js
//  Firebase Firestore + GitHub Videos + Render.com
// ============================================================
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const path      = require('path');
const rateLimit = require('express-rate-limit');

// ── Firebase init (loads serviceAccountKey.json) ─────────────
require('./config/firebase');

// ── Keep-alive for Render free tier ──────────────────────────
require('./config/keepAlive')();

// ── Routes ───────────────────────────────────────────────────
const authRoutes         = require('./routes/auth');
const courseRoutes       = require('./routes/courses');
const videoRoutes        = require('./routes/videos');
const userRoutes         = require('./routes/users');
const progressRoutes     = require('./routes/progress');
const quizRoutes         = require('./routes/quizzes');
const announcementRoutes = require('./routes/announcements');

const app = express();

// Trust Render's reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));

// Open CORS — no custom domain, allow everything
const corsOpts = { origin: '*', methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] };
app.use(cors(corsOpts));
app.options('*', cors(corsOpts));

// Rate limiting
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/', rateLimit({ windowMs: 15*60*1000, max: 30, standardHeaders: true, legacyHeaders: false }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  message: 'Jain Developers LMS API',
  db: 'firestore',
  project: 'jain-lms-f14cd',
  version: '2.0.0',
  env: process.env.NODE_ENV || 'development',
  render: !!process.env.RENDER,
  timestamp: new Date().toISOString(),
}));

// ── API routes ────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/courses',       courseRoutes);
app.use('/api/videos',        videoRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/progress',      progressRoutes);
app.use('/api/quizzes',       quizRoutes);
app.use('/api/announcements', announcementRoutes);

// ── Serve static frontend from /public ───────────────────────
const PUBLIC = path.join(__dirname, 'public');
app.use(express.static(PUBLIC));

// Named page routes — visit these URLs in your browser:
//   /           → Landing page
//   /student    → Student learning platform
//   /admin      → Admin panel
//   /dashboard  → Original dashboard
app.get('/',          (req, res) => res.sendFile(path.join(PUBLIC, 'landing.html')));
app.get('/student',   (req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));
app.get('/admin',     (req, res) => res.sendFile(path.join(PUBLIC, 'admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(PUBLIC, 'dashboard.html')));

// 404 for unknown API routes
app.use('/api/*', (req, res) => res.status(404).json({ error: `Route ${req.originalUrl} not found` }));

// 404 page fallback
app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC, '404.html')));

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌', err.message);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ── Start — 0.0.0.0 required on Render ───────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 Jain Developers LMS (Firebase)
   Landing  : http://localhost:${PORT}/
   Student  : http://localhost:${PORT}/student
   Admin    : http://localhost:${PORT}/admin
   Health   : http://localhost:${PORT}/api/health
   DB       : Firestore (jain-lms-f14cd)
   Render   : ${!!process.env.RENDER}
  `);
});

module.exports = app;
