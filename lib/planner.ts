import { addDays, daysBetween, formatDate, formatTime, weekday } from "./dates";
import { notScheduledReason } from "./opportunities";
import type {
  CatchRecord, Category, Commitment, Discovery, Goal, Opportunity, PlanScore,
} from "./types";

export type Origin = "caught" | "new";
export type Block = {
  id: string;
  day: number; // 0 = Mon ... 4 = Fri
  date: string;
  start: number;
  end: number;
  title: string;
  type: "class" | "event" | "prep";
  oppId?: string;
  origin?: Origin;
};
export type Selected = {
  opp: Opportunity;
  origin: Origin;
  reason: string;
  score: number;
  prepWanted?: number;
  prepPlaced?: number;
};
export type Skipped = { opp: Opportunity; origin: Origin; reason: string };
export type Plan = {
  weekStart: string;
  blocks: Block[];
  selected: Selected[];
  skipped: Skipped[];
  /** new (uncaught) opportunities that cannot fit this week, not listed individually */
  otherNotFit: number;
  freeHours: number;
  target: number;
};

/** How strongly each Weekly Goal values each category (0-10). */
export const GOAL_WEIGHTS: Record<Goal, Record<string, number>> = {
  career: { Career: 10, "Research / Academic": 9, "AI / Technology": 9, Academic: 7, Healthcare: 5, "Student Life": 4, Wellness: 3, "Outdoor / Recreation": 3, Fitness: 2, Sports: 2 },
  social: { "Student Life": 10, Sports: 9, Fitness: 8, Wellness: 8, "Outdoor / Recreation": 8, Healthcare: 4, "AI / Technology": 4, Career: 4, Academic: 3, "Research / Academic": 3 },
  balanced: { Career: 7, "Research / Academic": 7, "AI / Technology": 7, Academic: 7, Healthcare: 7, "Student Life": 7, Wellness: 7, "Outdoor / Recreation": 7, Fitness: 6, Sports: 6 },
};
const goalWeight = (g: Goal, c: Category) => GOAL_WEIGHTS[g][c] ?? 5;

const PREP_LEN = 60;
const DAY_START = 9 * 60;
const DAY_END = 18 * 60;
const DAY_LOAD_CAP = 240; // minutes of extra activities per day (free-time guard)
const MAX_ACTIVITIES_PER_DAY = 2;

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
const lbl = (b: Block) => `${b.title} (${formatTime(b.start)}–${formatTime(b.end)})`;

export function fixedBlocks(commitments: Commitment[], weekStart: string): Block[] {
  const out: Block[] = [];
  for (const c of commitments)
    for (const d of c.days) {
      if (d < 1 || d > 5) continue;
      out.push({
        id: `${c.id}-${d}`, day: d - 1, date: addDays(weekStart, d - 1),
        start: c.start, end: c.end, title: c.title, type: "class",
      });
    }
  return out;
}

/** Returns a human-readable reason if the event cannot be attended given existing blocks and commute. */
export function eventBlocker(o: Opportunity, blocks: Block[], weekStart: string, commute: number): string | null {
  if (o.kind !== "event" || !o.date || o.start == null || o.end == null) return null;
  const off = daysBetween(weekStart, o.date);
  if (off < 0 || off > 4) {
    const wd = weekday(o.date);
    return wd === 0 || wd === 6
      ? `Happens on a weekend (${formatDate(o.date)}), outside the Monday–Friday planner.`
      : `Happens ${formatDate(o.date, { weekday: "short", month: "short", day: "numeric" })}, outside the selected week.`;
  }
  const buffer = o.format === "Remote" ? 0 : commute;
  for (const b of blocks) {
    if (b.day !== off || b.type === "prep") continue;
    if (overlaps(b, { start: o.start, end: o.end }))
      return `Official time ${formatTime(o.start)}–${formatTime(o.end)} overlaps ${lbl(b)}.`;
    if (buffer > 0 && overlaps({ start: b.start - buffer, end: b.end + buffer }, { start: o.start, end: o.end }))
      return `Too tight with ${lbl(b)} once your ${commute}-minute commute buffer is included.`;
  }
  return null;
}

type PrepCtx = { blocks: Block[]; dayLoad: number[]; weekStart: string; today: string; nowMinutes: number };

function prepRange(o: Opportunity, weekStart: string, today: string) {
  const lastDay = Math.min(4, daysBetween(weekStart, o.deadline!));
  const firstDay = Math.max(0, daysBetween(weekStart, today));
  return { firstDay, lastDay };
}

