"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { laNow } from "./dates";
import { DEMO_PROFILE, isDemoProfile, recsSignature } from "./demoProfile";
import { buildOpportunities, DATASET_ID } from "./opportunities";
import { asFallback } from "./recommend";
import { DEMO_RECS_SNAPSHOT } from "./snapshot";
import type { CatchRecord, CatchStatus, Opportunity, Profile, RecsResult } from "./types";

export { DEMO_PROFILE };
export type View = "home" | "discover" | "catch" | "wizard" | "profile";
export type Counts = Record<string, { total: number; week: number }>;

/**
 * Where the recommendations on screen came from:
 *  fresh    – Gemini answered just now
 *  saved    – an earlier genuine Gemini result for exactly these inputs (browser cache)
 *  snapshot – genuine Gemini output captured earlier for the demo student (shipped with the app)
 *  stale    – last genuine Gemini result, but the inputs have changed since
 *  fallback – no genuine Gemini result available: simple keyword matching (NOT AI)
 */
export type RecsOrigin = "fresh" | "saved" | "snapshot" | "stale" | "fallback";
export type RecsView = { result: RecsResult; origin: RecsOrigin; notice?: string };

type Store = {
  ready: boolean;
  today: string;
  nowMinutes: number;
  opportunities: Opportunity[];
  view: View;
  setView: (v: View) => void;
  profile: Profile;
  saveProfile: (p: Profile) => void;
  resetDemoProfile: () => void;
  catches: Record<string, CatchRecord>;
  toggleCatch: (id: string) => void;
  setStatus: (id: string, s: CatchStatus) => void;
  recs: RecsView | null;
  recsLoading: boolean;
  /** Explicit user action only. Never called automatically. */
  refreshRecs: (p?: Profile, force?: boolean) => void;
  /** The latest genuine Gemini recommendation result available (any origin), if any. */
  genuineRecs: RecsResult | null;
  cooldownLeft: number;
  startCooldown: (seconds: number) => void;
  counts: Counts;
  countsMode: "firestore" | "demo";
  /** displayed total / week count, including the viewer's own catch in demo mode */
  countFor: (id: string) => { total: number; week: number };
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider missing");
  return s;
};

