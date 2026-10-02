import { NextResponse } from "next/server";
import { laNow } from "@/lib/dates";
import { runGemini } from "@/lib/gemini";
import { buildOpportunities, DATASET_ID } from "@/lib/opportunities";
import { asFallback, buildPrompt, validateRecs } from "@/lib/recommend";
import { sanitizeProfile } from "@/lib/sanitize";
import type { Recommendation, RecsResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    recommendations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { id: { type: "STRING" }, score: { type: "INTEGER" }, reason: { type: "STRING" } },
        required: ["id", "score", "reason"],
      },
    },
  },
  required: ["recommendations"],
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const profile = sanitizeProfile((body as { profile?: unknown })?.profile);
  const now = laNow();
  const opportunities = buildOpportunities(now.date);

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json(asFallback(profile, opportunities, "GEMINI_API_KEY is not configured on the server."));

  const { system, user } = buildPrompt(profile, opportunities);
  const out = await runGemini<Recommendation[]>({
    key, system, user, schema: SCHEMA, temperature: 0.3, timeoutMs: 14000,
    // identical profiles on the same day share one Gemini result (protects the free daily quota)
    cacheKey: JSON.stringify([DATASET_ID, "recs", profile.interests, profile.academicFocus, profile.careerGoals, profile.commitments]),
    parse: (raw) => {
      const recs = validateRecs(raw, opportunities);
      return recs.length ? recs : null;
    },
  });
  if (out.ok) {
    const result: RecsResult = {
      source: "gemini", model: out.model, recommendations: out.data, capturedAt: out.capturedAt, shared: out.shared,
    };
    return NextResponse.json(result);
  }
  return NextResponse.json({ ...asFallback(profile, opportunities, out.note), retryAfter: out.retryAfter, limit: out.limit });
}
