import type { Timestamp } from "firebase-admin/firestore";

export type RunStatus =
  | "running"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "pushed"
  | "failed";

export type EngineName = "gaussian_copula" | "conditional_histogram";

export type RunMetrics = {
  TSTR: number | null;
  KS_avg: number;
  JS_avg: number;
  DCR_min: number;
};

export type RunDoc = {
  id: string;
  trigger: "manual" | "scheduled";
  source_table: string;
  destination_table: string;
  engine: EngineName;
  retry_count: number;
  status: RunStatus;
  metrics: RunMetrics;
  plot_columns: string[];
  created_at: Timestamp | { _seconds: number; _nanoseconds: number } | string;
  approved_at: Timestamp | null;
  approval_verdict: "approved" | "rejected" | null;
  pushed_at: Timestamp | null;
};

export type RunDocClient = Omit<
  RunDoc,
  "created_at" | "approved_at" | "pushed_at"
> & {
  created_at: string | null;
  approved_at: string | null;
  pushed_at: string | null;
};

// Fidelity gate thresholds (must mirror agent/orchestrator.py)
export const THRESHOLDS = {
  TSTR_MIN: 0.75,
  KS_MAX: 0.15,
  JS_MAX: 0.2, // reported only, not gating
  DCR_MIN: 0.1,
} as const;
