// config/firebase.js
// ============================================================
//  Firebase Admin SDK — environment variables only
//
//  Set these in Render Dashboard → Environment:
//
//  FIREBASE_PROJECT_ID      = jain-lms-f14cd
//  FIREBASE_PRIVATE_KEY_ID  = (your key id)
//  FIREBASE_CLIENT_EMAIL    = firebase-adminsdk-fbsvc@jain-lms-f14cd.iam.gserviceaccount.com
//  FIREBASE_CLIENT_ID       = (your client id)
//  FIREBASE_PRIVATE_KEY     = (paste the ENTIRE private key block as-is)
// ============================================================

const admin = require('firebase-admin');

/**
 * Robustly parse the private key from the environment variable.
 * Render and other platforms may store the key with:
 *   - literal \n  (most common)
 *   - actual newlines (if pasted raw)
 *   - escaped \\n
 * This handles all three cases.
 */
function parsePrivateKey(raw) {
  if (!raw) return raw;

  // Already has real newlines — return as-is
  if (raw.includes('\n')) return raw;

  // Has literal \n (most common from Render) — replace them
  if (raw.includes('\\n')) return raw.replace(/\\n/g, '\n');

  // Compact key with no newlines at all — insert them at standard RSA positions
  // Split on the header/footer and reformat
  const match = raw.match(/-----BEGIN PRIVATE KEY-----(.+?)-----END PRIVATE KEY-----/s);
  if (match) {
    const body = match[1].replace(/\s+/g, '');
    const lines = body.match(/.{1,64}/g).join('\n');
    return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
  }

  // Last resort — return as-is and let Firebase SDK throw a clear error
  return raw;
}

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

  // Sanity check — log key shape (never log the full key)
  console.log('🔑 FIREBASE_PRIVATE_KEY starts with:', privateKey.slice(0, 40));
  console.log('🔑 FIREBASE_PRIVATE_KEY ends with:  ', privateKey.slice(-40).trim());

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        type:           'service_account',
        project_id:     process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key:    privateKey,
        client_email:   process.env.FIREBASE_CLIENT_EMAIL,
        client_id:      process.env.FIREBASE_CLIENT_ID,
        auth_uri:       'https://accounts.google.com/o/oauth2/auth',
        token_uri:      'https://oauth2.googleapis.com/token',
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL ||
                   'https://jain-lms-f14cd-default-rtdb.firebaseio.com',
    });
  } catch (err) {
    console.error('❌ Firebase initializeApp failed:', err.message);
    throw err;
  }

  const firestore = admin.firestore();
  firestore.settings({ ignoreUndefinedProperties: true });

  // Eagerly verify the connection so a bad key fails loudly at startup
  // instead of silently showing "Connecting..." in the UI forever.
  firestore.collection('_healthcheck').limit(1).get()
    .then(() => console.log('✅ Firestore connected — project:', process.env.FIREBASE_PROJECT_ID))
    .catch(err => console.error('❌ Firestore connection test failed:', err.message,
      '\n   Check your FIREBASE_PRIVATE_KEY value in Render Environment settings.'));
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
