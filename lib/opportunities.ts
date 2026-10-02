import raw from "../data/realOpportunities.json";
import { toMinutes } from "./dates";
import type { Interest, Opportunity } from "./types";

/** Every cache key (browser, server, Gemini snapshots) is prefixed with this id. */
export const DATASET_ID: string = raw.datasetId;
export const PERIOD = raw.period as { start: string; end: string; timezone: string };

type Rec = (typeof raw.opportunities)[number] & { scheduleKind?: string };

const hasWord = (s: string, re: RegExp) => re.test(s);

function interestsFor(r: Rec): Interest[] {
  const text = `${r.title} ${r.description}`.toLowerCase();
  const out = new Set<Interest>();
  const byCat: Record<string, Interest[]> = {
    Fitness: ["Sports", "Wellness"], Wellness: ["Wellness"], Sports: ["Sports"], "Student Life": ["Student Life"],
    Career: ["Career"], Healthcare: ["Healthcare", "Wellness"], "Outdoor / Recreation": ["Sports", "Wellness"],
    "AI / Technology": ["AI", "Technology"], "Research / Academic": ["Research"], Academic: [],
  };
  (byCat[r.category] ?? []).forEach((i) => out.add(i));
  if (hasWord(text, /\b(ai|artificial intelligence|machine learning|prompt)/)) { out.add("AI"); out.add("Technology"); }
  if (hasWord(text, /research/)) out.add("Research");
  if (hasWord(text, /career|job|internship|interview|fair|employer/)) out.add("Career");
  if (hasWord(text, /volunteer/)) out.add("Volunteering");
  if (hasWord(text, /leader/)) out.add("Leadership");
  if (hasWord(text, /business/)) out.add("Business");
  if (hasWord(text, /health|hiv|bleed|safety/)) out.add("Healthcare");
  return [...out];
}

function adapt(r: Rec): Opportunity {
  const location = r.location || "Location not listed";
  const remote = /zoom|online/i.test(location);
  const start = r.startTime ? toMinutes(r.startTime) : undefined;
  const end = r.endTime ? toMinutes(r.endTime) : undefined; // null stays missing: never invented
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    kind: "event",
    typeLabel: r.category,
    tags: interestsFor(r),
    sourceName: r.sourceName,
    sourceUrl: r.sourceUrl ?? null,
    date: r.date,
    start,
    end,
    format: remote ? "Remote" : "On Campus",
    location,
    eligibility: r.eligibility ?? null,
    verified: false, // nothing in this pilot is blanket-verified; see `verification` and `reviewFlags`
    schedulable: Boolean(r.schedulable) && start != null && end != null,
    recommendable: Boolean(r.recommendationEligible),
    verification: r.verificationStatus,
    reviewFlags: r.reviewFlags ?? [],
    seriesId: r.seriesId ?? undefined,
    scoreKey: r.seriesId ?? r.id,
    dropIn: r.scheduleKind === "drop_in_window",
    startOnly: start != null && end == null,
    registrationDeadline: r.registrationDeadline ?? undefined,
  };
}

const ALL: Opportunity[] = (raw.opportunities as Rec[]).map(adapt);

/** The real pilot dataset is the ONLY production pool. The argument is kept for call-site compatibility. */
export function buildOpportunities(_today?: string): Opportunity[] {
  void _today;
  return ALL;
}

/** Human-readable meaning of each verificationStatus (no blanket claims). */
export function verificationLabel(status: string): string {
  switch (status) {
    case "recurring_schedule_confirmed_specific_occurrence_subject_to_changes":
      return "Weekly schedule published by Campus Rec; this date's class and open space are not verified";
    case "listed_in_supplied_source":
      return "Listed in a campus events calendar snapshot; recheck before attending";
    case "previously_researched_official_page_recheck":
      return "Official page identified earlier; details need a final recheck";
    case "prior_chat_research_needs_recheck":
      return "Earlier research; needs a recheck";
    case "organizer_guidance_from_user_not_individual_session_verified":
      return "Organizer guidance only; this session is not verified";
    default:
      return "Not individually verified";
  }
}

/** Why an item is not placed as a fixed calendar block. */
export function notScheduledReason(o: Opportunity): string {
  if (o.dropIn) return "A drop-in service window, not an appointment, so it is not placed as a fixed block.";
  if (o.startOnly) return "Only a start time is listed (no end time), so it is not placed as a fixed block.";
  const flag = o.reviewFlags[0];
  return flag ? `Needs checking before scheduling: ${flag}.` : "Exact times are not confirmed, so it is not placed as a fixed block.";
}

/** One representative per recurring series (or per single event) for AI scoring. */
export function scoringItems(opps: Opportunity[]): Opportunity[] {
  const seen = new Set<string>();
  return opps.filter((o) => o.recommendable && (seen.has(o.scoreKey) ? false : (seen.add(o.scoreKey), true)));
}
