"use client";

import type { ReactNode } from "react";
import { daysBetween, formatDate, formatTime } from "@/lib/dates";
import { findConflict } from "@/lib/schedule";
import { useStore } from "@/lib/store";
import type { Opportunity, Recommendation } from "@/lib/types";

export function Badge({ children, tone = "lav" }: { children: ReactNode; tone?: "lav" | "gold" | "red" | "green" | "gray" | "plum" }) {
  const tones = {
    lav: "bg-lav-100 text-plum-800",
    gold: "bg-gold-100 text-[#7a5600]",
    red: "bg-red-100 text-red-800",
    green: "bg-emerald-100 text-emerald-800",
    gray: "bg-slate-100 text-slate-700",
    plum: "bg-plum-800 text-white",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function matchBadge(score: number) {
  if (score >= 75) return <Badge tone="green">High Match</Badge>;
  if (score >= 50) return <Badge tone="lav">Good Match</Badge>;
  return <Badge tone="gray">Possible Match</Badge>;
}

export function daysLeft(deadline: string, today: string) {
  return daysBetween(today, deadline);
}

export function DeadlineBadge({ deadline, today }: { deadline: string; today: string }) {
  const n = daysLeft(deadline, today);
  if (n < 0) return <Badge tone="gray">Deadline passed</Badge>;
  if (n === 0) return <Badge tone="red">Due today</Badge>;
  if (n === 1) return <Badge tone="red">Due tomorrow</Badge>;
  if (n <= 3) return <Badge tone="red">Deadline in {n} days</Badge>;
  if (n <= 7) return <Badge tone="gold">Deadline in {n} days</Badge>;
  return <Badge tone="lav">{n} days left</Badge>;
}

export function whenText(o: Opportunity) {
  if (o.kind === "event" && o.date)
    return `${formatDate(o.date, { weekday: "short", month: "short", day: "numeric" })} · ${formatTime(o.start!)}–${formatTime(o.end!)}`;
  if (o.deadline) return `Apply by ${formatDate(o.deadline, { weekday: "short", month: "short", day: "numeric" })}`;
  return "";
}

export function HeartButton({ id, title }: { id: string; title: string }) {
  const { catches, toggleCatch } = useStore();
  const on = Boolean(catches[id]);
  return (
    <button
      onClick={() => toggleCatch(id)}
      aria-pressed={on}
      aria-label={on ? `Remove ${title} from My Catch` : `Catch ${title}`}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-lg transition ${
        on ? "border-gold-400 bg-gold-300 text-plum-900" : "border-lav-200 bg-white text-plum-700 hover:bg-lav-100"
      }`}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}

export function OpportunityCard({ o, rec }: { o: Opportunity; rec?: Recommendation }) {
  const { today, catches, toggleCatch, countFor, countsMode, profile } = useStore();
  const caught = Boolean(catches[o.id]);
  const conflict = findConflict(o, profile.commitments);
  const count = countFor(o.id);
  return (
    <article className="flex flex-col gap-3 rounded-3xl border border-lav-200 bg-white p-5 shadow-[0_2px_14px_rgba(76,47,160,0.08)] transition hover:shadow-[0_6px_22px_rgba(76,47,160,0.14)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {rec && matchBadge(rec.score)}
          {o.kind === "application" && o.deadline ? <DeadlineBadge deadline={o.deadline} today={today} /> : <Badge tone="plum">Event</Badge>}
          {conflict && <Badge tone="red">Clashes with {conflict}</Badge>}
        </div>
        <HeartButton id={o.id} title={o.title} />
      </div>
      <div>
        <h3 className="text-lg font-extrabold leading-snug text-plum-900">{o.title}</h3>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-plum-600">
          {o.category} · {o.kind === "application" ? "Application" : o.typeLabel}
        </p>
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{o.description}</p>
      {rec?.reason && (
        <p className="rounded-2xl bg-lav-50 px-3 py-2.5 text-sm leading-snug text-plum-900">
          <span aria-hidden>✨ </span>
          <span className="font-semibold">Why you: </span>
          {rec.reason}
        </p>
      )}
      <ul className="space-y-0.5 text-xs text-slate-600">
        <li>🗓 {whenText(o)}</li>
        <li>📍 {o.format} · {o.location.replace(" (demo)", "")}</li>
      </ul>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-lav-100 pt-3">
        <span
          className="text-xs font-semibold text-plum-700"
          title={countsMode === "demo" ? "Illustrative demo number. The shared database is not connected." : "Active catches from anonymous browsers"}
        >
          ♥ {count.total} catches{countsMode === "demo" ? " · demo" : ""}
        </span>
        <button
          onClick={() => toggleCatch(o.id)}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            caught ? "bg-gold-300 text-plum-950 hover:bg-gold-400" : "bg-plum-800 text-white hover:bg-plum-700"
          }`}
        >
          {caught ? "Caught ✓" : "Catch This →"}
        </button>
      </div>
    </article>
  );
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-2xl font-extrabold tracking-tight text-plum-900">{children}</h2>
      {sub && <p className="mt-0.5 text-sm text-slate-600">{sub}</p>}
    </div>
  );
}

/** Honest, low-key disclosure used across pages. */
export function DemoNote() {
  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-[#6b4a00]">
      <span aria-hidden>●</span> Demo data: opportunities are fictional samples, not verified SFSU listings.
    </p>
  );
}
