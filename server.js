require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const path      = require('path');
const rateLimit = require('express-rate-limit');

require('./config/firebase');
require('./config/keepAlive')();

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.options('*', cors());
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 500, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/', rateLimit({ windowMs: 15*60*1000, max: 50, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

app.get('/api/health', (req, res) => res.json({
  status: 'ok', db: 'firestore', project: 'jain-lms-f14cd',
  version: '3.0.0', render: !!process.env.RENDER, ts: new Date().toISOString()
}));

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/courses',       require('./routes/courses'));
app.use('/api/progress',      require('./routes/progress'));
app.use('/api/quizzes',       require('./routes/quizzes'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/seed',          require('./routes/seed'));

// Serve static files with explicit UTF-8 charset
const PUBLIC = path.join(__dirname, 'public');
app.use(express.static(PUBLIC, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  }
}));

// Named page routes — also set charset explicitly
const sendHTML = (file) => (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(PUBLIC, file));
};

app.get('/',        sendHTML('landing.html'));
app.get('/student', sendHTML('student.html'));
app.get('/admin',   sendHTML('admin.html'));

app.use('/api/*', (req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(404).sendFile(path.join(PUBLIC, '404.html'));
});
app.use((err, req, res, next) => {
  console.error('ERR:', err.message);
  res.status(err.statusCode || 500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () =>
  console.log('Jain LMS :' + PORT + ' | /student | /admin | /api/health')
);
module.exports = app;
