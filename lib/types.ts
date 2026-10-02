export const INTERESTS = [
  "Research", "AI", "Healthcare", "Career", "Volunteering", "Sports",
  "Wellness", "Student Life", "Leadership", "Technology", "Business", "Scholarships",
] as const;
export type Interest = (typeof INTERESTS)[number];

export type Category = string;

export type Opportunity = {
  id: string;
  title: string;
  description: string;
  category: Category;
  /** events have attendance times; applications have deadlines */
  kind: "event" | "application";
  typeLabel: string;
  tags: Interest[];
  sourceName: string;
  sourceUrl: string | null; // null = no verified URL
  date?: string; // events: YYYY-MM-DD (LA)
  start?: number; // minutes since midnight
  end?: number;
  deadline?: string; // applications: YYYY-MM-DD (LA), end of day
  format: "On Campus" | "Remote" | "Hybrid";
  location: string;
  eligibility: string | null; // null = not verified
  verified: boolean;
  /** applications: number of suggested 60-minute prep blocks */
  prepSessions?: number;
  /** real-data pilot fields */
  schedulable: boolean; // exact fixed start AND end known, no special ambiguity
  recommendable: boolean; // eligible for AI recommendations and automatic planning
  verification: string; // dataset verificationStatus
  reviewFlags: string[];
  seriesId?: string; // recurring fitness class across dates
  scoreKey: string; // seriesId when present, else id; Gemini scores are keyed by this
  dropIn?: boolean;
  startOnly?: boolean; // only a start time is listed
  registrationDeadline?: string;
};

export type Commitment = {
  id: string;
  title: string;
  days: number[]; // 1 = Mon ... 5 = Fri
  start: number;
  end: number;
  kind: "class" | "other";
};

export type Profile = {
  interests: Interest[];
  academicFocus: string;
  careerGoals: string;
  commitments: Commitment[];
  /** one-way travel to campus, minutes (no addresses collected) */
  commuteMinutes: number;
  /** preferred number of extra activities per week */
  weeklyActivities: number;
};

export type CatchStatus = "Saved" | "Planning to Apply" | "Applied";
export type CatchRecord = { status: CatchStatus; caughtAt: string };

export type LimitKind = "rpm" | "tpm" | "daily" | "unknown";

export type Recommendation = { id: string; score: number; reason: string };
export type RecsResult = {
  source: "gemini" | "fallback";
  model?: string;
  note?: string;
  capturedAt?: string;
  shared?: boolean;
  retryAfter?: number;
  limit?: LimitKind;
  recommendations: Recommendation[];
};

export type Discovery = "mycatch" | "balanced" | "surprise";
export type Goal = "career" | "social" | "balanced";
export type PlanScore = { id: string; score: number; reason: string };
export type PlanScores = {
  source: "gemini" | "fallback";
  model?: string;
  note?: string;
  capturedAt?: string;
  shared?: boolean;
  retryAfter?: number;
  limit?: LimitKind;
  items: PlanScore[];
};
