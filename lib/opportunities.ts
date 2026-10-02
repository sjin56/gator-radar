import { addDays, mondayOf } from "./dates";
import type { Opportunity } from "./types";

const DEMO_SOURCE = "Demo data (fictional, modeled on typical SFSU listings)";

/**
 * Manually curated DEMO records. None are verified real listings; dates are
 * generated relative to today so the prototype always has upcoming items.
 */
export function buildOpportunities(today: string): Opportunity[] {
  const nextMon = addDays(mondayOf(today), 7);
  const base = {
    sourceName: DEMO_SOURCE,
    sourceUrl: null,
    eligibility: null,
    verified: false,
  };
  return [
    {
      ...base,
      id: "res-undergrad-ra",
      title: "Undergraduate Research Assistant",
      description:
        "Assist a faculty-led lab with data collection, analysis, and literature review for a machine-learning project on campus sustainability. Roughly 8 hours per week; no prior research experience required.",
      category: "Research", kind: "application", typeLabel: "Research position",
      tags: ["Research", "AI", "Technology", "Career"],
      deadline: addDays(nextMon, 3), format: "On Campus",
      location: "Science & Engineering Building (demo)", prepSessions: 2,
    },
    {
      ...base,
      id: "int-marketing",
      title: "Marketing Intern (Paid)",
      description:
        "Support a local tech startup's social media and campaign analytics. Hybrid schedule, flexible around classes. Good fit for business or communications interests.",
      category: "Career", kind: "application", typeLabel: "Internship",
      tags: ["Career", "Business", "Technology"],
      deadline: addDays(nextMon, 9), format: "Hybrid", location: "Remote / Hybrid (demo)", prepSessions: 2,
    },
    {
      ...base,
      id: "sch-health",
      title: "Health Sciences Scholarship",
      description:
        "Merit scholarship for students pursuing healthcare-related study or community health work. Requires a short personal statement and one reference.",
      category: "Scholarship", kind: "application", typeLabel: "Scholarship",
      tags: ["Scholarships", "Healthcare", "Wellness"],
      deadline: addDays(today, 2), format: "Remote", location: "Online application (demo)", prepSessions: 1,
    },
    {
      ...base,
      id: "evt-resume-lab",
      title: "Career Workshop: Resume & LinkedIn Lab",
      description:
        "Hands-on session to polish your resume and LinkedIn profile with feedback from career advisors. Bring a laptop and a draft resume.",
      category: "Career", kind: "event", typeLabel: "Workshop",
      tags: ["Career", "Business", "Student Life"],
      date: addDays(nextMon, 1), start: 12 * 60 + 30, end: 13 * 60 + 30,
      format: "On Campus", location: "Career Center (demo)",
    },
    {
      ...base,
      id: "evt-leadership",
      title: "Leadership Workshop Series: Kickoff",
      description:
        "First session of a multi-week series on leading student teams, giving feedback, and running effective meetings.",
      category: "Student Life", kind: "event", typeLabel: "Workshop series",
      tags: ["Leadership", "Student Life", "Career"],
      date: addDays(nextMon, 2), start: 10 * 60 + 30, end: 11 * 60 + 30,
      format: "On Campus", location: "Student Center (demo)",
    },
    {
      ...base,
      id: "evt-yoga",
      title: "Evening Yoga & Group Fitness",
      description:
        "Drop-in group fitness and yoga class for all levels. A good way to unwind and meet other students.",
      category: "Wellness", kind: "event", typeLabel: "Wellness session",
      tags: ["Wellness", "Sports", "Student Life"],
      date: addDays(nextMon, 2), start: 17 * 60, end: 18 * 60,
      format: "On Campus", location: "Recreation Center (demo)",
    },
    {
      ...base,
      id: "evt-ai-club",
      title: "AI & Machine Learning Student Meetup",
      description:
        "Student-run meetup with lightning talks on ML projects, paper discussion, and networking with peers interested in AI.",
      category: "Student Life", kind: "event", typeLabel: "Student organization",
      tags: ["AI", "Technology", "Student Life", "Research"],
      date: addDays(nextMon, 3), start: 18 * 60, end: 19 * 60 + 30,
      format: "On Campus", location: "Library Collaboration Room (demo)",
    },
    {
      ...base,
      id: "evt-garden",
      title: "Community Garden Volunteer Day",
      description:
        "Help maintain the campus community garden. Tools provided; wear comfortable clothes. Counts toward service hours.",
      category: "Volunteering", kind: "event", typeLabel: "Volunteer event",
      tags: ["Volunteering", "Wellness", "Student Life"],
      date: addDays(nextMon, 4), start: 14 * 60, end: 16 * 60,
      format: "On Campus", location: "Campus Garden (demo)",
    },
  ];
}

/** ILLUSTRATIVE numbers used only when the shared database is not connected. */
export const DEMO_COUNTS: Record<string, { total: number; week: number }> = {
  "res-undergrad-ra": { total: 24, week: 9 },
  "int-marketing": { total: 17, week: 6 },
  "sch-health": { total: 11, week: 4 },
  "evt-resume-lab": { total: 31, week: 12 },
  "evt-leadership": { total: 14, week: 5 },
  "evt-yoga": { total: 21, week: 8 },
  "evt-ai-club": { total: 27, week: 11 },
  "evt-garden": { total: 9, week: 3 },
};
