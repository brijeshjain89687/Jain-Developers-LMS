// config/firebase.js
// ============================================================
//  Firebase Admin SDK initialisation
//
//  LOADING STRATEGY (tries in order):
//  1. serviceAccountKey.json file in this directory (bundled with deploy)
//  2. Individual FIREBASE_* environment variables (Render dashboard)
//
//  The JSON file approach is preferred — it's already included.
//  If Firestore keeps returning UNAUTHENTICATED, fall back to
//  setting environment variables on Render as described in README.
// ============================================================

const admin = require('firebase-admin');

if (!admin.apps.length) {
  let credential;

  try {
    // ── Method 1: Load from bundled JSON file ─────────────────
    const serviceAccount = require('./serviceAccountKey.json');
    credential = admin.credential.cert(serviceAccount);
    console.log('🔑 Firebase: loaded credentials from serviceAccountKey.json');
  } catch (fileErr) {
    // ── Method 2: Load from individual env vars ───────────────
    // Set these in Render Dashboard → Environment if Method 1 fails
    if (!process.env.FIREBASE_PROJECT_ID) {
      throw new Error(
        '❌ Firebase credentials not found!\n' +
        '   Option A: ensure config/serviceAccountKey.json is committed to git\n' +
        '   Option B: set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL in Render env vars'
      );
    }
    const serviceAccount = {
      type:          'service_account',
      project_id:    process.env.FIREBASE_PROJECT_ID,
      private_key_id:process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key:   (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      client_email:  process.env.FIREBASE_CLIENT_EMAIL,
      client_id:     process.env.FIREBASE_CLIENT_ID,
    };
    credential = admin.credential.cert(serviceAccount);
    console.log('🔑 Firebase: loaded credentials from environment variables');
  }

  admin.initializeApp({
    credential,
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://jain-lms-f14cd-default-rtdb.firebaseio.com',
  });

  // Firestore settings
  admin.firestore().settings({ ignoreUndefinedProperties: true });
  console.log('✅ Firebase Admin SDK initialised — project: jain-lms-f14cd');
}

const db   = admin.firestore();
const auth = admin.auth();

const timestamp   = ()        => admin.firestore.FieldValue.serverTimestamp();
const arrayUnion  = (...i)    => admin.firestore.FieldValue.arrayUnion(...i);
const arrayRemove = (...i)    => admin.firestore.FieldValue.arrayRemove(...i);
const increment   = (n)       => admin.firestore.FieldValue.increment(n);
const docToObj    = (doc)     => doc.exists ? { id: doc.id, ...doc.data() } : null;
const snapToArr   = (snap)    => snap.docs.map(docToObj);

module.exports = { db, auth, admin, timestamp, arrayUnion, arrayRemove, increment, docToObj, snapToArr };
