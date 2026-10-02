import { NextResponse } from "next/server";
import { laNow } from "@/lib/dates";
import { buildOpportunities } from "@/lib/opportunities";
import { asFallback, buildPrompt, validateRecs } from "@/lib/recommend";
import { INTERESTS, type Commitment, type Interest, type Profile, type RecsResult } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/** Re-build a clean Profile from untrusted JSON. */
function sanitizeProfile(body: unknown): Profile {
  const p = (body as { profile?: Partial<Profile> })?.profile ?? {};
  const interests = (Array.isArray(p.interests) ? p.interests : []).filter((i): i is Interest =>
    (INTERESTS as readonly string[]).includes(i as string),
  );
  const commitments: Commitment[] = (Array.isArray(p.commitments) ? p.commitments : [])
    .slice(0, 20)
    .map((c, i) => ({
      id: `c${i}`,
      title: String(c?.title ?? "").slice(0, 60),
      days: (Array.isArray(c?.days) ? c.days : []).map(Number).filter((d) => d >= 1 && d <= 5),
      start: Math.max(0, Math.min(1439, Number(c?.start) || 0)),
      end: Math.max(0, Math.min(1439, Number(c?.end) || 0)),
      kind: c?.kind === "other" ? "other" : "class",
    }));
  return {
    interests,
    academicFocus: String(p.academicFocus ?? "").slice(0, 200),
    careerGoals: String(p.careerGoals ?? "").slice(0, 500),
    commitments,
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const profile = sanitizeProfile(body);
  const opportunities = buildOpportunities(laNow().date);

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    const r: RecsResult = asFallback(profile, opportunities, "GEMINI_API_KEY is not configured on the server.");
    return NextResponse.json(r);
  }

  const { system, user } = buildPrompt(profile, opportunities);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: AbortSignal.timeout(25000),
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
    if (!res.ok) {
      console.error("Gemini HTTP", res.status, (await res.text()).slice(0, 300));
      return NextResponse.json(asFallback(profile, opportunities, `Gemini request failed (HTTP ${res.status}).`));
    }
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const recs = validateRecs(JSON.parse(text ?? "{}"), opportunities);
    if (!recs.length) {
      return NextResponse.json(asFallback(profile, opportunities, "Gemini returned no valid recommendations."));
    }
    const result: RecsResult = { source: "gemini", model: MODEL, recommendations: recs };
    return NextResponse.json(result);
  } catch (e) {
    console.error("Gemini error", e instanceof Error ? e.message : e);
    return NextResponse.json(asFallback(profile, opportunities, "Gemini was unreachable or timed out."));
  }
}
