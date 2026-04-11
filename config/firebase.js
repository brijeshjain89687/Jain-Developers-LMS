// config/firebase.js
// ============================================================
//  Firebase Admin SDK — robust private key handling
//
//  The FIREBASE_PRIVATE_KEY env var can arrive in two formats
//  depending on how Render stores it:
//    A) With real newlines  (paste direct into Render UI)
//    B) With \n literals    (some tools escape them)
//
//  This code handles BOTH formats automatically.
//
//  Render Environment Variables to set:
//  ─────────────────────────────────────
//  FIREBASE_PROJECT_ID     = jain-lms-f14cd
//  FIREBASE_PRIVATE_KEY_ID = 7f6ade1d1b51b3152780797ec2081729c96a2758
//  FIREBASE_CLIENT_EMAIL   = firebase-adminsdk-fbsvc@jain-lms-f14cd.iam.gserviceaccount.com
//  FIREBASE_CLIENT_ID      = 101739915886213945364
//  FIREBASE_PRIVATE_KEY    = (paste full key — see README for exact value)
//  FIREBASE_DATABASE_URL   = https://jain-lms-f14cd-default-rtdb.firebaseio.com
// ============================================================

const admin = require('firebase-admin');

const parsePrivateKey = (raw) => {
  if (!raw) throw new Error('FIREBASE_PRIVATE_KEY is empty');

  // Strip surrounding quotes if present (some .env parsers add them)
  let key = raw.trim().replace(/^["']|["']$/g, '');

  // If key already has real newlines — use as-is
  if (key.includes('\n')) return key;

  // If key has literal \n strings — convert to real newlines
  if (key.includes('\\n')) return key.replace(/\\n/g, '\n');

  // If key has no newlines at all — it's broken; try to reconstruct
  // by inserting newlines after the header/footer and every 64 chars
  console.warn('⚠️  FIREBASE_PRIVATE_KEY has no newlines — attempting reconstruction');
  const header = '-----BEGIN PRIVATE KEY-----';
  const footer = '-----END PRIVATE KEY-----';
  if (key.includes(header)) {
    const body = key.replace(header, '').replace(footer, '').replace(/\s/g, '');
    const lines = body.match(/.{1,64}/g) || [];
    return `${header}\n${lines.join('\n')}\n${footer}\n`;
  }
  return key;
};

if (!admin.apps.length) {
  const missing = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID',
  ].filter(v => !process.env[v]);

  if (missing.length) {
    throw new Error(
      `❌ Missing Firebase env vars: ${missing.join(', ')}\n` +
      `   Add them in Render Dashboard → your service → Environment tab.`
    );
  }

  const privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  // Log key info for debugging (never log the actual key)
  console.log('🔑 Private key lines:', privateKey.split('\n').length);
  console.log('🔑 Key starts with:  ', privateKey.substring(0, 40));

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
    databaseURL: process.env.FIREBASE_DATABASE_URL ||
                 'https://jain-lms-f14cd-default-rtdb.firebaseio.com',
  });

  admin.firestore().settings({ ignoreUndefinedProperties: true });
  console.log('✅ Firebase connected — project:', process.env.FIREBASE_PROJECT_ID);
}

const db   = admin.firestore();
const auth = admin.auth();

const timestamp   = ()     => admin.firestore.FieldValue.serverTimestamp();
const arrayUnion  = (...i) => admin.firestore.FieldValue.arrayUnion(...i);
const arrayRemove = (...i) => admin.firestore.FieldValue.arrayRemove(...i);
const increment   = (n)    => admin.firestore.FieldValue.increment(n);
const docToObj    = (doc)  => doc.exists ? { id: doc.id, ...doc.data() } : null;
const snapToArr   = (snap) => snap.docs.map(docToObj);

module.exports = {
  db, auth, admin,
  timestamp, arrayUnion, arrayRemove, increment,
  docToObj, snapToArr
};
