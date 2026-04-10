# Jain Developers LMS — Firebase Edition

## 🚨 Fix: UNAUTHENTICATED Error on Render

If you see `❌ 16 UNAUTHENTICATED` in Render logs, the service account JSON
is not being found. Fix it with ONE of these methods:

### Method A — Ensure JSON is committed to git (simplest)

The `serviceAccountKey.json` file MUST be committed to your GitHub repo.
Run these commands after unzipping:

```bash
cd backend
git init
git add .
git add -f config/serviceAccountKey.json   # force-add just in case
git commit -m "Jain LMS with Firebase credentials"
git remote add origin https://github.com/YOUR_USERNAME/jain-lms.git
git push -u origin main
```

Verify it's in the repo: go to GitHub → your repo → config/serviceAccountKey.json
If you can see it there, Render will have it too.

### Method B — Add environment variables in Render (alternative)

In Render Dashboard → your service → Environment, add:

```
FIREBASE_PROJECT_ID      =  jain-lms-f14cd
FIREBASE_PRIVATE_KEY_ID  =  7f6ade1d1b51b3152780797ec2081729c96a2758
FIREBASE_CLIENT_EMAIL    =  firebase-adminsdk-fbsvc@jain-lms-f14cd.iam.gserviceaccount.com
FIREBASE_CLIENT_ID       =  101739915886213945364
FIREBASE_DATABASE_URL    =  https://jain-lms-f14cd-default-rtdb.firebaseio.com
FIREBASE_PRIVATE_KEY     =  (paste the entire private key including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----)
```

For FIREBASE_PRIVATE_KEY in Render: paste the raw value from the JSON file.
Render preserves newlines in env vars — no need to replace \n.

---

## 🌱 Seed Firestore (no terminal needed!)

Once deployed, seed your database by visiting:

```
POST https://YOUR-APP.onrender.com/api/seed
Body: { "secret": "jain-seed-2024" }
```

Or use curl:
```bash
curl -X POST https://YOUR-APP.onrender.com/api/seed \
  -H "Content-Type: application/json" \
  -d '{"secret": "jain-seed-2024"}'
```

Or open this URL in browser (GET version also accepted):
```
https://YOUR-APP.onrender.com/api/seed?secret=jain-seed-2024
```

After seeding, these accounts will be available:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@jaindevelopers.com | admin123 |
| Instructor | priya@jaindevelopers.com | priya123 |
| Student | aarav@email.com | aarav123 |

---

## 🚀 Deploy Steps

```bash
# 1. Unzip and go into backend folder
unzip 1-jain-lms-backend.zip && cd backend

# 2. Commit EVERYTHING including the JSON key
git init
git add .
git add -f config/serviceAccountKey.json
git commit -m "Jain LMS initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/jain-lms.git
git push -u origin main

# 3. On render.com → New → Web Service → connect repo → Deploy

# 4. Add these env vars in Render dashboard:
#    JWT_SECRET  = any-long-random-string
#    GITHUB_TOKEN = your-github-token  (for video uploads)
#    GITHUB_OWNER = your-github-username
#    GITHUB_REPO  = lms-videos

# 5. After deploy, seed by visiting:
#    https://YOUR-APP.onrender.com/api/seed?secret=jain-seed-2024
```

## Live URLs

```
https://YOUR-APP.onrender.com/           Landing page
https://YOUR-APP.onrender.com/student    Student platform
https://YOUR-APP.onrender.com/admin      Admin panel
https://YOUR-APP.onrender.com/api/health Health check
```

## Firebase Project

- Project ID: `jain-lms-f14cd`
- Service: Firestore + Firebase Authentication
- Collections: users, courses, progress, quizzes, announcements

## Firestore Security Rules

Go to Firebase Console → Firestore → Rules and set:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;  // Admin SDK bypasses all rules
    }
  }
}
```

The Admin SDK (server-side) ALWAYS bypasses Firestore security rules.
The rules only affect direct client-side access, which we don't use.
