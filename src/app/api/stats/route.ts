import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");

async function readJsonl(file: string): Promise<Record<string, unknown>[]> {
  try {
    const raw = await readFile(path.join(DATA_DIR, `${file}.jsonl`), "utf-8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Record<string, unknown>);
  } catch {
    return [];
  }
}

function countBy(rows: Record<string, unknown>[], key: string) {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = String(r[key] ?? "none");
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/** Funnel numbers, protected: requires x-ps-key header matching INTERNAL_KEY. */
export async function GET(req: Request) {
  const internalKey = process.env.INTERNAL_KEY;
  if (!internalKey || req.headers.get("x-ps-key") !== internalKey) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const [events, audits, leads] = await Promise.all([
    readJsonl("events"),
    readJsonl("audits"),
    readJsonl("leads"),
  ]);
  const byName = countBy(events, "name");
  return NextResponse.json({
    funnel: {
      pageviews: byName.pageview ?? 0,
      auditsStarted: byName.audit_started ?? 0,
      auditsCompleted: audits.filter((a) => !a.internal).length,
      auditsInternal: audits.filter((a) => a.internal).length,
      leads: leads.length,
      referralClicks: byName.referral_click ?? 0,
    },
    auditsByGrade: countBy(audits, "grade"),
    leadsByUtm: countBy(leads, "utm"),
    leads: leads.map((l) => ({
      ts: l.ts,
      email: l.email,
      storeDomain: l.storeDomain,
      grade: l.grade,
      utm: l.utm,
    })),
  });
}
