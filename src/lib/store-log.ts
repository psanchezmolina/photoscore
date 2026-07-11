import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Append-only JSONL persistence. DATA_DIR should point at a mounted volume
 * in production so leads survive redeploys; defaults to ./data locally.
 */
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");

export type LogFile = "leads" | "audits" | "events";

export async function appendLog(
  file: LogFile,
  record: Record<string, unknown>,
): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), ...record });
  await appendFile(path.join(DATA_DIR, `${file}.jsonl`), line + "\n", "utf-8");
}
