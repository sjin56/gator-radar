import { NextResponse } from "next/server";
import { laNow, mondayOf } from "@/lib/dates";
import { buildOpportunities } from "@/lib/opportunities";

/** No fabricated popularity: without the shared database there are simply no counts. */
const DEMO_COUNTS: Record<string, { total: number; week: number }> = {};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLLECTION = "catches";

/** Firestore is enabled only when a project id is configured. */
const enabled = () => Boolean(process.env.FIRESTORE_PROJECT_ID);

async function db() {
  const { getApps, initializeApp, applicationDefault } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const app = getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId: process.env.FIRESTORE_PROJECT_ID });
  return getFirestore(app);
}

type Counts = Record<string, { total: number; week: number }>;

export async function GET() {
  const ids = buildOpportunities(laNow().date).map((o) => o.id);
  if (!enabled()) {
    return NextResponse.json({ mode: "demo", counts: DEMO_COUNTS });
  }
  try {
    const firestore = await db();
    const weekStart = mondayOf(laNow().date);
    const snap = await firestore.collection(COLLECTION).where("active", "==", true).get();
    const counts: Counts = Object.fromEntries(ids.map((id) => [id, { total: 0, week: 0 }]));
    snap.forEach((doc) => {
      const d = doc.data();
      const c = counts[d.opportunityId as string];
      if (!c) return;
      c.total++;
      if (typeof d.caughtDate === "string" && d.caughtDate >= weekStart) c.week++;
    });
    return NextResponse.json({ mode: "firestore", counts });
  } catch (e) {
    console.error("Firestore GET failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ mode: "demo", counts: DEMO_COUNTS, note: "Firestore unavailable" });
  }
}

export async function POST(req: Request) {
  let body: { opportunityId?: unknown; visitorId?: unknown; active?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { opportunityId, visitorId, active } = body;
  const valid = buildOpportunities(laNow().date).some((o) => o.id === opportunityId);
  if (!valid || typeof visitorId !== "string" || !UUID.test(visitorId) || typeof active !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!enabled()) return NextResponse.json({ mode: "demo", ok: true });

  try {
    const firestore = await db();
    const { FieldValue } = await import("firebase-admin/firestore");
    // One deterministic document per (visitor, opportunity): repeated saves cannot inflate counts.
    const ref = firestore.collection(COLLECTION).doc(`${opportunityId}__${visitorId}`);
    await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const wasActive = snap.exists && snap.data()?.active === true;
      if (active && !wasActive) {
        tx.set(ref, {
          opportunityId, visitorId, active: true,
          caughtDate: laNow().date, caughtAt: FieldValue.serverTimestamp(),
        });
      } else if (!active && wasActive) {
        tx.update(ref, { active: false, releasedAt: FieldValue.serverTimestamp() });
      }
    });
    return NextResponse.json({ mode: "firestore", ok: true });
  } catch (e) {
    console.error("Firestore POST failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not record catch" }, { status: 502 });
  }
}
