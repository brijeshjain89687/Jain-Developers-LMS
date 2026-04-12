# Jain Developers LMS

Node.js + Express + Firebase Firestore + GitHub Videos — Render.com

---

## 🚀 Deploy to Render

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Jain Developers LMS"
git remote add origin https://github.com/YOUR_USERNAME/jain-lms.git
git push -u origin main
```

### Step 2 — Create Web Service on Render
- render.com → New → Web Service → connect your repo
- Build: `npm install` | Start: `npm start` | Plan: Free

### Step 3 — Add Environment Variables in Render Dashboard

Go to your service → **Environment** tab. Add each variable:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `FIREBASE_PROJECT_ID` | `jain-lms-f14cd` |
| `FIREBASE_PRIVATE_KEY_ID` | `7f6ade1d1b51b3152780797ec2081729c96a2758` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@jain-lms-f14cd.iam.gserviceaccount.com` |
| `FIREBASE_CLIENT_ID` | `101739915886213945364` |
| `FIREBASE_DATABASE_URL` | `https://jain-lms-f14cd-default-rtdb.firebaseio.com` |
| `JWT_SECRET` | `jain-lms-jwt-secret-2024` |
| `SEED_SECRET` | `jain-seed-2024` |
| `GITHUB_TOKEN` | your GitHub fine-grained token |
| `GITHUB_OWNER` | your GitHub username |
| `GITHUB_REPO` | `lms-videos` |

### ⚠️ FIREBASE_PRIVATE_KEY — Critical Step

For the `FIREBASE_PRIVATE_KEY` variable in Render:

1. In Render's environment tab, click **Add Environment Variable**
2. Key: `FIREBASE_PRIVATE_KEY`
3. Value: Copy the ENTIRE block below (including the dashes) and paste it as-is:

```
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCl3k5u/L8EPyBY
BVz4VDQI5sBDjz+IuTja+ejzl760jtFhiRTedY7ooAmXOb3039nqz5TgRmlubqSf
wgyyiS4ovt4gftFNMbVPLFGSJISCE6DW67EqbvkD8qoz/8494+xyVGDWpZg2szDM
khGKJbI68MxSwJFIfUgYR4OMAFALcE7T9KVglU8De3kqeLpsW0mb/2tOdDQSFi0k
nbNtjScZlRFX9Pg45Omzv2elmat69iQjuqdu9G8ci+63zlfY4YTIxoKf9ajt0XrH
UNhkA+jYeJhGhiYcnOS6kSE0kSGuSLmHSmT80GI3yoqHrazKoT1vbqxE/zqEvDf6
ieSOQ/MvAgMBAAECggEAC6v97PMrk501k3Lvc5akuHOiIQyjNeXL7iOtAkKfota9
YkyG3yHDw87c5w1Z/8PdYGDpYwSIRjDSaxXUVlYvL1mvCYnHlvh0NpnEEEPEcHGv
b3ll1LpNP5a6eIpFGe5k26WXPlXMxRyffZya4jhXtz6kVG1ElRRrzp4lGQk9vUuj
cldzWveUVm/cbTCkuHQt4mxSInz8idR2tmIu0mq3esukACS4QdtJ1e3iXLL9KelP
lW6boyMV34zeSEcGQ7wJhfuQ4RW0GqN1GckYQXuOtj30FHw7CRjqXd/O9qbJR0xz
RHKrSe49h7CaLuP0nlk5zRK1Rb2a1DCmBrEzHoV+4QKBgQDO/YKnSZVSG6qj4twS
TYeqET1SDBhAoUMcuQDxVYKKZVmwaps5TLN0G16njQ+uazE6Pg5fI/h+ECchT0iZ
hr/URpEtrBBSk9yRGeMSBpNTBFN9dygTpbQapc1kafiQXSCwru0Wa6OPUI7SlsP6
tw4MK0ydRxuGQd0PH3nS5aXmOQKBgQDNJDzMXFYp1i8bIh9ViemeUa6DFNNee9LL
zz6DYYgaoS9gNaYrfFMRg1TCfXZEGODbDu4/ykUcuVMEOJl9tjFifbT9lxTF0GCu
g2NqdGJQ7Vd1fYb8hP71w5D8XYn++E565NF7WtUVUF0INMVnJtaCxWnKg5sguZEl
oAbA7gDkpwKBgHbugtvME9gRvYJdH0YE9iZpsWorOOQpxH4Ebt47273ZbidHmdja
kWHtN/3dt1zoimiEr41LBcSpU1J4U6ajHiXCRjiP3PEVtG5LCYWZ8ZyJp883X/eq
BkopalJ/8SpB2D6sw91WC6yVBPtLVWABPjkPx/22lcIWpgXCeCUNfr1BAoGAXfoW
3CwE0P+s7sov/pjCbGPRBX3Z4vPourODWN6qYkCrGnEZYdx/lYtLnhmpv0KCZ/gs
Dw8ToDgKHunq7xsy/oLGElJPEtwGHoxUU+VjUN2Z7loGJ9Kpll70IZicajDIiyYe
DVusOCprpCHAuSOiq5/SehLWUySPqOPplCK0SAsCgYB4HaTi3vfwKR6hzpF9AFyX
g2AdWInvwywSVGbZ99lsgbom/7qvUcnPjke1tv/dsvlVRCY4nWSAsqlyVDLCvnoj
MC53OgNGaCb5yYAizCn4G0nCaGnIfR3Exlvoixu2Stm7CGIEUQTa0w38oMkMb0sb
ThZE49oMJWtSjwVjU+b7zw==
-----END PRIVATE KEY-----

```

