// middleware/auth.js — Firebase ID token + JWT fallback verification

const { auth, db } = require('../config/firebase');
const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ error: 'Not authenticated. Please log in.' });

  // Try Firebase ID token first
  try {
    const decoded = await auth.verifyIdToken(token);
    const doc = await db.collection('users').doc(decoded.uid).get();
    if (!doc.exists) return res.status(401).json({ error: 'User profile not found.' });
    req.user = { uid: decoded.uid, ...doc.data() };
    return next();
  } catch {}

  // Fallback: our own JWT (admin panel manual login)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jain-lms-secret-key-2024');
    const doc = await db.collection('users').doc(decoded.uid).get();
    if (!doc.exists) return res.status(401).json({ error: 'User not found.' });
    req.user = { uid: decoded.uid, ...doc.data() };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: `Access denied. Required: ${roles.join(' or ')}` });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token) {
    try {
      const decoded = await auth.verifyIdToken(token);
      const doc = await db.collection('users').doc(decoded.uid).get();
      if (doc.exists) req.user = { uid: decoded.uid, ...doc.data() };
    } catch {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jain-lms-secret-key-2024');
        const doc = await db.collection('users').doc(decoded.uid).get();
        if (doc.exists) req.user = { uid: decoded.uid, ...doc.data() };
      } catch {}
    }
  }
  next();
};

module.exports = { protect, authorize, optionalAuth };
