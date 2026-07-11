import { NextResponse } from "next/server";
import { appendLog } from "@/lib/store-log";
import { sendReportEmail } from "@/lib/send-report";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { error: "invalid_email", message: "That email doesn't look right." },
      { status: 400 },
    );
  }
  const auditId = typeof body.auditId === "string" ? body.auditId.slice(0, 64) : null;

  // The lead is captured first, always: email delivery failing must never
  // lose the signup.
  await appendLog("leads", {
    email,
    auditId,
    storeDomain: typeof body.storeDomain === "string" ? body.storeDomain.slice(0, 200) : null,
    grade: typeof body.grade === "string" ? body.grade.slice(0, 2) : null,
    utm: typeof body.utm === "string" ? body.utm.slice(0, 300) : null,
  });

  let delivery: { sent: boolean; error?: string } = { sent: false, error: "no_audit_id" };
  if (auditId) {
    delivery = await sendReportEmail(email, auditId);
    await appendLog("events", {
      name: "report_email",
      props: { sent: delivery.sent, error: delivery.error ?? null },
    });
  }

  return NextResponse.json({ ok: true, sent: delivery.sent });
}
