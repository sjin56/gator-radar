"use client";

import { useState } from "react";
import { DAY_NAMES, formatTime, toHHMM, toMinutes } from "@/lib/dates";
import { recsSignature } from "@/lib/demoProfile";
import { DEMO_PROFILE, useStore } from "@/lib/store";
import { INTERESTS, type Commitment, type Interest, type Profile } from "@/lib/types";

const inputCls = "w-full rounded-lg border border-lav-300 bg-white px-3 py-2 text-sm";

export function ProfileView() {
  const { profile, saveProfile, resetDemoProfile, refreshRecs } = useStore();
  const [draft, setDraft] = useState<Profile>(profile);
  const [saved, setSaved] = useState(false);
  const patch = (p: Partial<Profile>) => {
    setDraft({ ...draft, ...p });
    setSaved(false);
  };
  const setC = (id: string, p: Partial<Commitment>) =>
    patch({ commitments: draft.commitments.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  const invalid = draft.commitments.some((c) => c.end <= c.start || !c.title.trim() || c.days.length === 0);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-wider text-plum-600">Student Profile</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-plum-900 md:text-4xl">About you</h1>
        <p className="text-slate-600">Prefilled with a fictional demo student. Edit anything, then save.</p>
      </header>

      <section className="rounded-3xl border border-lav-200 bg-white p-6 shadow-[0_2px_14px_rgba(76,47,160,0.08)]">
        <h2 className="font-bold text-plum-900">Interests</h2>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Interests">
          {INTERESTS.map((i) => {
            const on = draft.interests.includes(i);
            return (
              <button
                key={i}
                aria-pressed={on}
                onClick={() => patch({ interests: on ? draft.interests.filter((x) => x !== i) : [...draft.interests, i as Interest] })}
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${on ? "border-plum-800 bg-plum-800 text-white" : "border-lav-300 bg-white text-plum-800 hover:bg-lav-100"}`}
              >
                {on ? "✓ " : ""}{i}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-plum-900">
            Major / academic focus
            <input className={`${inputCls} mt-1 font-normal`} value={draft.academicFocus} maxLength={200} onChange={(e) => patch({ academicFocus: e.target.value })} />
          </label>
          <label className="text-sm font-semibold text-plum-900">
            Career goals
            <textarea className={`${inputCls} mt-1 font-normal`} rows={3} value={draft.careerGoals} maxLength={500} onChange={(e) => patch({ careerGoals: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-lav-200 bg-white p-6 shadow-[0_2px_14px_rgba(76,47,160,0.08)]">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-plum-900">Class schedule &amp; fixed commitments</h2>
          <button
            onClick={() => patch({ commitments: [...draft.commitments, { id: `c${Date.now()}`, title: "New class", days: [1], start: 540, end: 600, kind: "class" }] })}
            className="rounded-full bg-plum-800 px-3 py-1.5 text-sm font-semibold text-white"
          >
            + Add
          </button>
        </div>
        <ul className="mt-3 space-y-3">
          {draft.commitments.map((c) => (
            <li key={c.id} className="grid gap-3 rounded-xl bg-lav-50 p-3 md:grid-cols-[1.4fr_auto_auto_auto_auto] md:items-end">
              <label className="text-xs font-semibold text-plum-900">
                Title
                <input className={`${inputCls} mt-1 font-normal`} value={c.title} maxLength={60} onChange={(e) => setC(c.id, { title: e.target.value })} />
              </label>
              <fieldset>
                <legend className="text-xs font-semibold text-plum-900">Days</legend>
                <div className="mt-1 flex gap-1">
                  {[1, 2, 3, 4, 5].map((d) => {
                    const on = c.days.includes(d);
                    return (
                      <button
                        key={d}
                        aria-pressed={on}
                        aria-label={DAY_NAMES[d]}
                        onClick={() => setC(c.id, { days: on ? c.days.filter((x) => x !== d) : [...c.days, d].sort() })}
                        className={`h-9 w-10 rounded-lg border text-xs font-semibold ${on ? "border-plum-800 bg-plum-800 text-white" : "border-lav-300 bg-white text-plum-800"}`}
                      >
                        {DAY_NAMES[d]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <label className="text-xs font-semibold text-plum-900">
                Start
                <input type="time" className={`${inputCls} mt-1 font-normal`} value={toHHMM(c.start)} onChange={(e) => e.target.value && setC(c.id, { start: toMinutes(e.target.value) })} />
              </label>
              <label className="text-xs font-semibold text-plum-900">
                End
                <input type="time" className={`${inputCls} mt-1 font-normal`} value={toHHMM(c.end)} onChange={(e) => e.target.value && setC(c.id, { end: toMinutes(e.target.value) })} />
              </label>
              <button onClick={() => patch({ commitments: draft.commitments.filter((x) => x.id !== c.id) })} className="rounded-lg border border-lav-300 bg-white px-3 py-2 text-sm font-semibold text-plum-800">
                Remove
              </button>
              {c.end <= c.start && <p className="text-xs text-red-700 md:col-span-5">End time must be after start time ({formatTime(c.start)}).</p>}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={invalid}
          onClick={() => {
            const next = { ...draft, commitments: draft.commitments.map((c) => ({ ...c, title: c.title.trim() })) };
            const changed = recsSignature(next) !== recsSignature(profile);
            saveProfile(next);
            setSaved(true);
            if (changed) refreshRecs(next, false); // explicit user action: one live call only if the recommendation inputs changed
          }}
          className="rounded-full bg-gold-300 px-6 py-2.5 font-bold text-plum-900 hover:bg-gold-400 disabled:opacity-40"
        >
          Save profile &amp; refresh recommendations
        </button>
        <button
          onClick={() => {
            resetDemoProfile();
            setDraft(DEMO_PROFILE);
            setSaved(true);
          }}
          className="rounded-full border border-lav-300 bg-white px-4 py-2.5 text-sm font-semibold text-plum-800"
        >
          Reset to demo student
        </button>
        {invalid && <span className="text-sm text-red-700">Every commitment needs a title, at least one day, and an end time after its start.</span>}
        {saved && <span role="status" className="text-sm font-semibold text-emerald-700">Saved ✓</span>}
      </div>

      <aside className="rounded-2xl border border-gold-300 bg-gold-100/60 p-5 text-sm text-slate-800" aria-labelledby="privacy">
        <h2 id="privacy" className="font-bold text-plum-900">Data Privacy &amp; Ethics Note</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Your profile, class schedule, and saved opportunities are stored in <strong>this browser (localStorage)</strong> by default.</li>
          <li>To personalize recommendations, only your interests, academic focus, career goals, and commitment times/titles are sent securely to a Gemini API call through our server. Nothing else is sent.</li>
          <li>If the shared database is enabled, an anonymous random browser ID and your catch activity (which opportunity, when) are stored separately to power community &ldquo;catch&rdquo; counts. Counts show anonymous browsers, not unique students.</li>
          <li>No name, SFSU credentials, or login is required. Don&apos;t type sensitive personal details into free-text fields.</li>
          <li>AI recommendations can be imperfect. Always verify opportunities, times, eligibility, and deadlines with the official source.</li>
        </ul>
      </aside>
    </div>
  );
}
