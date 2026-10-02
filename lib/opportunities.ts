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
    {
      ...base,
      id: "evt-research-showcase",
      title: "Faculty Research Showcase: AI for Health",
      description:
        "Short faculty talks and poster tables on AI and data science projects in healthcare. A good way to find a lab to join and ask questions about undergraduate research.",
      category: "Research", kind: "event", typeLabel: "Talk & poster session",
      tags: ["Research", "AI", "Healthcare", "Technology"],
      date: addDays(nextMon, 0), start: 15 * 60, end: 16 * 60 + 30,
      format: "On Campus", location: "Science & Engineering Atrium (demo)",
    },
    {
      ...base,
      id: "evt-soccer",
      title: "Intramural Soccer Pickup Night",
      description:
        "Casual co-ed pickup soccer, all skill levels welcome. Great for staying active and meeting students outside your major.",
      category: "Wellness", kind: "event", typeLabel: "Sports",
      tags: ["Sports", "Wellness", "Student Life"],
      date: addDays(nextMon, 0), start: 17 * 60 + 30, end: 19 * 60,
      format: "On Campus", location: "Campus Field (demo)",
    },
    {
      ...base,
      id: "evt-intl-coffee",
      title: "International Students Coffee Hour",
      description:
        "Relaxed weekly meetup for international and exchange students: coffee, conversation, and tips for navigating campus and the city.",
      category: "Student Life", kind: "event", typeLabel: "Community meetup",
      tags: ["Student Life", "Leadership"],
      date: addDays(nextMon, 1), start: 15 * 60, end: 16 * 60,
      format: "On Campus", location: "Global Programs Lounge (demo)",
    },
    {
      ...base,
      id: "evt-alumni-night",
      title: "Alumni Networking Night: Tech & Business",
      description:
        "Meet SFSU alumni working in tech, startups, and business. Short panel followed by small-group networking. Bring questions about breaking into the industry.",
      category: "Career", kind: "event", typeLabel: "Networking",
      tags: ["Career", "Business", "Technology", "Leadership"],
      date: addDays(nextMon, 3), start: 16 * 60 + 30, end: 18 * 60,
      format: "On Campus", location: "Student Center Ballroom (demo)",
    },
    {
      ...base,
      id: "evt-hack-night",
      title: "Hack Night: Build with APIs",
      description:
        "Open workshop where students pair up to build small projects using public APIs and AI tools. Mentors on hand; beginners welcome.",
      category: "Student Life", kind: "event", typeLabel: "Workshop",
      tags: ["Technology", "AI", "Student Life"],
      date: addDays(nextMon, 4), start: 11 * 60, end: 13 * 60,
      format: "On Campus", location: "Engineering Lab 2 (demo)",
    },
    {
      ...base,
      id: "app-innovation-challenge",
      title: "Campus Innovation Challenge",
      description:
        "Team competition to prototype a solution to a campus problem. Teams of 1-4 submit a short proposal first; finalists present to a panel.",
      category: "Competition", kind: "application", typeLabel: "Competition",
      tags: ["Technology", "AI", "Business", "Leadership"],
      deadline: addDays(nextMon, 11), format: "Hybrid", location: "Proposal submitted online (demo)", prepSessions: 2,
    },
    {
      ...base,
      id: "app-wellness-ambassador",
      title: "Peer Wellness Ambassador Program",
      description:
        "Train as a peer ambassador promoting wellness and mental-health resources on campus. Includes a short training and about 3 hours per week.",
      category: "Volunteering", kind: "application", typeLabel: "Student program",
      tags: ["Wellness", "Volunteering", "Leadership", "Healthcare"],
      deadline: addDays(nextMon, 6), format: "On Campus", location: "Student Health Center (demo)", prepSessions: 1,
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
  "evt-research-showcase": { total: 19, week: 7 },
  "evt-soccer": { total: 16, week: 6 },
  "evt-intl-coffee": { total: 13, week: 5 },
  "evt-alumni-night": { total: 22, week: 10 },
  "evt-hack-night": { total: 18, week: 8 },
  "app-innovation-challenge": { total: 12, week: 4 },
  "app-wellness-ambassador": { total: 8, week: 2 },
};
