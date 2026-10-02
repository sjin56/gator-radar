import type { LimitKind } from "./types";

/** Server-only helper shared by /api/recommend and /api/plan. */
const MODELS = () => [...new Set([process.env.GEMINI_MODEL || "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"])];
const CACHE_TTL_MS = 12 * 3600 * 1000;
const MAX_QUOTA_COOLDOWN_S = 3 * 3600;

type Hit = { at: number; model: string; data: unknown; capturedAt: string };
const cache = new Map<string, Hit>();
const inflight = new Map<string, Promise<GeminiOutcome<unknown>>>();
/** Models whose quota is known to be used up, until this epoch ms (quotas are per model). */
const exhaustedUntil = new Map<string, number>();

export type GeminiOutcome<T> =
  | { ok: true; model: string; data: T; shared: boolean; capturedAt: string }
  | { ok: false; status: number; retryAfter: number; limit: LimitKind; note: string };

export function humanDuration(s: number) {
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.ceil(s / 60)} min`;
  return `${Math.max(1, Math.ceil(s))}s`;
}

function parseQuota(body: string): { retryAfter: number; limit: LimitKind } {
  let retryAfter = 60;
  let limit: LimitKind = "unknown";
  try {
    const details: Array<Record<string, unknown>> = JSON.parse(body)?.error?.details ?? [];
    for (const d of details) {
      const type = String(d["@type"] ?? "");
      if (type.endsWith("RetryInfo")) {
        const m = String(d.retryDelay ?? "").match(/([\d.]+)s/);
        if (m) retryAfter = Math.ceil(Number(m[1]));
      }
      if (type.endsWith("QuotaFailure")) {
        const id = String((d.violations as Array<{ quotaId?: string }> | undefined)?.[0]?.quotaId ?? "");
        limit = /PerDay/i.test(id) ? "daily" : /Token/i.test(id) ? "tpm" : /PerMinute/i.test(id) ? "rpm" : "unknown";
      }
    }
  } catch {
    /* keep defaults */
  }
  return { retryAfter: Math.min(retryAfter, MAX_QUOTA_COOLDOWN_S), limit };
}

export async function runGemini<T>(opts: {
  key: string;
  cacheKey: string;
  system: string;
  user: string;
  schema: unknown;
  temperature: number;
  timeoutMs: number;
  parse: (raw: unknown) => T | null;
}): Promise<GeminiOutcome<T>> {
  const hit = cache.get(opts.cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS)
    return { ok: true, model: hit.model, data: hit.data as T, shared: true, capturedAt: hit.capturedAt };

  const pending = inflight.get(opts.cacheKey);
  if (pending) return (await pending) as GeminiOutcome<T>;

  const job = (async (): Promise<GeminiOutcome<T>> => {
    let worst: { status: number; retryAfter: number; limit: LimitKind } | null = null;
    let soonest = Infinity;
    for (const model of MODELS()) {
      const until = exhaustedUntil.get(model) ?? 0;
      if (until > Date.now()) {
        soonest = Math.min(soonest, Math.ceil((until - Date.now()) / 1000));
        worst = worst ?? { status: 429, retryAfter: 0, limit: "daily" };
        continue; // known exhausted: don't spend a request
      }
      let res: Response;
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": opts.key },
          signal: AbortSignal.timeout(opts.timeoutMs),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: opts.system }] },
            contents: [{ role: "user", parts: [{ text: opts.user }] }],
            generationConfig: { temperature: opts.temperature, responseMimeType: "application/json", responseSchema: opts.schema },
          }),
        });
      } catch {
        console.error("Gemini timeout/network error, model:", model);
        worst = worst ?? { status: 408, retryAfter: 20, limit: "unknown" };
        continue;
      }
      if (res.ok) {
        try {
          const data = await res.json();
          const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          const parsed = opts.parse(JSON.parse(text ?? "{}"));
          if (parsed) {
            const capturedAt = new Date().toISOString();
            cache.set(opts.cacheKey, { at: Date.now(), model, data: parsed, capturedAt });
            return { ok: true, model, data: parsed, shared: false, capturedAt };
          }
        } catch {
          /* fall through to next model */
        }
        worst = { status: 422, retryAfter: 20, limit: "unknown" };
        continue;
      }
      if (res.status === 429) {
        const q = parseQuota(await res.text());
        console.error("Gemini 429", model, q.limit, `retry ${q.retryAfter}s`);
        if (q.limit === "daily") exhaustedUntil.set(model, Date.now() + q.retryAfter * 1000);
        soonest = Math.min(soonest, q.retryAfter);
        worst = { status: 429, retryAfter: q.retryAfter, limit: q.limit };
        continue; // quotas are per model: try the next one
      }
      console.error("Gemini HTTP", res.status, "model:", model);
      worst = { status: res.status, retryAfter: 30, limit: "unknown" };
    }
    const w = worst ?? { status: 500, retryAfter: 30, limit: "unknown" as LimitKind };
    const retryAfter = Number.isFinite(soonest) ? soonest : w.retryAfter;
    const note =
      w.status === 429 && w.limit === "daily"
        ? `Gemini's free daily quota is used up (resets in about ${humanDuration(retryAfter)}).`
        : w.status === 429
          ? `Gemini is rate limited right now (retry in about ${humanDuration(retryAfter)}).`
          : `Gemini was temporarily unavailable (code ${w.status}).`;
    return { ok: false, status: w.status, retryAfter, limit: w.limit, note };
  })();

  inflight.set(opts.cacheKey, job as Promise<GeminiOutcome<unknown>>);
  try {
    return await job;
  } finally {
    inflight.delete(opts.cacheKey);
  }
}
