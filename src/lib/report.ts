import { readFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** Loads a persisted audit result by id from the audits JSONL log. */
export async function getAuditById(id: string): Promise<unknown | null> {
  if (!UUID_RE.test(id)) return null;
  let raw: string;
  try {
    raw = await readFile(path.join(DATA_DIR, "audits.jsonl"), "utf-8");
  } catch {
    return null;
  }
  // Scan from the end: recent audits are the ones being shared.
  const lines = raw.split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const rec = JSON.parse(lines[i]) as { auditId?: string; result?: unknown };
      if (rec.auditId === id && rec.result) return rec.result;
    } catch {
      continue;
    }
  }
  return null;
}
