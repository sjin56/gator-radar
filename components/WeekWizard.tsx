"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui";
import { addDays, formatDate, formatTime, mondayOf } from "@/lib/dates";
import { planWeek, type Block, type Origin } from "@/lib/planner";
import { useStore } from "@/lib/store";
import type { Discovery, Goal, PlanScores } from "@/lib/types";

const HOUR_START = 8;
const HOUR_END = 20;
const PX = 52;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const CACHE_KEY = "gr.plans.v1";
const PREF_KEY = "gr.wizard.v1";

const DISCOVERY: { id: Discovery; icon: string; title: string; desc: string }[] = [
  { id: "mycatch", icon: "♥", title: "Prioritize My Catch", desc: "Your saved picks come first; a few new ideas are mixed in." },
  { id: "balanced", icon: "⚖", title: "Balanced Discovery", desc: "Saved and brand-new opportunities get equal priority." },
  { id: "surprise", icon: "✨", title: "Surprise Me!", desc: "Mostly things you haven't found yet, still matched to you." },
];
const GOALS: { id: Goal; title: string; desc: string }[] = [
  { id: "career", title: "Career Week", desc: "Research, internships, networking, professional growth." },
  { id: "social", title: "Social Week", desc: "Clubs, wellness, sports, volunteering, meeting people." },
  { id: "balanced", title: "Balanced Week", desc: "A mix of growth, social life, wellness and rest." },
];

type ScoreState =
  | { status: "idle" | "loading" }
  | { status: "error"; error: string }
  | { status: "done"; scores: PlanScores; cached: boolean };

const loadCache = (): Record<string, PlanScores> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
};

function blockStyle(b: Block) {
  if (b.type === "class") return "bg-lav-100 border border-lav-300 text-plum-900";
  if (b.type === "prep") return "bg-white border-2 border-dashed border-plum-600 text-plum-800";
  return b.origin === "caught"
    ? "bg-gold-300 border border-gold-500 text-plum-950 shadow-sm"
    : "bg-gold-100 border-2 border-gold-400 text-plum-950 shadow-sm";
}
const originIcon = (o?: Origin) => (o === "caught" ? "♥ " : o === "new" ? "✨ " : "");

