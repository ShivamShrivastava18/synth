import { initializeApp, cert, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    projectId: process.env.GCP_PROJECT_ID || "synth-hackathon-2026",
    credential: applicationDefault(),
  });
}

export const db = getFirestore();

export function tsToIso(
  ts: FirebaseFirestore.Timestamp | { _seconds: number; _nanoseconds: number } | null | undefined,
): string | null {
  if (!ts) return null;
  if ("toDate" in ts && typeof ts.toDate === "function") {
    return ts.toDate().toISOString();
  }
  if ("_seconds" in ts) {
    return new Date(ts._seconds * 1000).toISOString();
  }
  return null;
}
