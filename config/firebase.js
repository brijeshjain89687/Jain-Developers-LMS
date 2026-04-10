// config/firebase.js
// ============================================================
//  Firebase Admin SDK initialisation
//
//  Credentials are loaded ONLY from environment variables.
//  Never commit serviceAccountKey.json to git.
//
//  Required env vars (set in Render Dashboard → Environment):
//    FIREBASE_PROJECT_ID
//    FIREBASE_PRIVATE_KEY_ID
//    FIREBASE_PRIVATE_KEY      ← paste the full key including -----BEGIN/END-----
//    FIREBASE_CLIENT_EMAIL
//    FIREBASE_CLIENT_ID
//    FIREBASE_DATABASE_URL     (optional, has default)
// ============================================================

const admin = require('firebase-admin');

if (!admin.apps.length) {
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID',
  ];

  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length) {
    throw new Error(
      `❌ Missing Firebase environment variables: ${missing.join(', ')}\n` +
      '   Set them in Render Dashboard → Environment (or your .env file locally).'
    );
  }

  const serviceAccount = {
    type:           'service_account',
    project_id:     process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    // Render stores \n as literal \\n — this converts them back to real newlines
    private_key:    process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email:   process.env.FIREBASE_CLIENT_EMAIL,
    client_id:      process.env.FIREBASE_CLIENT_ID,
    auth_uri:       'https://accounts.google.com/o/oauth2/auth',
    token_uri:      'https://oauth2.googleapis.com/token',
  };

  admin.initializeApp({
    credential:  admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL ||
                 'https://jain-lms-f14cd-default-rtdb.firebaseio.com',
  });

  admin.firestore().settings({ ignoreUndefinedProperties: true });
  console.log('✅ Firebase Admin SDK initialised — project:', process.env.FIREBASE_PROJECT_ID);
}

const db   = admin.firestore();
const auth = admin.auth();

const timestamp   = ()     => admin.firestore.FieldValue.serverTimestamp();
const arrayUnion  = (...i) => admin.firestore.FieldValue.arrayUnion(...i);
const arrayRemove = (...i) => admin.firestore.FieldValue.arrayRemove(...i);
const increment   = (n)    => admin.firestore.FieldValue.increment(n);
const docToObj    = (doc)  => doc.exists ? { id: doc.id, ...doc.data() } : null;
const snapToArr   = (snap) => snap.docs.map(docToObj);

module.exports = { db, auth, admin, timestamp, arrayUnion, arrayRemove, increment, docToObj, snapToArr };
