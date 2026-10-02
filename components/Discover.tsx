"use client";

import { useMemo, useState } from "react";
import { DemoNote, OpportunityCard, SectionTitle } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Category, Opportunity } from "@/lib/types";

export function fmtWait(s: number) {
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.ceil(s / 60)} min`;
  return `${s}s`;
}
export function fmtWhen(iso?: string) {
  if (!iso) return "earlier";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }) + " PT";
}

export function RecsBanner() {
  const { recs, recsLoading, refreshRecs, cooldownLeft } = useStore();
  if (!recs) return <p role="status" className="rounded-2xl bg-lav-100 p-3 text-sm text-plum-800">Loading recommendations…</p>;
  const { result: r, origin, notice } = recs;
  const model = r.model ? ` (${r.model})` : "";
  const btnLabel = recsLoading
    ? "Asking Gemini…"
    : cooldownLeft > 0
      ? `Available in ${fmtWait(cooldownLeft)}`
      : origin === "fresh" || origin === "saved" || origin === "snapshot" ? "↻ Regenerate" : "✨ Get Gemini recommendations";
  const button = (cls: string) => (
    <button onClick={() => refreshRecs()} disabled={recsLoading || cooldownLeft > 0} className={`rounded-full border px-3 py-1 font-semibold disabled:opacity-60 ${cls}`}>
      {btnLabel}
    </button>
  );
  const warn = notice && <span className="block text-xs opacity-90">Could not refresh: {notice}</span>;
  if (origin === "fresh")
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">
        <span>✨ <strong>Fresh recommendations from Google Gemini</strong>{model}{r.shared ? " (shared result from earlier today)" : ""}. May be imperfect: verify with official sources.</span>
        {button("border-emerald-700")}
      </div>
    );
  if (origin === "saved")
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">
        <span>✨ <strong>Google Gemini recommendations</strong>{model}, saved {fmtWhen(r.capturedAt)} and reused to protect the free daily quota. May be imperfect.{warn}</span>
        {button("border-emerald-700")}
      </div>
    );
  if (origin === "snapshot")
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-lav-100 p-3 text-sm text-plum-900">
        <span>✨ <strong>Genuine Google Gemini output</strong>{model}, captured {fmtWhen(r.capturedAt)} for the demo student and saved in the app (no live call was made). Press Regenerate for a live result.{warn}</span>
        {button("border-plum-700")}
      </div>
    );
  if (origin === "stale")
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-lav-100 p-3 text-sm text-plum-900">
        <span>🕘 <strong>Showing your last genuine Gemini result</strong>{model} from {fmtWhen(r.capturedAt)}. Your profile may have changed since, so scores can be out of date.{warn}</span>
        {button("border-plum-700")}
      </div>
    );
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gold-100 p-3 text-sm text-[#6b4a00]">
      <span>⚠ <strong>Fallback mode — not AI.</strong> Simple interest matching is shown because no Gemini result is available yet.{r.note ? ` ${r.note}` : ""}</span>
      {button("border-[#6b4a00]")}
    </div>
  );
}

export function useRankedRecs() {
  const { recs, opportunities } = useStore();
  return useMemo(() => {
    if (!recs) return [];
    const byId = new Map<string, Opportunity>();
    for (const o of opportunities) if (o.recommendable && !byId.has(o.scoreKey)) byId.set(o.scoreKey, o);
    return recs.result.recommendations
      .map((r) => ({ rec: r, opp: byId.get(r.id) }))
      .filter((x): x is { rec: typeof x.rec; opp: Opportunity } => Boolean(x.opp));
  }, [recs, opportunities]);
}

/** Soft category diversity: many fitness sessions must not crowd out career, academic and social picks. */
export function topDiverse<T extends { rec: { score: number }; opp: { category: string } }>(ranked: T[], n: number): T[] {
  const pool = [...ranked];
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const adj = (x: T) => x.rec.score - 18 * out.filter((o) => o.opp.category === x.opp.category).length;
    pool.sort((a, b) => adj(b) - adj(a));
    out.push(pool.shift()!);
  }
  return out;
}

export function PopularThisWeek({ limit = 3 }: { limit?: number }) {
  const { opportunities, countFor, countsMode } = useStore();
  if (countsMode !== "firestore") return null; // no fabricated popularity in production
  const ranked = [...opportunities].sort((a, b) => countFor(b.id).week - countFor(a.id).week).slice(0, limit);
  return (
    <section>
      <SectionTitle
        sub={
          countsMode === "firestore"
            ? "Ranked by new active catches this Monday–Sunday (Pacific). Catches are anonymous browsers, not unique students."
            : "Illustrative demo numbers — the shared database is not connected, so these are NOT real community activity."
        }
      >
        Popular This Week
      </SectionTitle>
      <ol className="grid gap-3 md:grid-cols-3">
        {ranked.map((o, i) => (
          <li key={o.id} className="rounded-3xl border border-lav-200 bg-white p-5 shadow-[0_2px_14px_rgba(76,47,160,0.08)]">
            <p className="text-xs font-extrabold text-gold-500">#{i + 1}</p>
            <p className="font-bold text-plum-900">{o.title}</p>
            <p className="text-sm text-plum-700">♥ {countFor(o.id).week} this week · {countFor(o.id).total} total</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Discover() {
  const { opportunities } = useStore();
  const ranked = useRankedRecs();
  const [cat, setCat] = useState<Category | "All">("All");
  const [kind, setKind] = useState<"all" | "event" | "application">("all");
  const seenSeries = new Set<string>();
  const all = opportunities.filter((o) => (o.seriesId ? (seenSeries.has(o.seriesId) ? false : (seenSeries.add(o.seriesId), true)) : true)).filter((o) => (cat === "All" || o.category === cat) && (kind === "all" || o.kind === kind));
  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm font-bold uppercase tracking-wider text-plum-600">Discover</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-plum-900 md:text-4xl">Opportunities matched to you</h1>
        <p className="mt-1 text-slate-600">Ranked for your interests, goals and class schedule.</p>
        <div className="mt-2"><DemoNote /></div>
      </header>
      <RecsBanner />
      <section>
        <SectionTitle>Recommended For You</SectionTitle>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {topDiverse(ranked, 3).map(({ opp, rec }) => (
            <OpportunityCard key={opp.id} o={opp} rec={rec} />
          ))}
        </div>
      </section>
      <PopularThisWeek />
      <section>
        <SectionTitle>Explore All Opportunities</SectionTitle>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filters">
          {(["All", ...Array.from(new Set(opportunities.map((o) => o.category)))] as string[]).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c as Category | "All")}
              aria-pressed={cat === c}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${cat === c ? "border-plum-800 bg-plum-800 text-white" : "border-lav-300 bg-white text-plum-800 hover:bg-lav-100"}`}
            >
              {c}
            </button>
          ))}
          <span className="mx-1 w-px bg-lav-300" />
          {([["all", "All types"], ["event", "Events"], ["application", "Applications"]] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${kind === k ? "border-gold-400 bg-gold-300 text-plum-900" : "border-lav-300 bg-white text-plum-800 hover:bg-lav-100"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {all.length === 0 ? (
          <p className="text-slate-600">No opportunities match these filters.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {all.map((o) => (
              <OpportunityCard key={o.id} o={o} rec={ranked.find((r) => r.opp.scoreKey === o.scoreKey)?.rec} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
