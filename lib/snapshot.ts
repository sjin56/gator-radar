import type { RecsResult } from "./types";
import snapshot from "../data/demoRecsSnapshot.json";
import { DATASET_ID } from "./opportunities";

/**
 * Genuine Gemini output, captured once for the fictional demo student and shipped with the app so the
 * demo works even when the free daily quota is exhausted. Always shown with a "saved result" label.
 */
export const DEMO_RECS_SNAPSHOT: RecsResult | null =
  (snapshot as RecsResult & { datasetId?: string })?.datasetId === DATASET_ID &&
  (snapshot as RecsResult)?.source === "gemini" && Array.isArray((snapshot as RecsResult).recommendations)
    ? (snapshot as RecsResult)
    : null;
