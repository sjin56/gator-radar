# Gator Radar — Discover. Catch. Plan.

AI-powered opportunity discovery and weekly planning for San Francisco State University students.
Built solo for the SF Hacks x GDG AI Hackathon, **SFSU Track (Build for SFSU)**.

## The problem
SFSU opportunities (research positions, internships, scholarships, workshops, wellness and student-life events) are scattered
across many sites and social accounts. Students find them too late, miss deadlines, and can't tell what fits their class schedule.
The builder almost missed the registration deadline for this very hackathon.

**Beneficiaries:** SFSU students, especially those who are new to campus (transfer, first-year, international/exchange students).

## What it does
- **Student Profile** – interests, goals, recurring classes/commitments (saved in the browser). A fictional demo student is prefilled.
- **Discover** – Gemini ranks opportunities for the student and explains *why*; category/type filters; deadline urgency badges; schedule-conflict badges.
- **My Catch** – save/remove, status (Saved → Planning to Apply → Applied), days remaining. Persists across refresh.
- **Popular This Week** – community "catch" counts. Uses Firestore if configured; otherwise **clearly labeled illustrative demo numbers**.
- **Week Wizard** – Mon–Fri planner: classes, events at their *official* times, optional prep blocks before deadlines, no overlaps, and an explanation of anything that could not fit. Career / Social / Balanced variations.

Events (attend at a set time) and applications (prepare before a deadline) are handled differently.

## How Gemini is used
`POST /api/recommend` (server-side only; the key never reaches the browser) sends the student's interests, goals and schedule plus the
**closed list** of opportunities to Gemini with a JSON response schema. Gemini returns `{id, score, reason}` items.
The server validates every item against the real dataset (unknown ids dropped, scores clamped, duplicates removed).
Gemini never creates opportunities, dates, or times. Date math and scheduling are deterministic code (America/Los_Angeles).
If Gemini is unavailable the UI shows a visible **"Fallback mode — not AI"** banner with simple keyword matching.

## Run locally
```bash
npm install
cp .env.example .env.local   # then put your own GEMINI_API_KEY in .env.local
npm run dev                  # http://localhost:3000
```
Never commit `.env.local`. 

## Optional: shared catch counts (Firestore)
Set `FIRESTORE_PROJECT_ID` and provide Google credentials (`gcloud auth application-default login` locally, or the runtime service account on Cloud Run).
One document per (visitor, opportunity) guarantees repeated saves can't inflate counts; un-catching deactivates it.
Counts are "catches" from anonymous browser IDs — **not unique students**.

## Data Privacy & Ethics
- Profile, schedule and saved items are stored in the browser (localStorage) by default.
- Only interests, academic focus, career goals and commitment titles/times are sent to the Gemini API via our server.
- With Firestore enabled, an anonymous random browser ID and catch activity are stored for popularity counts.
- No names or SFSU credentials are collected. AI can be wrong; always verify with the official source.

## Technologies actually implemented
Next.js (App Router) · React · TypeScript · Tailwind CSS · Gemini API (REST, server-side) · localStorage · firebase-admin (Firestore code path, optional).

## Honest status
- All opportunities are **demo records** (fictional, not verified, no source URLs). No scraping is implemented.
- Future work: ingest real GatorXperience / department / Instagram sources with verification, SFSU SSO, official class-schedule import, reminders.
