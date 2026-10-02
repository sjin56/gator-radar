# ShipYard Submission Answers — Gator Radar (SFSU Track)

**Live app:** https://gator-radar.vercel.app

## Project Name and Tagline
**Gator Radar** — Discover. Catch. Plan.

## Project Overview
Gator Radar is an AI-powered opportunity discovery and weekly planning web app for SFSU students. It surfaces campus events that match a student's interests and goals, lets them "catch" the ones they like, and builds a realistic Monday–Friday plan around their classes, commute and free time. The pilot runs on a manually curated snapshot of real SFSU listings for **Oct 5–16, 2026**.

## Problem Statement
SFSU opportunities are scattered across many sites, PDFs and social accounts. Students find them too late, miss deadlines, overlook programs that match their goals, and struggle to fit them into a class schedule. I nearly missed this hackathon's own registration deadline.

## Target Users
SFSU students, especially first-year, transfer and international/exchange students who do not yet know where to look.

## Main Features (implemented)
- **Student Profile:** interests, goals, recurring classes, commute minutes and preferred weekly activity load, saved in the browser. A fictional demo student is prefilled.
- **Discover:** 92 curated real listings (see data note). Gemini-powered "Recommended For You" with a reason for each pick, category filters, schedule-conflict badges, and a visible Source & verification panel on every card. The 51 recurring Campus Rec fitness sessions are grouped into 26 weekly classes, with each session catchable on its own.
- **My Catch:** save/remove, status tracking, persists after refresh.
- **Week Wizard:** AI-guided weekly planner over the whole dataset (works with an empty My Catch). Two independent controls: **Discovery Preference** (Prioritize My Catch / Balanced Discovery / Surprise Me!) and **Weekly Goal** (Career / Social / Balanced). Gemini scores listings; fixed rules place events at their official times, apply commute buffers and a free-time guard (max 2 activities/day), never move official times, never place listings flagged as not schedulable, and explain every caught item that did not fit.

## How AI Was Used
Server-side Gemini scores every listing for the student and explains why (interests, career goals, verified schedule conflicts). Output is validated against the real dataset, so the model cannot invent listings, times or deadlines. Dates, conflicts, commute buffers and calendar placement are deterministic code. Because the free tier allows about 20 requests/day/model, the app never calls Gemini automatically; results are cached (browser and server), a clearly labeled genuine Gemini snapshot is shipped for the demo student, and a cooldown plus a visible "Fallback — not AI" mode protect honesty when no genuine result is available.

## Data (what is real and what is not)
- **Manually curated snapshot, not live crawling.** 92 records for Oct 5–16, 2026, transcribed from the Campus Recreation Fall 2026 Group Fitness flyer (51 dated sessions), the SFSU Student Events Calendar PDF, GatorXperience event-card screenshots and a few official Academic Technology / Career pages.
- **Not individually verified.** Each record carries its own verification status and review flags. A listing proves what was published at capture time, not that a class runs on that date, that seats remain, or that every student is eligible. The UI shows these notes on each card.
- **Respected flags:** 29 records (e.g., drop-in service windows, intramural league windows, listings with only a start time, the ORC Gear Demo with an inconsistent time, BIOL 870 sessions awaiting organizer confirmation) are shown as information only and are never placed as fixed calendar blocks. No end times, URLs, venues or eligibility rules were invented.
- No popularity numbers are shown, because no real cross-user data exists.

## Technologies Actually Implemented
Next.js (App Router), React, TypeScript, Tailwind CSS, Gemini API (server-side), browser localStorage, Vercel hosting. Not used: Firestore, Cloud Run, authentication, scraping.

## Differentiation from Existing Event Platforms
It is not another event calendar. It combines personalized AI discovery with planning: "Catch First, but Never Catch Only." The Week Wizard also surfaces things a student never saved, while respecting classes, commute and free time, and it explains what it left out.

## Responsible AI and Privacy Considerations
Profile, schedule and saved items stay in the browser by default. Only interests, academic focus, career goals, commitment titles/times and commute minutes are sent to Gemini through our server (API key never exposed); no names, addresses or SFSU credentials. AI output is labeled by origin (live, saved, snapshot, or non-AI fallback), can be imperfect, and users are told to verify every listing with the official source.

## Implemented vs. Curated Data vs. Future
- **Implemented:** everything under Main Features.
- **Curated snapshot:** the 92 listings (manual, Oct 5–16 only).
- **Future (not implemented):** automated source aggregation (GatorXperience, department sites, student orgs) with human verification, student/community submissions with moderation, real cross-user catch counts, SFSU SSO and official class-schedule import, deadline reminders, manual editing of the generated week, and partnership with Campus Rec / Career Center for official feeds.

## Known limitations (be upfront with judges)
- Gemini free tier is limited; if the daily quota is used up, the app shows the last genuine result or a clearly labeled non-AI fallback.
- The demo snapshot was generated by `gemini-3.1-flash-lite` on Oct 2 at 3:42 PM PT; live results may use a larger model when quota is available.
- Listings can be cancelled or full; fitness sessions are expanded from a recurring weekly flyer.