**Important:** Paste it exactly — don't add extra quotes, don't remove any characters.
Render handles multi-line values correctly in its dashboard.

### Step 4 — Deploy
Click **Save Changes** then **Manual Deploy → Deploy latest commit**.
Wait ~60 seconds. Check logs — you should see:
```
✅ Firebase connected — project: jain-lms-f14cd
```

### Step 5 — Seed Firestore (one time only)
After deploy succeeds, open this URL in your browser:
```
https://YOUR-APP.onrender.com/api/seed?secret=jain-seed-2024
```
You'll get a JSON response confirming all users and courses were created.

---

## 📍 Your Live URLs

```
https://YOUR-APP.onrender.com/          Landing page
https://YOUR-APP.onrender.com/student   Student platform
https://YOUR-APP.onrender.com/admin     Admin panel
https://YOUR-APP.onrender.com/api/health  Health check (confirms Firebase status)
```

## 👤 Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@jaindevelopers.com | admin123 |
| Instructor | priya@jaindevelopers.com | priya123 |
| Student | aarav@email.com | aarav123 |

## 🔐 Admin Panel Session

- Opens to a **login screen** — enter email + password
- Session stays active for **30 minutes** after last activity
- Any click, scroll, or keypress resets the 30-min timer
- After 30 min idle, automatically logs out and shows login screen
- On page reload, auto-logs back in if session is still valid

## 🎬 GitHub Video Upload

1. Create a GitHub repo called `lms-videos`
2. Push .mp4 files in this structure:
```
lms-videos/
  web-development/
    react-complete-guide/
      lesson-01-introduction.mp4
      lesson-02-setup.mp4
```
3. Admin Panel → Videos → **↻ Sync & Scan Repo**
4. Admin Panel → Course Builder → **Assign Video** to each lesson

## 🔥 Firebase Firestore Collections

| Collection | Purpose |
|-----------|---------|
| `users` | Profiles, XP, enrolled courses, streak |
| `courses` | Course data with sections and lessons |
| `progress` | Per-user lesson completion tracking |
| `quizzes` | Quiz questions and config |
| `announcements` | Platform announcements |

---

## 🛠️ Changelog — Bug Fixes (April 2026)

### Login Fixes
- **Demo mode retry**: App now retries the server health check 3 times (2s apart) before falling back to demo mode, preventing cold-start false negatives on Render free tier.
- **Demo mode warning banner**: A visible orange banner now appears whenever the app is in demo mode so users know real credentials are not being used.
- **Clearer error for incomplete accounts**: Users created directly in Firebase Console (not via `/register`) get a helpful error message instead of a cryptic one.
- **Hardcoded admin credentials removed**: `admin.html` login form no longer pre-fills credentials.

### New Admin Endpoint
**`PUT /api/auth/admin-set-password`** — Fixes accounts that were created in Firebase Console and are missing a `passwordHash`. Requires admin token.
```json
{ "targetUid": "firebase-uid-here", "newPassword": "newpass123" }
```

### Other Fixes
- **keepAlive.js**: Now works on Render **free** tier (no longer requires `RENDER_EXTERNAL_URL`, falls back to localhost ping).
- **progress.js**: Used `set({ merge: true })` for new progress docs to prevent race condition; `watchSeconds` is now safely cast to `Number`.
- **admin.html `loadAll()`**: Removed call to `/quizzes/course/all` (route does not exist) which was causing a silent error on every admin page load.
- **users.js**: Role-filtered user queries now include `orderBy('createdAt', 'desc')` for consistent ordering.

