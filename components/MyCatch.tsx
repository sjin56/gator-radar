"use client";

import { Badge, DeadlineBadge, whenText } from "@/components/ui";
import { daysBetween } from "@/lib/dates";
import { useStore } from "@/lib/store";
import type { CatchStatus } from "@/lib/types";

const STATUSES: CatchStatus[] = ["Saved", "Planning to Apply", "Applied"];

export function MyCatch() {
  const { opportunities, catches, toggleCatch, setStatus, setView, today } = useStore();
  const items = opportunities
    .filter((o) => catches[o.id])
    .sort((a, b) => (a.deadline ?? a.date ?? "").localeCompare(b.deadline ?? b.date ?? ""));
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-plum-600">My Catch</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-plum-900 md:text-4xl">Your saved opportunities</h1>
          <p className="text-slate-600">Saved opportunities, statuses, and deadlines. Stored in this browser.</p>
        </div>
        <button
          onClick={() => setView("wizard")}
          disabled={items.length === 0}
          className="rounded-full bg-plum-800 px-5 py-2.5 font-semibold text-white hover:bg-plum-700 disabled:opacity-40"
        >
          Plan my week →
        </button>
      </header>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-lav-300 bg-white p-8 text-center">
          <p className="font-semibold text-plum-900">Nothing caught yet.</p>
          <p className="text-sm text-slate-600">Tap the heart on any opportunity in Discover to save it here.</p>
          <button onClick={() => setView("discover")} className="mt-3 rounded-full bg-gold-300 px-4 py-2 font-semibold text-plum-900">Go to Discover</button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((o) => {
            const rec = catches[o.id];
            const n = o.deadline ? daysBetween(today, o.deadline) : null;
            return (
              <li key={o.id} className="flex flex-wrap items-center gap-4 rounded-3xl border border-lav-200 bg-white p-5 shadow-[0_2px_14px_rgba(76,47,160,0.08)]">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-plum-900">{o.title}</h2>
                    {o.kind === "event" ? <Badge tone="plum">Event</Badge> : <Badge tone="gold">Application</Badge>}
                    {o.deadline && rec.status !== "Applied" && <DeadlineBadge deadline={o.deadline} today={today} />}
                    {rec.status === "Applied" && <Badge tone="green">Applied ✓</Badge>}
                  </div>
                  <p className="text-sm text-slate-600">
                    {whenText(o)}
                    {n !== null && rec.status !== "Applied" && n >= 0 && ` · ${n} day${n === 1 ? "" : "s"} remaining`}
                  </p>
                </div>
                {o.kind === "application" ? (
                  <label className="text-sm">
                    <span className="mr-2 font-semibold text-plum-800">Status</span>
                    <select
                      value={rec.status}
                      onChange={(e) => setStatus(o.id, e.target.value as CatchStatus)}
                      className="rounded-lg border border-lav-300 bg-white px-2 py-1.5"
                    >
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                ) : (
                  <Badge tone="lav">Saved</Badge>
                )}
                <button onClick={() => toggleCatch(o.id)} className="rounded-full border border-lav-300 px-3 py-1.5 text-sm font-semibold text-plum-800 hover:bg-lav-100">
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
