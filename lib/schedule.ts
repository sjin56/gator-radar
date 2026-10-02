import { addDays, daysBetween, formatDate, formatTime, weekday } from "./dates";
import type { CatchRecord, Category, Commitment, Opportunity } from "./types";

export type PlanMode = "career" | "social" | "balanced";

export type Block = {
  id: string;
  day: number; // 0 = Mon ... 4 = Fri
  date: string;
  start: number;
  end: number;
  title: string;
  type: "class" | "event" | "prep";
  oppId?: string;
};
export type Unplaced = { oppId: string; title: string; reason: string };
export type Plan = { weekStart: string; blocks: Block[]; unplaced: Unplaced[] };

const WEIGHTS: Record<PlanMode, Record<Category, number>> = {
  career: { Research: 10, Career: 10, Scholarship: 9, "Student Life": 5, Volunteering: 4, Wellness: 3 },
  social: { "Student Life": 10, Volunteering: 9, Wellness: 9, Career: 5, Research: 4, Scholarship: 4 },
  balanced: { Research: 7, Career: 7, Scholarship: 7, "Student Life": 7, Volunteering: 7, Wellness: 7 },
};
const PREP_SESSIONS: Record<PlanMode, (n: number) => number> = {
  career: (n) => n + 1,
  balanced: (n) => n,
  social: () => 1,
};
const PREP_LEN = 60;
const DAY_START = 9 * 60;
const DAY_END = 18 * 60;

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;

export function buildPlan(opts: {
  weekStart: string; // Monday, YYYY-MM-DD
  mode: PlanMode;
  commitments: Commitment[];
  catches: Record<string, CatchRecord>;
  opportunities: Opportunity[];
  today: string;
  nowMinutes: number;
}): Plan {
  const { weekStart, mode, commitments, catches, opportunities, today, nowMinutes } = opts;
  const weekEnd = addDays(weekStart, 4); // Friday
  const blocks: Block[] = [];
  const unplaced: Unplaced[] = [];

  // 1. Fixed commitments
  for (const c of commitments) {
    for (const d of c.days) {
      if (d < 1 || d > 5) continue;
      blocks.push({
        id: `${c.id}-${d}`, day: d - 1, date: addDays(weekStart, d - 1),
        start: c.start, end: c.end, title: c.title, type: "class",
      });
    }
  }

  const saved = opportunities.filter((o) => catches[o.id]);
  const label = (b: Block) => `${b.title} (${formatTime(b.start)}–${formatTime(b.end)})`;

  // 2. Official events at their real times, highest priority first.
  const events = saved
    .filter((o) => o.kind === "event")
    .sort((a, b) => WEIGHTS[mode][b.category] - WEIGHTS[mode][a.category] || a.id.localeCompare(b.id));
  for (const o of events) {
    if (!o.date || o.start == null || o.end == null) continue;
    const off = daysBetween(weekStart, o.date);
    if (off < 0 || off > 4) {
      const wd = weekday(o.date);
      unplaced.push({
        oppId: o.id, title: o.title,
        reason:
          wd === 0 || wd === 6
            ? `Happens on a weekend (${formatDate(o.date)}), outside the Monday–Friday planner.`
            : `Happens ${formatDate(o.date, { weekday: "short", month: "short", day: "numeric" })}, which is not in the selected week.`,
      });
      continue;
    }
    const cand = { start: o.start, end: o.end };
    const clash = blocks.find((b) => b.day === off && overlaps(b, cand));
    if (clash) {
      unplaced.push({
        oppId: o.id, title: o.title,
        reason: `Official time ${formatTime(o.start)}–${formatTime(o.end)} overlaps with ${label(clash)}.`,
      });
      continue;
    }
    blocks.push({
      id: `evt-${o.id}`, day: off, date: o.date, start: o.start, end: o.end,
      title: o.title, type: "event", oppId: o.id,
    });
  }

  // 3. Suggested prep blocks for applications, most urgent first.
  const apps = saved
    .filter((o) => o.kind === "application" && catches[o.id].status !== "Applied" && o.deadline)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!));
  const perDay = [0, 0, 0, 0, 0];
  for (const o of apps) {
    const deadline = o.deadline!;
    const lastDay = Math.min(4, daysBetween(weekStart, deadline));
    if (daysBetween(today, deadline) < 0) {
      unplaced.push({ oppId: o.id, title: o.title, reason: `Deadline ${formatDate(deadline)} has already passed.` });
      continue;
    }
    if (lastDay < 0) {
      unplaced.push({
        oppId: o.id, title: o.title,
        reason: `Deadline ${formatDate(deadline)} is before this week starts. Check an earlier week.`,
      });
      continue;
    }
    const firstDay = Math.max(0, daysBetween(weekStart, today));
    const want = PREP_SESSIONS[mode](o.prepSessions ?? 1);
    let placed = 0;
    const usedDays = new Set<number>();
    while (placed < want) {
      // pick the least-loaded eligible day, earliest first; one block per day per opportunity
      let best: { day: number; start: number } | null = null;
      for (let d = firstDay; d <= lastDay; d++) {
        if (usedDays.has(d)) continue;
        const earliest = d === firstDay && addDays(weekStart, d) === today
          ? Math.max(DAY_START, Math.ceil((nowMinutes + 15) / 30) * 30)
          : DAY_START;
        for (let s = earliest; s + PREP_LEN <= DAY_END; s += 30) {
          if (!blocks.some((b) => b.day === d && overlaps(b, { start: s, end: s + PREP_LEN }))) {
            if (!best || perDay[d] < perDay[best.day]) best = { day: d, start: s };
            break;
          }
        }
      }
      if (!best) break;
      usedDays.add(best.day);
      perDay[best.day]++;
      blocks.push({
        id: `prep-${o.id}-${placed}`, day: best.day, date: addDays(weekStart, best.day),
        start: best.start, end: best.start + PREP_LEN, title: `Prep: ${o.title}`, type: "prep", oppId: o.id,
      });
      placed++;
    }
    if (placed === 0) {
      unplaced.push({
        oppId: o.id, title: o.title,
        reason: `No free ${PREP_LEN}-minute slot between 9 AM and 6 PM before the ${formatDate(deadline)} deadline in this week.`,
      });
    } else if (placed < want) {
      unplaced.push({
        oppId: o.id, title: o.title,
        reason: `Only ${placed} of ${want} suggested prep blocks fit before the ${formatDate(deadline)} deadline.`,
      });
    }
  }

  blocks.sort((a, b) => a.day - b.day || a.start - b.start);
  return { weekStart, blocks, unplaced };
}

/** Which of the student's commitments does an event overlap with? (for conflict badges) */
export function findConflict(o: Opportunity, commitments: Commitment[]): string | null {
  if (o.kind !== "event" || !o.date || o.start == null || o.end == null) return null;
  const wd = weekday(o.date);
  for (const c of commitments) {
    if (c.days.includes(wd) && overlaps(c, { start: o.start, end: o.end })) return c.title;
  }
  return null;
}
