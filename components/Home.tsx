"use client";

import { PopularThisWeek, RecsBanner, useRankedRecs } from "@/components/Discover";
import { OpportunityCard, SectionTitle } from "@/components/ui";
import { useStore } from "@/lib/store";

export function Home() {
  const { setView, catches } = useStore();
  const ranked = useRankedRecs();
  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-plum-900 to-plum-700 p-6 text-white md:p-10">
        <h1 className="text-3xl font-extrabold md:text-5xl">
          Gator <span className="text-gold-300">Radar</span>
        </h1>
        <p className="mt-2 max-w-2xl text-lg text-lav-100">
          Discover hidden SFSU opportunities. Catch them. Fit them into your week.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-lav-200">
          We don&apos;t just help students find opportunities. We help them act on the right ones before it&apos;s too late.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => setView("discover")} className="rounded-full bg-gold-300 px-5 py-2.5 font-bold text-plum-900 hover:bg-gold-400">Discover opportunities →</button>
          <button onClick={() => setView("wizard")} className="rounded-full border border-lav-300 px-5 py-2.5 font-semibold hover:bg-plum-800">Open Week Wizard</button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["1", "Discover", "Gemini matches opportunities to your interests, goals, and class schedule, and explains why."],
          ["2", "Catch", "Save events and applications, track statuses, and see how many days are left to apply."],
          ["3", "Plan", "Week Wizard places events at their real times and adds prep blocks before deadlines, with no overlaps."],
        ].map(([n, t, d]) => (
          <div key={n} className="rounded-2xl border border-lav-200 bg-white p-5">
            <p className="grid h-8 w-8 place-items-center rounded-full bg-plum-800 font-bold text-white">{n}</p>
            <h2 className="mt-2 text-lg font-bold text-plum-900">{t}</h2>
            <p className="text-sm text-slate-600">{d}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-gold-300 bg-gold-100/60 p-5">
        <h2 className="font-bold text-plum-900">The problem</h2>
        <p className="text-sm text-slate-700">
          SFSU opportunities are scattered across many sites and accounts. Students discover them too late, miss deadlines, and
          struggle to fit them into a real class schedule. Gator Radar is not another event calendar: it handles
          <strong> events</strong> (attend at a set time) and <strong>applications</strong> (prepare before a deadline) differently.
        </p>
      </section>

      <RecsBanner />
      <section>
        <SectionTitle sub="Top matches for your profile">Recommended For You</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ranked.slice(0, 3).map(({ opp, rec }) => (
            <OpportunityCard key={opp.id} o={opp} rec={rec} />
          ))}
        </div>
        {Object.keys(catches).length > 0 && (
          <button onClick={() => setView("catch")} className="mt-4 rounded-full bg-plum-800 px-4 py-2 text-sm font-semibold text-white">
            View My Catch ({Object.keys(catches).length})
          </button>
        )}
      </section>
      <PopularThisWeek />
    </div>
  );
}
