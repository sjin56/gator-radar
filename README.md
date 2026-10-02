# Gator Radar — Discover. Catch. Plan.

AI-powered opportunity discovery and weekly planning for San Francisco State University students.
Built solo for the SF Hacks x GDG AI Hackathon, **SFSU Track (Build for SFSU)**.

## The problem
SFSU opportunities (research positions, internships, scholarships, workshops, wellness and student-life events) are scattered
across many sites and social accounts. Students find them too late, miss deadlines, and can't tell what fits their class schedule.
The builder almost missed the registration deadline for this very hackathon.

**Beneficiaries:** SFSU students, especially those who are new to campus (transfer, first-year, international/exchange students).

## Data: a curated real-listing pilot (Oct 5–16, 2026)
All opportunities come from `data/realOpportunities.json`: 92 records manually transcribed from the Campus Rec Fall 2026 Group Fitness flyer, the SFSU Student Events Calendar PDF, GatorXperience screenshots and a few official pages. **This is a snapshot, not live crawling, and records are not individually verified.** Per-record `verificationStatus`, `schedulable`, `recommendationEligible` and `reviewFlags` are respected: unschedulable items are info-only and never placed as fixed blocks. Nothing (end time, URL, venue, eligibility) is invented. Every cache is prefixed with the dataset id `sfsu-real-opportunity-pilot-2026-10-05-to-16-v1`, so results computed on earlier data are never reused. No popularity numbers are shown.

## What it does
- **Student Profile** – interests, goals, recurring classes/commitments (saved in the browser). A fictional demo student is prefilled.
- **Discover** – Gemini ranks opportunities for the student and explains *why*; category/type filters; deadline urgency badges; schedule-conflict badges.
- **My Catch** – save/remove, status (Saved → Planning to Apply → Applied), days remaining. Persists across refresh.
- **Week Wizard** – proactive AI weekly planner over the *whole* opportunity dataset (My Catch can be empty). Two independent controls: **Discovery Preference** (Prioritize My Catch / Balanced Discovery / Surprise Me!) and **Weekly Goal** (Career / Social / Balanced), plus commute minutes and activities-per-week. Gemini scores every opportunity; fixed rules pick, place and validate (official times never changed, commute buffers, max 2 activities/day, optional prep blocks before deadlines, reasons shown for any caught item left out).

Events (attend at a set time) and applications (prepare before a deadline) are handled differently.

## How Gemini is used
`POST /api/recommend` (server-side only; the key never reaches the browser) sends the student's interests, goals and schedule plus the
**closed list** of opportunities to Gemini with a JSON response schema. Gemini returns `{id, score, reason}` items.
The server validates every item against the real dataset (unknown ids dropped, scores clamped, duplicates removed).
Gemini never creates opportunities, dates, or times. Date math and scheduling are deterministic code (America/Los_Angeles).
If Gemini is unavailable the UI shows a visible **"Fallback mode — not AI"** banner with simple keyword matching.

## Gemini free-tier reliability
The free tier allows about **20 requests per day per model** (a daily quota, not per-minute). To stay within it:
- No automatic Gemini calls: Home/navigation never calls the API; only explicit Save-profile, Regenerate and Generate actions do, with a persisted cooldown and duplicate-click protection.
- Results are cached in the browser (exact inputs) and shared on the server (same inputs, same day), and the demo student ships with a **clearly labeled genuine Gemini snapshot**.
- When live Gemini is unavailable the app shows the last genuine result with a label, and only then the keyword fallback ("not AI"). Models are tried in order; quotas are per model.

## Run locally
```bash
npm install
cp .env.example .env.local   # then put your own GEMINI_API_KEY in .env.local
npm run dev                  # http://localhost:3000
```
Never commit `.env.local`. 


## Data Privacy & Ethics
- Profile, schedule and saved items are stored in the browser (localStorage) by default.
- Only interests, academic focus, career goals and commitment titles/times are sent to the Gemini API via our server.
- With Firestore enabled, an anonymous random browser ID and catch activity are stored for popularity counts.
- No names or SFSU credentials are collected. AI can be wrong; always verify with the official source.

## Technologies actually implemented
Next.js (App Router) · React · TypeScript · Tailwind CSS · Gemini API (REST, server-side) · localStorage · Vercel.

## Honest status
- Real-listing pilot is a manual snapshot for Oct 5–16, 2026 (see Data). No scraping, Firestore or authentication is implemented.
- Future: automated source aggregation with verification, community submissions, real catch counts, SSO/class-schedule import, reminders, manual week editing.
