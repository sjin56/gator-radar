import { NextResponse } from "next/server";
import { addDays, laNow, mondayOf } from "@/lib/dates";
import { buildOpportunities } from "@/lib/opportunities";
import { buildPlanPrompt, fallbackPlanScores, validatePlanScores } from "@/lib/planAI";
import { sanitizeProfile } from "@/lib/sanitize";
import type { Discovery, Goal, PlanScores } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELS = [process.env.GEMINI_MODEL || "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];

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
  const call = (model: string) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: {
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
          },
        },
      }),
    });

  let lastStatus = 0;
  for (const model of [...new Set(MODELS)]) {
    let res: Response;
    try {
      res = await call(model);
    } catch {
      lastStatus = 408;
      console.error("Gemini plan timeout/network error, model:", model);
      continue;
    }
    if (res.ok) {
      try {
        const data = await res.json();
        const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const items = validatePlanScores(JSON.parse(text ?? "{}"), opportunities);
        if (items.length >= Math.ceil(opportunities.length / 2)) {
          const result: PlanScores = { source: "gemini", model, items };
          return NextResponse.json(result);
        }
        lastStatus = 422;
      } catch {
        lastStatus = 422;
      }
      continue;
    }
    lastStatus = res.status;
    console.error("Gemini plan HTTP", res.status, "model:", model);
    if (res.status === 429) break;
  }
  const note =
    lastStatus === 429
      ? "Gemini free-tier rate limit reached. Wait a minute, then press Generate again."
      : `Gemini was unavailable (code ${lastStatus}).`;
  return NextResponse.json(fallbackPlanScores(profile, opportunities, note));
}
