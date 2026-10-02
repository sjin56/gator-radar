import type { Profile } from "./types";

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
  commuteMinutes: 20,
  weeklyActivities: 3,
};

/** Compares only the fields that influence recommendations. */
export const recsSignature = (p: Profile) =>
  JSON.stringify([p.interests, p.academicFocus, p.careerGoals, p.commitments]);
export const isDemoProfile = (p: Profile) => recsSignature(p) === recsSignature(DEMO_PROFILE);
