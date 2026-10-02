"use client";

import { useMemo, useState } from "react";
import { addDays, formatDate, formatTime, mondayOf } from "@/lib/dates";
import { buildPlan, type Block, type PlanMode } from "@/lib/schedule";
import { useStore } from "@/lib/store";

const HOUR_START = 8;
const HOUR_END = 20;
const PX = 48; // pixels per hour
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const MODES: { id: PlanMode; label: string; blurb: string }[] = [
  { id: "career", label: "Career Week", blurb: "Prioritizes research, internships, scholarships, and extra prep time." },
  { id: "social", label: "Social Week", blurb: "Prioritizes student life, wellness, and volunteering; minimal prep time." },
  { id: "balanced", label: "Balanced Week", blurb: "Treats all saved opportunities equally." },
];

const blockStyle: Record<Block["type"], string> = {
  class: "bg-lav-200 text-plum-900 border border-lav-300",
  event: "bg-gold-300 text-plum-950 border border-gold-500",
  prep: "bg-white text-plum-800 border-2 border-dashed border-plum-600",
};

export function WeekWizard() {
  const { today, nowMinutes, profile, catches, opportunities, setView } = useStore();
  const [mode, setMode] = useState<PlanMode>("balanced");
  const [offset, setOffset] = useState(1); // 0 = this week, 1 = next week
  const weekStart = addDays(mondayOf(today), offset * 7);
  const plan = useMemo(
    () => buildPlan({ weekStart, mode, commitments: profile.commitments, catches, opportunities, today, nowMinutes }),
    [weekStart, mode, profile.commitments, catches, opportunities, today, nowMinutes],
  );
  const savedCount = Object.keys(catches).length;
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const current = MODES.find((m) => m.id === mode)!;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-extrabold text-plum-900">Week Wizard</h1>
        <p className="text-slate-600">
          Your classes, official event times, and suggested prep blocks, planned with fixed rules (no AI guessing of times).
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Plan variation" className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${mode === m.id ? "border-plum-800 bg-plum-800 text-white" : "border-lav-300 bg-white text-plum-800 hover:bg-lav-100"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <button onClick={() => setOffset(offset - 1)} aria-label="Previous week" className="rounded-full border border-lav-300 bg-white px-3 py-1.5">←</button>
          <span className="font-semibold text-plum-900">
            {formatDate(weekStart)} – {formatDate(addDays(weekStart, 4))}
          </span>
          <button onClick={() => setOffset(offset + 1)} aria-label="Next week" className="rounded-full border border-lav-300 bg-white px-3 py-1.5">→</button>
        </div>
      </div>
      <p className="text-sm text-slate-600">{current.blurb}</p>

      {savedCount === 0 && (
        <div className="rounded-xl bg-gold-100 p-3 text-sm text-[#6b4a00]">
          You haven&apos;t caught anything yet, so only your classes are shown.{" "}
          <button className="font-semibold underline" onClick={() => setView("discover")}>Find opportunities</button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="rounded bg-lav-200 px-2 py-1">Class / fixed commitment</span>
        <span className="rounded bg-gold-300 px-2 py-1">Official event time</span>
        <span className="rounded border-2 border-dashed border-plum-600 bg-white px-2 py-1">Suggested prep time (optional)</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-lav-200 bg-white">
        <div className="grid min-w-[640px]" style={{ gridTemplateColumns: "56px repeat(5, 1fr)" }}>
          <div />
          {DAYS.map((d, i) => (
            <div key={d} className="border-l border-lav-100 py-2 text-center text-sm font-bold text-plum-900">
              {d} <span className="font-normal text-slate-500">{formatDate(addDays(weekStart, i), { month: "numeric", day: "numeric" })}</span>
            </div>
          ))}
          <div>
            {hours.map((h) => (
              <div key={h} className="pr-2 text-right text-[11px] text-slate-500" style={{ height: PX }}>
                {formatTime(h * 60).replace(":00", "")}
              </div>
            ))}
          </div>
          {DAYS.map((d, di) => (
            <div key={d} className="relative border-l border-lav-100" style={{ height: (HOUR_END - HOUR_START) * PX }}>
              {hours.map((h) => (
                <div key={h} className="border-t border-lav-100" style={{ height: PX }} />
              ))}
              {plan.blocks
                .filter((b) => b.day === di)
                .map((b) => (
                  <div
                    key={b.id}
                    title={`${b.title} ${formatTime(b.start)}–${formatTime(b.end)}`}
                    className={`absolute inset-x-0.5 overflow-hidden rounded-lg px-1.5 py-0.5 text-[11px] leading-tight ${blockStyle[b.type]}`}
                    style={{
                      top: ((b.start - HOUR_START * 60) / 60) * PX,
                      height: Math.max(((b.end - b.start) / 60) * PX - 2, 18),
                    }}
                  >
                    <strong>{b.title}</strong>
                    <br />
                    {formatTime(b.start)}–{formatTime(b.end)}
                    {b.type === "prep" && " · suggested"}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>

      <section aria-live="polite">
        <h2 className="mb-2 text-lg font-bold text-plum-900">What didn&apos;t fit, and why</h2>
        {plan.unplaced.length === 0 ? (
          <p className="text-sm text-slate-600">Everything you caught fits this week with no conflicts.</p>
        ) : (
          <ul className="space-y-2">
            {plan.unplaced.map((u, i) => (
              <li key={u.oppId + i} className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                <strong>{u.title}:</strong> {u.reason}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-slate-500">
        Event times come from the opportunity records (demo data here). Prep blocks are only suggestions, spaced one per day before each deadline.
      </p>
    </div>
  );
}