export function WeekWizard() {
  const { today, nowMinutes, profile, saveProfile, catches, opportunities, setView } = useStore();
  const [discovery, setDiscovery] = useState<Discovery>("mycatch");
  const [goal, setGoal] = useState<Goal>("balanced");
  const [offset, setOffset] = useState(1);
  const [state, setState] = useState<ScoreState>({ status: "idle" });
  const memo = useRef<Record<string, PlanScores>>({});

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREF_KEY) ?? "null");
      if (p?.discovery) setDiscovery(p.discovery);
      if (p?.goal) setGoal(p.goal);
    } catch {}
  }, []);
  const savePrefs = (p: { discovery?: Discovery; goal?: Goal }) => {
    try {
      const cur = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}");
      localStorage.setItem(PREF_KEY, JSON.stringify({ ...cur, ...p }));
    } catch {}
  };

  const weekStart = addDays(mondayOf(today), offset * 7);
  const caughtIds = Object.keys(catches).sort();
  const key = JSON.stringify([
    profile.interests, profile.academicFocus, profile.careerGoals, profile.commitments,
    profile.commuteMinutes, profile.weeklyActivities, discovery, goal, weekStart, caughtIds,
  ]);

  // Show a previously generated result instantly; never call Gemini automatically.
  useEffect(() => {
    const hit = memo.current[key] ?? loadCache()[key];
    setState(hit ? { status: "done", scores: hit, cached: true } : { status: "idle" });
  }, [key]);

  async function generate() {
    setState({ status: "loading" });
    const requestKey = key;
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile, discovery, goal, weekOffset: offset,
          caught: Object.fromEntries(Object.entries(catches).map(([id, c]) => [id, c.status])),
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const scores = (await res.json()) as PlanScores;
      memo.current[requestKey] = scores;
      if (scores.source === "gemini") {
        const cache = loadCache();
        const keys = Object.keys(cache);
        if (keys.length > 20) delete cache[keys[0]];
        cache[requestKey] = scores;
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch {}
      }
      setState((s) => (s.status === "loading" ? { status: "done", scores, cached: false } : s));
    } catch (e) {
      setState({ status: "error", error: e instanceof Error ? e.message : "Request failed" });
    }
  }

  const plan = useMemo(() => {
    if (state.status !== "done") return null;
    return planWeek({
      weekStart, discovery, goal, commitments: profile.commitments,
      commuteMinutes: profile.commuteMinutes, weeklyActivities: profile.weeklyActivities,
      catches, opportunities, scores: Object.fromEntries(state.scores.items.map((s) => [s.id, s])),
      today, nowMinutes,
    });
  }, [state, weekStart, discovery, goal, profile, catches, opportunities, today, nowMinutes]);

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const nCaught = plan?.selected.filter((s) => s.origin === "caught").length ?? 0;
  const nNew = (plan?.selected.length ?? 0) - nCaught;
  const setPref = (p: Partial<typeof profile>) => saveProfile({ ...profile, ...p });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-wider text-plum-600">Week Wizard</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-plum-900 md:text-4xl">Plan a week worth having</h1>
        <p className="mt-1 max-w-2xl text-slate-600">
          Catch first, but never catch only. Gemini ranks <strong>every</strong> opportunity for you, then fixed rules place them
          around your classes, commute and free time.
        </p>
      </header>

      <section className="space-y-5 rounded-3xl border border-lav-200 bg-white p-5 shadow-sm md:p-6" aria-label="Planning preferences">
        <div>
          <h2 className="mb-2 text-sm font-bold text-plum-900">1 · Discovery Preference</h2>
          <div role="radiogroup" aria-label="Discovery Preference" className="grid gap-3 md:grid-cols-3">
            {DISCOVERY.map((d) => (
              <button
                key={d.id} role="radio" aria-checked={discovery === d.id} onClick={() => { setDiscovery(d.id); savePrefs({ discovery: d.id }); }}
                className={`rounded-2xl border p-4 text-left transition ${discovery === d.id ? "border-plum-800 bg-plum-800 text-white shadow-md" : "border-lav-200 bg-lav-50 text-plum-900 hover:border-plum-600"}`}
              >
                <span className="text-lg" aria-hidden>{d.icon}</span> <span className="font-bold">{d.title}</span>
                <span className={`mt-1 block text-sm ${discovery === d.id ? "text-lav-100" : "text-slate-600"}`}>{d.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold text-plum-900">2 · Weekly Goal</h2>
          <div role="radiogroup" aria-label="Weekly Goal" className="grid gap-3 md:grid-cols-3">
            {GOALS.map((g) => (
              <button
                key={g.id} role="radio" aria-checked={goal === g.id} onClick={() => { setGoal(g.id); savePrefs({ goal: g.id }); }}
                className={`rounded-2xl border p-4 text-left transition ${goal === g.id ? "border-gold-500 bg-gold-300 text-plum-950 shadow-md" : "border-lav-200 bg-lav-50 text-plum-900 hover:border-gold-400"}`}
              >
                <span className="font-bold">{g.title}</span>
                <span className="mt-1 block text-sm text-slate-700">{g.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-lav-100 pt-4">
          <label className="text-sm font-semibold text-plum-900">
            Commute (min, one way)
            <input
              type="number" min={0} max={90} step={5} value={profile.commuteMinutes}
              onChange={(e) => setPref({ commuteMinutes: Math.max(0, Math.min(90, Number(e.target.value) || 0)) })}
              className="mt-1 block w-28 rounded-lg border border-lav-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="text-sm font-semibold text-plum-900">
            Extra activities per week
            <select
              value={profile.weeklyActivities}
              onChange={(e) => setPref({ weeklyActivities: Number(e.target.value) })}
              className="mt-1 block w-28 rounded-lg border border-lav-300 bg-white px-3 py-2 font-normal"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setOffset(offset - 1)} aria-label="Previous week" className="rounded-full border border-lav-300 px-3 py-2 hover:bg-lav-100">←</button>
            <span className="min-w-36 text-center font-semibold text-plum-900">{formatDate(weekStart)} – {formatDate(addDays(weekStart, 4))}</span>
            <button onClick={() => setOffset(offset + 1)} aria-label="Next week" className="rounded-full border border-lav-300 px-3 py-2 hover:bg-lav-100">→</button>
          </div>
          <button
            onClick={generate} disabled={state.status === "loading"}
            className="ml-auto rounded-full bg-gold-300 px-7 py-3 font-extrabold text-plum-950 shadow-md hover:bg-gold-400 disabled:opacity-60"
          >
            {state.status === "loading" ? "Gemini is planning…" : state.status === "done" ? "↻ Regenerate My Week" : "✨ Generate My Week"}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Sent to Gemini: your interests, goals, class times, commute minutes and these choices. No addresses or names. Results are cached, so unchanged choices reuse the saved plan.
        </p>
      </section>

      {state.status === "error" && (
        <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">Could not generate a plan: {state.error}</div>
      )}
      {state.status === "loading" && (
        <div role="status" className="rounded-2xl bg-lav-100 p-4 text-sm text-plum-800">✨ Gemini is scoring every opportunity for your week…</div>
      )}

      {state.status === "done" && (
        state.scores.source === "gemini" ? (
          <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">
            ✨ <strong>Plan guided by Google Gemini</strong> ({state.scores.model}){state.cached ? " · loaded from your saved result" : ""}. Times, conflicts and deadlines are checked by fixed rules. Verify details with official sources.
          </div>
        ) : (
          <div role="status" className="rounded-2xl bg-gold-100 p-3 text-sm text-[#6b4a00]">
            ⚠ <strong>Fallback planning — not AI.</strong> Gemini was unavailable ({state.scores.note}), so selections use simple interest matching. Press Regenerate to try Gemini again.
          </div>
        )
      )}

      {!plan && state.status !== "loading" && (
        <div className="rounded-3xl border-2 border-dashed border-lav-300 bg-white p-10 text-center">
          <p className="text-4xl" aria-hidden>🗓</p>
          <h2 className="mt-2 text-xl font-extrabold text-plum-900">Your week is a blank canvas</h2>
          <p className="mx-auto mt-1 max-w-xl text-slate-600">
            Choose a Discovery Preference and a Weekly Goal, then press <strong>Generate My Week</strong>.
            You don&apos;t need to have caught anything. {Object.keys(catches).length === 0 && "Your My Catch list is empty, so Gator Radar will suggest everything fresh."}
          </p>
          {Object.keys(catches).length === 0 && (
            <button onClick={() => setView("discover")} className="mt-3 text-sm font-semibold text-plum-700 underline">Or browse Discover first</button>
          )}
        </div>
      )}

      {plan && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              [String(plan.selected.length) + "/" + plan.target, "activities planned"],
              ["♥ " + nCaught, "from My Catch"],
              ["✨ " + nNew, "newly discovered"],
              [plan.freeHours + " h", "free weekday time (9–6)"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl border border-lav-200 bg-white p-4 shadow-sm">
                <p className="text-2xl font-extrabold text-plum-900">{n}</p>
                <p className="text-xs font-medium text-slate-600">{l}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-medium" aria-label="Legend">
            <span className="rounded-md border border-lav-300 bg-lav-100 px-2 py-1">Fixed class / commitment</span>
            <span className="rounded-md border border-gold-500 bg-gold-300 px-2 py-1">♥ Caught · official time</span>
            <span className="rounded-md border-2 border-gold-400 bg-gold-100 px-2 py-1">✨ New suggestion · official time</span>
            <span className="rounded-md border-2 border-dashed border-plum-600 bg-white px-2 py-1">Optional prep (suggested)</span>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-lav-200 bg-white shadow-sm">
            <div className="grid min-w-[680px]" style={{ gridTemplateColumns: "56px repeat(5, 1fr)" }}>
              <div />
              {DAYS.map((d, i) => (
                <div key={d} className="border-l border-lav-100 bg-lav-50 py-2.5 text-center text-sm font-bold text-plum-900">
                  {d} <span className="font-normal text-slate-500">{formatDate(addDays(weekStart, i), { month: "numeric", day: "numeric" })}</span>
                </div>
              ))}
              <div>
                {hours.map((h) => (
                  <div key={h} className="pr-2 pt-0.5 text-right text-[11px] text-slate-500" style={{ height: PX }}>
                    {formatTime(h * 60).replace(":00", "")}
                  </div>
                ))}
              </div>
              {DAYS.map((d, di) => (
                <div key={d} className="relative border-l border-lav-100" style={{ height: (HOUR_END - HOUR_START) * PX }}>
                  {hours.map((h) => <div key={h} className="border-t border-lav-100" style={{ height: PX }} />)}
                  {plan.blocks.filter((b) => b.day === di).map((b) => (
                    <div
                      key={b.id}
                      title={`${b.title} ${formatTime(b.start)}–${formatTime(b.end)}`}
                      className={`absolute inset-x-1 overflow-hidden rounded-xl px-2 py-1 text-[11px] leading-tight ${blockStyle(b)}`}
                      style={{ top: ((b.start - HOUR_START * 60) / 60) * PX + 1, height: Math.max(((b.end - b.start) / 60) * PX - 2, 20) }}
                    >
                      <strong className="block">{originIcon(b.origin)}{b.title}</strong>
                      <span className="opacity-80">{formatTime(b.start)}–{formatTime(b.end)}{b.type === "prep" ? " · optional" : ""}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <section>
            <h2 className="mb-3 text-xl font-extrabold text-plum-900">Why these picks</h2>
            {plan.selected.length === 0 ? (
              <p className="text-slate-600">Nothing fit this week without crowding your schedule. Try another week or fewer commitments.</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {plan.selected.map((s) => (
                  <li key={s.opp.id} className="rounded-2xl border border-lav-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.origin === "caught" ? <Badge tone="gold">♥ From My Catch</Badge> : <Badge tone="lav">✨ New for you</Badge>}
                      <Badge tone="gray">{s.opp.kind === "event" ? "Event" : "Application"}</Badge>
                    </div>
                    <h3 className="mt-2 font-bold text-plum-900">{s.opp.title}</h3>
                    <p className="text-sm text-slate-700">{s.reason}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {s.opp.kind === "event"
                        ? `Official time: ${formatDate(s.opp.date!, { weekday: "short", month: "short", day: "numeric" })}, ${formatTime(s.opp.start!)}–${formatTime(s.opp.end!)}`
                        : `Apply by ${formatDate(s.opp.deadline!)} · ${s.prepPlaced} of ${s.prepWanted} optional prep blocks scheduled`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-live="polite">
            <h2 className="mb-1 text-xl font-extrabold text-plum-900">Caught, but not in this plan</h2>
            <p className="mb-3 text-sm text-slate-600">We never silently drop something you saved.</p>
            {plan.skipped.length === 0 ? (
              <p className="text-sm text-slate-600">
                {Object.keys(catches).length === 0 ? "You haven't caught anything yet, so there is nothing to explain." : "Every caught opportunity is in the plan."}
              </p>
            ) : (
              <ul className="space-y-2">
                {plan.skipped.map((u) => (
                  <li key={u.opp.id} className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                    <strong>♥ {u.opp.title}:</strong> {u.reason}
                  </li>
                ))}
              </ul>
            )}
            {plan.otherNotFit > 0 && (
              <p className="mt-2 text-xs text-slate-500">{plan.otherNotFit} other new opportunities don&apos;t fit this week (conflicts, wrong week, or passed deadlines).</p>
            )}
          </section>
        </>
      )}
      <p className="text-xs text-slate-500">
        Opportunities are fictional demo records, not verified SFSU listings. Official event times are never changed; commute buffers and a 2-activities-per-day free-time guard are applied by fixed rules.
      </p>
    </div>
  );
}
