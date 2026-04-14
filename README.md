# Jain Developers LMS v3

Node.js + Express + Firebase Firestore + Render.com

---

## 🚀 Deploy in 5 minutes

### 1. Push to GitHub
```bash
cd backend
git init
git add .
git commit -m "Jain LMS v3"
git remote add origin https://github.com/YOUR_USERNAME/jain-lms.git
git push -u origin main
```

### 2. Create Web Service on Render
- render.com → New → Web Service → connect repo
- Build: `npm install` | Start: `npm start` | Plan: Free | Region: Singapore

### 3. Add Environment Variables in Render → Environment tab

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `FIREBASE_PROJECT_ID` | `jain-lms-f14cd` |
| `FIREBASE_PRIVATE_KEY_ID` | `7f6ade1d1b51b3152780797ec2081729c96a2758` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@jain-lms-f14cd.iam.gserviceaccount.com` |
| `FIREBASE_CLIENT_ID` | `101739915886213945364` |
| `FIREBASE_PRIVATE_KEY` | *(see below)* |
| `JWT_SECRET` | any long random string |
| `SEED_SECRET` | `jain-seed-2024` |

### ⚠️ FIREBASE_PRIVATE_KEY — how to paste it

In Render's Environment tab, add `FIREBASE_PRIVATE_KEY` and paste this exact value:

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

Paste it as-is — Render handles the newlines correctly.

### 4. Deploy → Wait ~60 seconds → Check logs for:
```
✅ Firebase connected: jain-lms-f14cd
🚀 Jain LMS :10000
```

### 5. Seed Firestore (one time)
Open in browser:
```
https://YOUR-APP.onrender.com/api/seed?secret=jain-seed-2024
```

---

## 📍 URLs

```
https://YOUR-APP.onrender.com/          Landing
https://YOUR-APP.onrender.com/student   Student Platform
https://YOUR-APP.onrender.com/admin     Admin Panel
https://YOUR-APP.onrender.com/api/health  Health Check
```

## 👤 Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@jaindevelopers.com | admin123 |
| Instructor | priya@jaindevelopers.com | priya123 |
| Student | aarav@email.com | aarav123 |

## 🔐 Admin Login

Visit `/admin` → login screen appears → enter email + password.
Session stays active 30 min from last activity.

## ✨ Features

**Student Platform (`/student`):**
- Browse all published courses (no login required to see them)
- Request enrollment — admin must approve before access
- Button states: Request Enrollment → ⏳ Pending → ✓ Enrolled / ✗ Rejected
- My Learning tabs: My Courses / Quizzes / Projects
- Quiz engine with timer, scoring, XP rewards
- Project submission per course
- Lesson player with progress tracking
- XP system, streaks, certificates

**Admin Panel (`/admin`):**
- Login screen with 30-min session timeout
- Dashboard with stats and pending requests widget
- Courses: create/publish/delete with project fields
- Enrollment Requests: approve/reject pending requests
- Students: view all students, XP, streaks
- Quizzes: create with full question builder (options, correct answer, explanation)
- Announcements: post platform notices

## 📁 Firestore Collections

| Collection | Purpose |
|-----------|---------|
| `users` | Profiles, XP, enrolled courses |
| `courses` | Courses with sections, lessons, project details |
| `progress` | Per-user lesson completion |
| `quizzes` | Quiz questions with answers |
| `announcements` | Platform notices |
| `enrollmentRequests` | Pending/approved/rejected requests |
