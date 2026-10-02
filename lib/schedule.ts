import { weekday } from "./dates";
import type { Commitment, Opportunity } from "./types";

/** Which fixed commitment (if any) does an event overlap with? Used for Discover conflict badges. */
export function findConflict(o: Opportunity, commitments: Commitment[]): string | null {
  if (o.kind !== "event" || !o.date || o.start == null || o.end == null) return null;
  const wd = weekday(o.date);
  for (const c of commitments) {
    if (c.days.includes(wd) && c.start < o.end && o.start < c.end) return c.title;
  }
  return null;
}
