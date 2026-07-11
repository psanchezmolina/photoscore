import { NextResponse } from "next/server";
import { appendLog } from "@/lib/store-log";

export const runtime = "nodejs";

const ALLOWED_EVENTS = new Set([
  "pageview",
  "audit_started",
  "audit_completed",
  "gate_submitted",
  "referral_click",
]);

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const name = typeof body.name === "string" ? body.name : "";
  if (ALLOWED_EVENTS.has(name)) {
    let props =
      typeof body.props === "object" && body.props !== null
        ? (body.props as Record<string, unknown>)
        : {};
    if (JSON.stringify(props).length > 2000) props = { truncated: true };
    await appendLog("events", { name, props });
  }
  // Always 200: analytics must never surface errors to the client.
  return NextResponse.json({ ok: true });
}
