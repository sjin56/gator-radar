import { INTERESTS, type Commitment, type Interest, type Profile } from "./types";

/** Re-build a clean Profile from untrusted JSON (server side). */
export function sanitizeProfile(raw: unknown): Profile {
  const p = (raw ?? {}) as Partial<Profile>;
  const interests = (Array.isArray(p.interests) ? p.interests : []).filter((i): i is Interest =>
    (INTERESTS as readonly string[]).includes(i as string),
  );
  const commitments: Commitment[] = (Array.isArray(p.commitments) ? p.commitments : [])
    .slice(0, 20)
    .map((c, i) => ({
      id: `c${i}`,
      title: String(c?.title ?? "").slice(0, 60),
      days: (Array.isArray(c?.days) ? c.days : []).map(Number).filter((d) => d >= 1 && d <= 5),
      start: Math.max(0, Math.min(1439, Number(c?.start) || 0)),
      end: Math.max(0, Math.min(1439, Number(c?.end) || 0)),
      kind: c?.kind === "other" ? "other" : "class",
    }));
  const num = (v: unknown, d: number, lo: number, hi: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : d;
  };
  return {
    interests,
    academicFocus: String(p.academicFocus ?? "").slice(0, 200),
    careerGoals: String(p.careerGoals ?? "").slice(0, 500),
    commitments,
    commuteMinutes: num(p.commuteMinutes, 20, 0, 90),
    weeklyActivities: num(p.weeklyActivities, 3, 1, 6),
  };
}
