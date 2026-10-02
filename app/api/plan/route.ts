import { NextResponse } from "next/server";
import { addDays, laNow, mondayOf } from "@/lib/dates";
import { runGemini } from "@/lib/gemini";
import { buildOpportunities } from "@/lib/opportunities";
import { buildPlanPrompt, fallbackPlanScores, validatePlanScores } from "@/lib/planAI";
import { sanitizeProfile } from "@/lib/sanitize";
import type { Discovery, Goal, PlanScore, PlanScores } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { id: { type: "STRING" }, score: { type: "INTEGER" }, reason: { type: "STRING" } },
        required: ["id", "score", "reason"],
      },
    },
  },
  required: ["items"],
};

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const profile = sanitizeProfile(body.profile);
  const discovery: Discovery = (["mycatch", "balanced", "surprise"] as const).includes(body.discovery as Discovery)
    ? (body.discovery as Discovery) : "mycatch";
  const goal: Goal = (["career", "social", "balanced"] as const).includes(body.goal as Goal) ? (body.goal as Goal) : "balanced";
  const now = laNow();
  const weekOffset = Number(body.weekOffset) === 0 ? 0 : 1;
  const weekStart = addDays(mondayOf(now.date), weekOffset * 7);
  const opportunities = buildOpportunities(now.date);
  const known = new Set(opportunities.map((o) => o.id));
  const caught: Record<string, string> = {};
  for (const [id, st] of Object.entries((body.caught as Record<string, string>) ?? {}))
    if (known.has(id)) caught[id] = ["Saved", "Planning to Apply", "Applied"].includes(st) ? st : "Saved";

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json(fallbackPlanScores(profile, opportunities, "GEMINI_API_KEY is not configured on the server."));

  const { system, user } = buildPlanPrompt({ profile, discovery, goal, caught, weekStart, today: now.date, opportunities });
  const out = await runGemini<PlanScore[]>({
    key, system, user, schema: SCHEMA, temperature: 0.4, timeoutMs: 20000,
    cacheKey: JSON.stringify(["plan", profile, discovery, goal, weekStart, Object.entries(caught).sort()]),
    parse: (raw) => {
      const items = validatePlanScores(raw, opportunities);
      return items.length >= Math.ceil(opportunities.length / 2) ? items : null;
    },
  });
  if (out.ok) {
    const result: PlanScores = { source: "gemini", model: out.model, items: out.data, capturedAt: out.capturedAt, shared: out.shared };
    return NextResponse.json(result);
  }
  return NextResponse.json({ ...fallbackPlanScores(profile, opportunities, out.note), retryAfter: out.retryAfter, limit: out.limit });
}
