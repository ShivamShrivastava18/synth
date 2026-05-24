import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firestore";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  await db.collection("runs").doc(params.id).update({
    approval_verdict: "rejected",
    approved_at: FieldValue.serverTimestamp(),
    status: "rejected",
  });
  return NextResponse.json({ ok: true });
}
