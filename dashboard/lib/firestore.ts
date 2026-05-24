import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _db: Firestore | null = null;

/**
 * Lazy Firestore client. Initialized on first call so that Next.js static
 * analysis at build time doesn't try to authenticate.
 */
export function db(): Firestore {
  if (_db) return _db;
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.GCP_PROJECT_ID || "synth-hackathon-2026",
      credential: applicationDefault(),
    });
  }
  _db = getFirestore();
  return _db;
}

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
