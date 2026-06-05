import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AGENT_URL =
  process.env.AGENT_TRIGGER_URL ||
  "https://synth-agent-tools-983648391385.us-central1.run.app/agent/trigger";

export async function POST() {
  const resp = await fetch(AGENT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_table: "loan_applications",
      destination_table: "loan_applications",
      target_col: "loan_status",
    }),
  });
  if (!resp.ok) {
    return NextResponse.json(
      { error: `agent service returned ${resp.status}`, body: await resp.text() },
      { status: 502 },
    );
  }
  return NextResponse.json(await resp.json());
}
