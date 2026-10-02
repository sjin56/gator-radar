import { NextResponse } from "next/server";
import { laNow } from "@/lib/dates";
import { buildOpportunities } from "@/lib/opportunities";
import { asFallback, buildPrompt, validateRecs } from "@/lib/recommend";
import { sanitizeProfile as sanitize } from "@/lib/sanitize";
import type { RecsResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELS = [process.env.GEMINI_MODEL || "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const profile = sanitize((body as { profile?: unknown })?.profile);
  const opportunities = buildOpportunities(laNow().date);

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    const r: RecsResult = asFallback(profile, opportunities, "GEMINI_API_KEY is not configured on the server.");
    return NextResponse.json(r);
  }

  const { system, user } = buildPrompt(profile, opportunities);
  const call = (model: string) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: AbortSignal.timeout(14000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                recommendations: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      id: { type: "STRING" },
                      score: { type: "INTEGER" },
                      reason: { type: "STRING" },
                    },
                    required: ["id", "score", "reason"],
                  },
                },
              },
              required: ["recommendations"],
            },
          },
        }),
      },
    );

  try {
    let lastStatus = 0;
    for (const model of [...new Set(MODELS)]) {
      let res: Response;
      try {
        res = await call(model);
      } catch {
        lastStatus = 408;
        console.error("Gemini timeout/network error, model:", model);
        continue;
      }
      if (res.ok) {
        const data = await res.json();
        const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const recs = validateRecs(JSON.parse(text ?? "{}"), opportunities);
        if (!recs.length) {
          return NextResponse.json(asFallback(profile, opportunities, "Gemini returned no valid recommendations."));
        }
        const result: RecsResult = { source: "gemini", model, recommendations: recs };
        return NextResponse.json(result);
      }
      lastStatus = res.status;
      console.error("Gemini HTTP", res.status, "model:", model);
      if (res.status === 429) break; // rate limited: another model call would not help and wastes quota
    }
    const note =
      lastStatus === 429
        ? "Gemini free-tier rate limit reached. Wait a minute, then press Regenerate."
        : `Gemini request failed (HTTP ${lastStatus}).`;
    return NextResponse.json(asFallback(profile, opportunities, note));
  } catch (e) {
    console.error("Gemini error", e instanceof Error ? e.message : e);
    return NextResponse.json(asFallback(profile, opportunities, "Gemini was unreachable or timed out."));
  }
}
