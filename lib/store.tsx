"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { laNow } from "./dates";
import { buildOpportunities, DEMO_COUNTS } from "./opportunities";
import type { CatchRecord, CatchStatus, Opportunity, Profile, RecsResult } from "./types";

export type View = "home" | "discover" | "catch" | "wizard" | "profile";
export type Counts = Record<string, { total: number; week: number }>;
export type RecsState =
  | { status: "idle" | "loading" }
  | { status: "error"; error: string }
  | { status: "done"; result: RecsResult };

export const DEMO_PROFILE: Profile = {
  interests: ["Research", "AI", "Career", "Wellness"],
  academicFocus: "Computer Science (international exchange student)",
  careerGoals:
    "Get hands-on AI/machine-learning research experience and land a tech internship. Also want to stay active and meet people on campus.",
  commitments: [
    { id: "c1", title: "CS 210 Lecture", days: [1, 3], start: 600, end: 675, kind: "class" },
    { id: "c2", title: "Math 226 Lecture", days: [2, 4], start: 600, end: 675, kind: "class" },
    { id: "c3", title: "CS 211 Lab", days: [2, 4], start: 780, end: 855, kind: "class" },
    { id: "c4", title: "Study Group", days: [5], start: 900, end: 1020, kind: "other" },
  ],
};

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
  recs: RecsState;
  refreshRecs: () => void;
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

const K = { profile: "gr.profile.v1", catches: "gr.catches.v1", visitor: "gr.visitor.v1", recs: "gr.recs.v1" };

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
  const [recs, setRecs] = useState<RecsState>({ status: "idle" });
  const [counts, setCounts] = useState<Counts>(DEMO_COUNTS);
  const [countsMode, setCountsMode] = useState<"firestore" | "demo">("demo");
  const visitorId = useRef("");
  const catchesRef = useRef<Record<string, CatchRecord>>({});
  const recsKey = useRef("");

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

  // Initial load from localStorage
  useEffect(() => {
    const n = laNow();
    setToday(n.date);
    setNowMinutes(n.minutes);
    setProfile(read(K.profile, DEMO_PROFILE));
    const saved = read<Record<string, CatchRecord>>(K.catches, {});
    catchesRef.current = saved;
    setCatches(saved);
    visitorId.current = newVisitorId();
    setReady(true);
    loadCounts();
  }, [loadCounts]);

  const fetchRecs = useCallback(
    async (p: Profile, date: string, force: boolean) => {
      const key = JSON.stringify([p, date]);
      if (!force) {
        let cached = read<{ key: string; result: RecsResult } | null>(K.recs, null);
        if (!cached || cached.key !== key) {
          try {
            cached = JSON.parse(sessionStorage.getItem(K.recs) ?? "null");
          } catch {
            cached = null;
          }
        }
        if (cached && cached.key === key) {
          recsKey.current = key;
          setRecs({ status: "done", result: cached.result });
          return;
        }
      }
      recsKey.current = key;
      setRecs({ status: "loading" });
      try {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: p }),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const result = (await res.json()) as RecsResult;
        if (recsKey.current !== key) return; // a newer request superseded this one
        if (result.source === "gemini") write(K.recs, { key, result });
        else {
          try {
            sessionStorage.setItem(K.recs, JSON.stringify({ key, result }));
          } catch {}
        }
        setRecs({ status: "done", result });
      } catch (e) {
        if (recsKey.current === key) setRecs({ status: "error", error: e instanceof Error ? e.message : "Request failed" });
      }
    },
    [],
  );

  useEffect(() => {
    if (ready) fetchRecs(profile, today, false);
  }, [ready, profile, today, fetchRecs]);

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
    catches, toggleCatch, setStatus, recs,
    refreshRecs: () => fetchRecs(profile, today, true),
    counts, countsMode, countFor,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
