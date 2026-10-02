"use client";

import { PopularThisWeek, RecsBanner, useRankedRecs } from "@/components/Discover";
import { RadarMark } from "@/components/Shell";
import { DemoNote, OpportunityCard, SectionTitle } from "@/components/ui";
import { useStore } from "@/lib/store";

const STEPS = [
  { n: "1", t: "Discover", icon: "◎", d: "Gemini matches opportunities to your interests, goals and class schedule, and tells you why." },
  { n: "2", t: "Catch", icon: "♥", d: "Save events and applications, track status, and watch the days left before each deadline." },
  { n: "3", t: "Plan", icon: "▦", d: "Week Wizard builds a calendar around your classes, commute and free time, using what you caught and what you haven't found yet." },
];

export function Home() {
  const { setView, catches } = useStore();
  const ranked = useRankedRecs();
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-plum-950 via-plum-900 to-plum-700 p-7 text-white shadow-xl md:p-12">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 opacity-30">
          <svg width="420" height="420" viewBox="0 0 420 420" fill="none">
            {[190, 140, 90, 40].map((r) => <circle key={r} cx="210" cy="210" r={r} stroke="#c1b2fb" strokeWidth="2" />)}
            <path d="M210 210 L380 90" stroke="#ffd24d" strokeWidth="4" strokeLinecap="round" />
            <circle cx="300" cy="140" r="9" fill="#ffd24d" />
            <circle cx="150" cy="290" r="7" fill="#c1b2fb" />
          </svg>
        </div>
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-3">
            <RadarMark size={44} />
            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
              Gator <span className="text-gold-300">Radar</span>
            </h1>
          </div>
          <p className="mt-4 text-xl font-semibold text-lav-100 md:text-2xl">
            Discover hidden SFSU opportunities. Catch them. Fit them into your week.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-lav-200 md:text-base">
            We don&apos;t just help students find opportunities. We help them act on the right ones before it&apos;s too late.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => setView("discover")} className="rounded-full bg-gold-300 px-6 py-3 font-extrabold text-plum-950 shadow-lg hover:bg-gold-400">
              Discover opportunities →
            </button>
            <button onClick={() => setView("wizard")} className="rounded-full border border-lav-300/60 px-6 py-3 font-bold hover:bg-white/10">
              ✨ Generate my week
            </button>
          </div>
        </div>
      </section>

      <section aria-label="How it works">
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-3xl border border-lav-200 bg-white p-6 shadow-[0_2px_14px_rgba(76,47,160,0.08)]">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-plum-800 text-xl text-gold-300" aria-hidden>{s.icon}</span>
                <h2 className="text-xl font-extrabold text-plum-900">{s.n}. {s.t}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl bg-lav-100 p-6 md:grid-cols-2 md:p-8">
        <div>
          <h2 className="text-2xl font-extrabold text-plum-900">The problem</h2>
          <ul className="mt-3 space-y-2 text-sm text-plum-900">
            <li>🔗 Campus opportunities are scattered across many sites and accounts.</li>
            <li>⏰ Students miss deadlines or never find relevant programs.</li>
            <li>🗓 Even when they do, it&apos;s hard to fit them into a real schedule.</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-white/70 p-5 text-sm leading-relaxed text-plum-900">
          <p className="font-bold">Not just an event calendar.</p>
          <p className="mt-1">
            Gator Radar handles <strong>events</strong> (show up at a set time) and <strong>applications</strong> (prepare before a deadline)
            differently, and makes room for them in your life.
          </p>
          <div className="mt-3"><DemoNote /></div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle sub="Top matches for your profile, with the reason behind each one.">Recommended For You</SectionTitle>
        <RecsBanner />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {ranked.slice(0, 3).map(({ opp, rec }) => <OpportunityCard key={opp.id} o={opp} rec={rec} />)}
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setView("discover")} className="rounded-full bg-plum-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-plum-700">See all opportunities</button>
          {Object.keys(catches).length > 0 && (
            <button onClick={() => setView("catch")} className="rounded-full border border-lav-300 bg-white px-5 py-2.5 text-sm font-bold text-plum-800 hover:bg-lav-100">
              My Catch ({Object.keys(catches).length})
            </button>
          )}
        </div>
      </section>
      <PopularThisWeek />
    </div>
  );
}
