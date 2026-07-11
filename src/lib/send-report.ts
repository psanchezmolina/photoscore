import { getAuditById } from "./report";
import type { StoreScore } from "./score";

/**
 * Sends the full-report email via Resend (plain HTTPS, no SDK).
 * No-op unless RESEND_API_KEY and RESEND_FROM are set, so the gate
 * degrades to capture-only when email isn't configured.
 */
const BASE_URL = process.env.PUBLIC_BASE_URL ?? "https://photoscore.pablo.ky";

interface AuditRecord {
  auditId: string;
  store: { name: string; domain: string };
  score: StoreScore & { topFixes: string[] };
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM;
}

export async function sendReportEmail(
  email: string,
  auditId: string,
): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailConfigured()) return { sent: false, error: "not_configured" };

  const audit = (await getAuditById(auditId)) as AuditRecord | null;
  if (!audit) return { sent: false, error: "audit_not_found" };

  const { store, score } = audit;
  const reportUrl = `${BASE_URL}/r/${auditId}?utm_source=report-email`;
  const fixes = score.topFixes ?? [];

  const subject = `Your Photo Score: ${score.grade} for ${store.domain}`;
  const text = [
    `Hi, Pablo here from PhotoScore.`,
    ``,
    `${store.name || store.domain} scored a ${score.grade} (${score.score}/100).`,
    ``,
    `${score.summary}`,
    ``,
    `Your fix checklist, in order of impact:`,
    ...fixes.map((f, i) => `${i + 1}. ${f}`),
    ``,
    `Full report, every product graded:`,
    reportUrl,
    ``,
    `If the grade feels unfair, reply and tell me why. I read everything.`,
    ``,
    `Pablo`,
    ``,
    `--`,
    `I built PhotoScore in an afternoon for Photoroom's public hiring challenge.`,
    `Not affiliated with Photoroom; the "fix it" button uses my referral link.`,
    `You got this one email because you asked for your report. No list, no sequence.`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM,
        to: [email],
        reply_to: process.env.RESEND_REPLY_TO || undefined,
        subject,
        text,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("resend failed", res.status, body.slice(0, 300));
      return { sent: false, error: `resend_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("resend error", err);
    return { sent: false, error: "resend_network" };
  }
}
