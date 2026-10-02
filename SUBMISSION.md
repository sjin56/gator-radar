# ShipYard Submission — Gator Radar (SFSU Track: Build for SFSU)

**Live website:** https://gator-radar.vercel.app
**GitHub repository:** https://github.com/sjin56/gator-radar (private until approved for public)

## Project name and tagline
**Gator Radar**: Discover. Catch. Plan.

## The Problem
SFSU opportunities (workshops, career events, wellness classes, student-life events) are scattered across many sites, PDFs and social accounts. Students find them too late, overlook programs that fit their goals, and struggle to fit them into a real class schedule. The builder, an international exchange student, nearly missed this hackathon's own registration deadline.

## What It Does
Gator Radar helps SFSU students discover relevant campus events, save ("catch") the ones they like, and turn them into a realistic Monday–Friday plan.
- **Student Profile:** interests, goals, recurring classes, commute minutes and weekly activity load, saved in the browser (a fictional demo student is prefilled).
- **Discover:** 90 curated real listings for Oct 5–16, 2026, with Gemini-powered "Recommended For You" (a reason for each pick), category filters, schedule-conflict badges, and a Source & verification panel on every card. Recurring Campus Rec fitness classes are grouped, and each session can be caught individually.
- **My Catch:** save and remove, status tracking, persists after refresh.
- **Week Wizard:** an AI-guided planner over the whole dataset (it works even with an empty My Catch). Two independent controls: Discovery Preference (Prioritize My Catch / Balanced Discovery / Surprise Me!) and Weekly Goal (Career / Social / Balanced). It places events at their official times, applies commute buffers and a free-time guard, and explains every caught item it left out.

## How I Built It
A Next.js + TypeScript + Tailwind app with server-side API routes, deployed on Vercel. The dataset is a manually curated JSON snapshot transcribed from the Campus Rec Fall 2026 fitness flyer, the SFSU Student Events Calendar PDF, GatorXperience event cards and a few official pages. Each record keeps its own verification status and review flags; listings without exact start and end times are information-only and never placed as fixed calendar blocks. Dates, conflicts, commute buffers and scheduling are deterministic code. Gemini output is validated against the real dataset. To live within the Gemini free tier (about 20 requests per day per model), the app never calls Gemini automatically, caches results in the browser and on the server, ships a clearly labeled genuine Gemini snapshot for the demo student, and shows a visible "Fallback — not AI" mode when no genuine result exists.

## Gemini's meaningful technical contribution
Gemini is the relevance engine, not a chatbot. Server-side, it receives the student's interests, goals, class schedule and commute plus a closed list of real listings (each with verified-conflict labels computed by the app), and returns structured JSON: a 0–100 fit score and a short reason for every listing. The Week Wizard uses these scores together with the chosen Discovery Preference and Weekly Goal. Gemini cannot add listings, change times or invent deadlines, because every output ID is checked against the dataset and all calendar placement is done by fixed rules. Models tried in order: gemini-3.8-flash, gemini-3.5-flash, gemini-3.1-flash-lite (the demo snapshot came from gemini-3.1-flash-lite).

## Technology stack
Next.js (App Router), React, TypeScript, Tailwind CSS, Gemini API (server-side), browser localStorage, Vercel. Not used: Firestore, Cloud Run, authentication, scraping.

## Responsible AI, privacy and data honesty
- Profile, schedule and saved items stay in the browser by default. Only interests, academic focus, career goals, commitment titles/times and commute minutes go to Gemini through our server. No names, addresses or SFSU credentials. The API key is never exposed to the browser.
- The listings are a **manually curated snapshot for Oct 5–16, 2026, not live crawling, and not individually verified**. A listing shows what was published at capture time, not that a class runs, has space, or fits every student's eligibility. The app labels this on each card and tells users to verify with the official source.
- AI results are labeled by origin (live, saved, demo snapshot, or non-AI fallback) and can be imperfect.
- No popularity numbers are shown, because no real cross-user data exists.

## Known limitations
- Free-tier Gemini quota is limited; when exhausted the app shows the last genuine result or a labeled non-AI fallback.
- Each new Discovery Preference × Weekly Goal combination costs one Gemini request the first time (then it is cached).
- Fitness sessions are expanded from a recurring weekly flyer; individual dates may be cancelled or full.

## Future Development
1. Automated SFSU opportunity aggregation.
2. Student and organization opportunity submissions (with moderation).
3. AI-assisted information extraction and verification.
4. Interactive "Customize My Week" editing.
5. Shared catch counts and deadline notifications.
6. Reusable Gemini scoring: make relevance scores independent of Discovery Preference, Weekly Goal and caught items, so one request per profile supports every planning combination built locally.

## Tags and track information
- **Track:** SFSU Track (Build for SFSU)
- **Tags:** SFSU, students, campus life, AI, Gemini, Next.js, TypeScript, Tailwind, Vercel, personalization, planning, responsible AI
- **GDG track:** not claimed. Gator Radar was built for the SFSU Track and does not claim to satisfy GDG-specific requirements (it does not use Google Cloud services beyond the Gemini API).
