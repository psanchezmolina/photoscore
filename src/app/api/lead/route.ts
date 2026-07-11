import { NextResponse } from "next/server";
import { appendLog } from "@/lib/store-log";

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
  await appendLog("leads", {
    email,
    auditId: typeof body.auditId === "string" ? body.auditId.slice(0, 64) : null,
    storeDomain: typeof body.storeDomain === "string" ? body.storeDomain.slice(0, 200) : null,
    grade: typeof body.grade === "string" ? body.grade.slice(0, 2) : null,
    utm: typeof body.utm === "string" ? body.utm.slice(0, 300) : null,
  });
  return NextResponse.json({ ok: true });
}
