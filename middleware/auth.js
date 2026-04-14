// middleware/auth.js
const jwt = require('jsonwebtoken');
const { db, fba } = require('../config/firebase');
const SECRET = process.env.JWT_SECRET || 'jain-lms-2024';

const getUser = async (uid) => {
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) return null;
  return { uid, ...doc.data() };
};

const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  // Try Firebase token first
  try {
    const decoded = await fba.verifyIdToken(token);
    req.user = await getUser(decoded.uid);
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    return next();
  } catch {}

  // Fall back to our JWT
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = await getUser(decoded.uid);
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = await fba.verifyIdToken(token);
    req.user = await getUser(decoded.uid);
  } catch {
    try {
      const decoded = jwt.verify(token, SECRET);
      req.user = await getUser(decoded.uid);
    } catch {}
  }
  next();
};

module.exports = { protect, authorize, optionalAuth };