const K = {
  profile: "gr.profile.v1", catches: "gr.catches.v1", visitor: "gr.visitor.v1",
  recs: `gr.recs.${DATASET_ID}`, lastRecs: `gr.recs.last.${DATASET_ID}`, cool: "gr.cooldown.v1",
};
const MAX_COOLDOWN_S = 3 * 3600;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: app still works for this session */
  }
}
function newVisitorId() {
  try {
    const existing = localStorage.getItem(K.visitor);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(K.visitor, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("2000-01-01");
  const [nowMinutes, setNowMinutes] = useState(0);
  const [view, setView] = useState<View>("home");
  const [profile, setProfile] = useState<Profile>(DEMO_PROFILE);
  const [catches, setCatches] = useState<Record<string, CatchRecord>>({});
  const [recs, setRecs] = useState<RecsView | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [tick, setTick] = useState(0);
  const [counts, setCounts] = useState<Counts>({});
  const [countsMode, setCountsMode] = useState<"firestore" | "demo">("demo");
  const visitorId = useRef("");
  const catchesRef = useRef<Record<string, CatchRecord>>({});
  const inflight = useRef(false);

  const opportunities = useMemo(() => buildOpportunities(today), [today]);

  const loadCounts = useCallback(async () => {
    try {
      const r = await fetch("/api/catches", { cache: "no-store" });
      const j = await r.json();
      setCounts(j.counts);
      setCountsMode(j.mode === "firestore" ? "firestore" : "demo");
    } catch {
      /* keep previous counts */
    }
  }, []);

  // Cooldown: persisted so a reload cannot be used to hammer the API.
  const startCooldown = useCallback((seconds: number) => {
    const until = Date.now() + Math.min(Math.max(seconds, 0), MAX_COOLDOWN_S) * 1000;
    write(K.cool, until);
    setCooldownUntil(until);
  }, []);
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      if (Date.now() >= cooldownUntil) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)) + 0 * tick;

  useEffect(() => {
    const n = laNow();
    setToday(n.date);
    setNowMinutes(n.minutes);
    setProfile({ ...DEMO_PROFILE, ...read<Partial<Profile>>(K.profile, {}) });
    // drop catches that belong to the retired fictional dataset
    const known = new Set(buildOpportunities().map((o) => o.id));
    const saved = Object.fromEntries(Object.entries(read<Record<string, CatchRecord>>(K.catches, {})).filter(([id]) => known.has(id)));
    write(K.catches, saved);
    catchesRef.current = saved;
    setCatches(saved);
    setCooldownUntil(read<number>(K.cool, 0));
    visitorId.current = newVisitorId();
    setReady(true);
    loadCounts();
  }, [loadCounts]);

  const keyFor = (p: Profile, _date: string) => JSON.stringify([DATASET_ID, recsSignature(p)]);

  /** Choose what to show WITHOUT any network call. */
  const resolveRecs = useCallback(
    (p: Profile, date: string, opps: Opportunity[]): RecsView => {
      const exact = read<{ key: string; result: RecsResult } | null>(K.recs, null);
      if (exact && exact.key === keyFor(p, date)) return { result: exact.result, origin: "saved" };
      if (isDemoProfile(p) && DEMO_RECS_SNAPSHOT) return { result: DEMO_RECS_SNAPSHOT, origin: "snapshot" };
      const last = read<{ result: RecsResult } | null>(K.lastRecs, null);
      if (last) return { result: last.result, origin: "stale" };
      return { result: asFallback(p, opps, "No Gemini result has been generated for this profile yet."), origin: "fallback" };
    },
    [],
  );

  // Show cached/snapshot data whenever inputs change. This never calls the API.
  useEffect(() => {
    if (ready) setRecs(resolveRecs(profile, today, opportunities));
  }, [ready, profile, today, opportunities, resolveRecs]);

  const refreshRecs = useCallback(
    async (pOverride?: Profile, force = true) => {
      const p = pOverride ?? profile;
      if (inflight.current) return; // duplicate clicks / re-renders cannot start a second request
      if (!force) {
        const exact = read<{ key: string } | null>(K.recs, null);
        if (exact && exact.key === keyFor(p, today)) return; // already have a genuine result for these inputs
      }
      if (Math.ceil((read<number>(K.cool, 0) - Date.now()) / 1000) > 0) return; // cooling down
      inflight.current = true;
      setRecsLoading(true);
      try {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: p }),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const result = (await res.json()) as RecsResult;
        if (result.source === "gemini") {
          write(K.recs, { key: keyFor(p, today), result });
          write(K.lastRecs, { result });
          setRecs({ result, origin: "fresh" });
          startCooldown(15); // anti-spam pause after a successful call
        } else {
          startCooldown(result.retryAfter ?? 45);
          const shown = resolveRecs(p, today, opportunities);
          setRecs(
            shown.origin === "fallback"
              ? { result, origin: "fallback", notice: result.note }
              : { ...shown, notice: result.note },
          );
        }
      } catch (e) {
        startCooldown(30);
        const shown = resolveRecs(p, today, opportunities);
        setRecs({ ...shown, notice: `Could not reach the server (${e instanceof Error ? e.message : "network error"}).` });
      } finally {
        inflight.current = false;
        setRecsLoading(false);
      }
    },
    [profile, today, opportunities, resolveRecs, startCooldown],
  );

  const genuineRecs = useMemo<RecsResult | null>(() => {
    if (recs?.result.source === "gemini") return recs.result;
    return null;
  }, [recs]);

  const saveProfile = useCallback((p: Profile) => {
    setProfile(p);
    write(K.profile, p);
  }, []);

  const postCatch = (opportunityId: string, active: boolean) =>
    fetch("/api/catches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId, visitorId: visitorId.current, active }),
    })
      .then(() => loadCounts())
      .catch(() => {});

  const toggleCatch = useCallback(
    (id: string) => {
      const next = { ...catchesRef.current };
      const adding = !next[id];
      if (adding) next[id] = { status: "Saved", caughtAt: new Date().toISOString() };
      else delete next[id];
      catchesRef.current = next;
      setCatches(next);
      write(K.catches, next);
      postCatch(id, adding);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadCounts],
  );

  const setStatus = useCallback((id: string, status: CatchStatus) => {
    const prev = catchesRef.current;
    if (!prev[id]) return;
    const next = { ...prev, [id]: { ...prev[id], status } };
    catchesRef.current = next;
    setCatches(next);
    write(K.catches, next);
  }, []);

  const countFor = useCallback(
    (id: string) => {
      const c = counts[id] ?? { total: 0, week: 0 };
      // In demo mode the numbers are illustrative; add the viewer's own catch so the button feels live.
      return countsMode === "demo" && catches[id] ? { total: c.total + 1, week: c.week + 1 } : c;
    },
    [counts, countsMode, catches],
  );

  const value: Store = {
    ready, today, nowMinutes, opportunities, view, setView, profile, saveProfile,
    resetDemoProfile: () => saveProfile(DEMO_PROFILE),
    catches, toggleCatch, setStatus, recs, recsLoading, refreshRecs, genuineRecs,
    cooldownLeft, startCooldown, counts, countsMode, countFor,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
