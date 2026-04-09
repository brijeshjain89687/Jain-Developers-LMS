// config/firebase.js
// ============================================================
//  Firebase Admin SDK — initialised from serviceAccountKey.json
//  This file loads the real credentials from the JSON file.
//  The JSON file is already in config/ — no .env setup needed
//  for Firebase itself.
//
//  On Render: the serviceAccountKey.json is bundled with your
//  deployment (it's inside the zip you push to GitHub).
//  If you ever rotate your key, replace serviceAccountKey.json
//  and redeploy.
// ============================================================

const admin = require('firebase-admin');
const path  = require('path');

if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');

  admin.initializeApp({
    credential:  admin.credential.cert(serviceAccount),
    // Realtime Database URL — needed if you use RTDB (we use Firestore, but keep for completeness)
    databaseURL: 'https://jain-lms-f14cd-default-rtdb.firebaseio.com',
  });

  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });

  console.log(`✅ Firebase connected — project: jain-lms-f14cd`);
}

const db   = admin.firestore();
const auth = admin.auth();

// ── Helpers ───────────────────────────────────────────────────

/** Convert a Firestore doc snapshot to a plain JS object with its id field */
const docToObj = (doc) => {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

/** Convert a Firestore query snapshot to an array of plain objects */
const snapToArr = (snap) => snap.docs.map(docToObj);

/** Firestore server timestamp */
const timestamp = () => admin.firestore.FieldValue.serverTimestamp();

/** Firestore array union helper */
const arrayUnion = (...items) => admin.firestore.FieldValue.arrayUnion(...items);

/** Firestore array remove helper */
const arrayRemove = (...items) => admin.firestore.FieldValue.arrayRemove(...items);

/** Firestore numeric increment helper */
const increment = (n) => admin.firestore.FieldValue.increment(n);

module.exports = { db, auth, admin, docToObj, snapToArr, timestamp, arrayUnion, arrayRemove, increment };
