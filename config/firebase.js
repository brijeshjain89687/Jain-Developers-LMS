// config/firebase.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  // Parse private key — handles all Render env var formats
  const raw = process.env.FIREBASE_PRIVATE_KEY || '';
  let privateKey = raw.trim().replace(/^["']|["']$/g, '');
  if (!privateKey.includes('\n') && privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      type:            'service_account',
      project_id:      process.env.FIREBASE_PROJECT_ID,
      private_key_id:  process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key:     privateKey,
      client_email:    process.env.FIREBASE_CLIENT_EMAIL,
      client_id:       process.env.FIREBASE_CLIENT_ID,
      auth_uri:        'https://accounts.google.com/o/oauth2/auth',
      token_uri:       'https://oauth2.googleapis.com/token',
    }),
    databaseURL: 'https://jain-lms-f14cd-default-rtdb.firebaseio.com',
  });

  admin.firestore().settings({ ignoreUndefinedProperties: true });
  console.log('✅ Firebase connected:', process.env.FIREBASE_PROJECT_ID);
}

const db  = admin.firestore();
const fba = admin.auth();

const ts         = ()     => admin.firestore.FieldValue.serverTimestamp();
const arrUnion   = (...i) => admin.firestore.FieldValue.arrayUnion(...i);
const arrRemove  = (...i) => admin.firestore.FieldValue.arrayRemove(...i);
const inc        = (n)    => admin.firestore.FieldValue.increment(n);

module.exports = { db, fba, admin, ts, arrUnion, arrRemove, inc };