function findPrepSlot(o: Opportunity, ctx: PrepCtx, used: Set<number>): { day: number; start: number } | null {
  const { firstDay, lastDay } = prepRange(o, ctx.weekStart, ctx.today);
  let best: { day: number; start: number } | null = null;
  for (let d = firstDay; d <= lastDay; d++) {
    if (used.has(d) || ctx.dayLoad[d] + PREP_LEN > DAY_LOAD_CAP) continue;
    const isToday = addDays(ctx.weekStart, d) === ctx.today;
    const earliest = isToday ? Math.max(DAY_START, Math.ceil((ctx.nowMinutes + 15) / 30) * 30) : DAY_START;
    for (let s = earliest; s + PREP_LEN <= DAY_END; s += 30) {
      if (!ctx.blocks.some((b) => b.day === d && overlaps(b, { start: s, end: s + PREP_LEN }))) {
        if (!best || ctx.dayLoad[d] < ctx.dayLoad[best.day]) best = { day: d, start: s };
        break;
      }
    }
  }
  return best;
}

export function planWeek(opts: {
  weekStart: string;
  discovery: Discovery;
  goal: Goal;
  commitments: Commitment[];
  commuteMinutes: number;
  weeklyActivities: number;
  catches: Record<string, CatchRecord>;
  opportunities: Opportunity[];
  scores: Record<string, PlanScore>;
  today: string;
  nowMinutes: number;
}): Plan {
  const { weekStart, discovery, goal, commitments, catches, opportunities, scores, today, nowMinutes } = opts;
  const N = clamp(Math.round(opts.weeklyActivities), 1, 6);
  const commute = clamp(Math.round(opts.commuteMinutes), 0, 90);
  const blocks = fixedBlocks(commitments, weekStart);
  const dayLoad = [0, 0, 0, 0, 0];
  const dayCount = [0, 0, 0, 0, 0];
  const selected: Selected[] = [];
  const skipped: Skipped[] = [];
  let otherNotFit = 0;

  type Cand = { opp: Opportunity; origin: Origin; final: number };
  const score = (o: Opportunity) => scores[o.scoreKey]?.score ?? 40;
  const final = (o: Opportunity) => 0.5 * score(o) + 6 * goalWeight(goal, o.category);
  const reasonOf = (o: Opportunity) => scores[o.scoreKey]?.reason || o.description.split(". ")[0] + ".";

  // 1. Hard feasibility (week, deadline, status, fixed commitments + commute)
  const hardReason = (o: Opportunity): string | null => {
    if (!o.schedulable || !o.recommendable) return notScheduledReason(o);
    if (o.kind === "event" && o.date && o.date < today) return `Already happened (${formatDate(o.date)}).`;
    if (o.kind === "event" && o.date === today && (o.start ?? 0) <= nowMinutes) return "Already started today.";
    if (o.kind === "event") return eventBlocker(o, blocks, weekStart, commute);
    if (catches[o.id]?.status === "Applied") return "You marked this as Applied, so no preparation time is needed.";
    const dl = o.deadline!;
    if (daysBetween(today, dl) < 0) return `Deadline ${formatDate(dl)} has already passed.`;
    if (daysBetween(weekStart, dl) < 0) return `Deadline ${formatDate(dl)} is before this week starts. Plan an earlier week.`;
    const ctx: PrepCtx = { blocks, dayLoad, weekStart, today, nowMinutes };
    if (!findPrepSlot(o, ctx, new Set()))
      return `No free ${PREP_LEN}-minute slot before the ${formatDate(dl)} deadline in this week.`;
    return null;
  };

  const caughtPool: Cand[] = [];
  const newPool: Cand[] = [];
  for (const o of opportunities) {
    const origin: Origin = catches[o.id] ? "caught" : "new";
    const why = hardReason(o);
    if (why) {
      if (origin === "caught") skipped.push({ opp: o, origin, reason: why });
      else otherNotFit++;
      continue;
    }
    (origin === "caught" ? caughtPool : newPool).push({ opp: o, origin, final: final(o) });
  }

  // 2. Discovery Preference decides how many picks come from each pool.
  const ct =
    discovery === "mycatch" ? Math.max(1, N - 1) : discovery === "balanced" ? Math.floor(N / 2) : N >= 4 ? 1 : 0;

  const tryPlace = (c: Cand): string | null => {
    const o = c.opp;
    if (o.kind === "event") {
      const off = daysBetween(weekStart, o.date!);
      const blocker = eventBlocker(o, blocks, weekStart, commute);
      if (blocker) return blocker;
      const dur = o.end! - o.start!;
      if (dayCount[off] >= MAX_ACTIVITIES_PER_DAY || dayLoad[off] + dur > DAY_LOAD_CAP)
        return "Would overfill that day, so it was skipped to protect your free time.";
      blocks.push({
        id: `evt-${o.id}`, day: off, date: o.date!, start: o.start!, end: o.end!,
        title: o.title, type: "event", oppId: o.id, origin: c.origin,
      });
      dayLoad[off] += dur;
      dayCount[off]++;
      return null;
    }
    if (!findPrepSlot(o, { blocks, dayLoad, weekStart, today, nowMinutes }, new Set()))
      return "No free preparation time remains before the deadline.";
    return null;
  };

  const take = (pool: Cand[], count: number) => {
    let placed = 0;
    const penalty = goal === "balanced" ? 14 : 8; // soft category diversity so fitness cannot drown out everything else
    while (placed < count && selected.length < N && pool.length) {
      const adj = (c: Cand) =>
        c.final - penalty * selected.filter((s) => s.opp.category === c.opp.category).length -
        25 * selected.filter((s) => s.opp.seriesId && s.opp.seriesId === c.opp.seriesId).length;
      pool.sort((a, b) => adj(b) - adj(a));
      const c = pool.shift()!;
      const fail = tryPlace(c);
      if (fail) {
        if (c.origin === "caught") skipped.push({ opp: c.opp, origin: "caught", reason: fail });
        continue;
      }
      selected.push({ opp: c.opp, origin: c.origin, reason: reasonOf(c.opp), score: score(c.opp) });
      placed++;
    }
  };

  const rest = () => [...caughtPool, ...newPool];
  if (discovery === "surprise") {
    take(newPool, N - ct);
    take(caughtPool, ct);
  } else {
    take(caughtPool, ct);
    take(newPool, N - selected.length);
  }
  if (selected.length < N) {
    const merged = rest();
    caughtPool.length = 0;
    newPool.length = 0;
    take(merged, N - selected.length);
    for (const c of merged) (c.origin === "caught" ? caughtPool : newPool).push(c);
  }

  // Caught items that were feasible but not chosen: always explain.
  for (const c of caughtPool) {
    skipped.push({
      opp: c.opp, origin: "caught",
      reason:
        discovery === "surprise"
          ? "Held back in Surprise Me! mode to make room for new discoveries. It stays in My Catch."
          : discovery === "balanced"
            ? `Balanced Discovery keeps about half the week for new ideas, and your ${N}-activity limit was reached.`
            : `Your ${N}-activity limit was reached, and other picks fit your goal better this week.`,
    });
  }

  // 3. Optional prep blocks for chosen applications, most urgent first.
  const apps = selected.filter((s) => s.opp.kind === "application").sort((a, b) => a.opp.deadline!.localeCompare(b.opp.deadline!));
  for (const s of apps) {
    const base = s.opp.prepSessions ?? 1;
    const want = goal === "career" ? base + 1 : goal === "social" ? 1 : base;
    s.prepWanted = want;
    s.prepPlaced = 0;
    const used = new Set<number>();
    while (s.prepPlaced < want) {
      const slot = findPrepSlot(s.opp, { blocks, dayLoad, weekStart, today, nowMinutes }, used);
      if (!slot) break;
      used.add(slot.day);
      dayLoad[slot.day] += PREP_LEN;
      blocks.push({
        id: `prep-${s.opp.id}-${s.prepPlaced}`, day: slot.day, date: addDays(weekStart, slot.day),
        start: slot.start, end: slot.start + PREP_LEN, title: `Prep: ${s.opp.title}`,
        type: "prep", oppId: s.opp.id, origin: s.origin,
      });
      s.prepPlaced++;
    }
  }
  // An application with zero prep time found is not really planned.
  for (const s of [...selected]) {
    if (s.opp.kind === "application" && s.prepPlaced === 0) {
      selected.splice(selected.indexOf(s), 1);
      if (s.origin === "caught")
        skipped.push({ opp: s.opp, origin: "caught", reason: "No preparation time could be found before the deadline." });
    }
  }

  blocks.sort((a, b) => a.day - b.day || a.start - b.start);

  // Free time: weekday 9-6 minus busy minutes
  let busy = 0;
  for (let d = 0; d < 5; d++) {
    const iv = blocks.filter((b) => b.day === d).map((b) => [Math.max(b.start, DAY_START), Math.min(b.end, DAY_END)]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
    let cur = -1;
    for (const [a, b] of iv) {
      const s = Math.max(a, cur);
      if (b > s) busy += b - s;
      cur = Math.max(cur, b);
    }
  }
  const freeHours = Math.round(((5 * (DAY_END - DAY_START) - busy) / 60) * 10) / 10;
  return { weekStart, blocks, selected, skipped, otherNotFit, freeHours, target: N };
}
