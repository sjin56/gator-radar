export const INTERESTS = [
  "Research", "AI", "Healthcare", "Career", "Volunteering", "Sports",
  "Wellness", "Student Life", "Leadership", "Technology", "Business", "Scholarships",
] as const;
export type Interest = (typeof INTERESTS)[number];

export type Category =
  | "Research" | "Career" | "Scholarship" | "Wellness" | "Student Life" | "Volunteering";
export const CATEGORIES: Category[] = ["Research", "Career", "Scholarship", "Wellness", "Student Life", "Volunteering"];

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
};

export type CatchStatus = "Saved" | "Planning to Apply" | "Applied";
export type CatchRecord = { status: CatchStatus; caughtAt: string };

export type Recommendation = { id: string; score: number; reason: string };
export type RecsResult = {
  source: "gemini" | "fallback";
  model?: string;
  note?: string;
  recommendations: Recommendation[];
};
