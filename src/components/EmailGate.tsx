"use client";

import { useState, type FormEvent } from "react";
import { getUtm, trackEvent } from "./analytics";

interface EmailGateProps {
  auditId: string;
  storeDomain: string;
  grade: string;
}

type GateStatus = "idle" | "sending" | "sent" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailGate({
  auditId,
  storeDomain,
  grade,
}: EmailGateProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<GateStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Please enter a valid email address.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          auditId,
          storeDomain,
          grade,
          utm: getUtm(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          data?.message ?? "Could not send right now. Please try again."
        );
      }
      trackEvent("gate_submitted");
      setStatus("sent");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not send right now. Please try again."
      );
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-sky-border bg-sky p-5 text-center sm:p-6">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <p className="text-base font-semibold text-ink">
          Sent. Check your inbox soon.
        </p>
        <p className="mt-1 text-sm text-muted">
          Your full per-product report and fix checklist are on the way.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-semibold text-ink">
        Get the full per-product report + the fixes as a checklist
      </h3>
      <p className="mt-1 text-sm text-muted">
        One email. Every product, every fix, in order of impact.
      </p>
      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-2.5 sm:flex-row"
      >
        <label htmlFor="ps-email" className="sr-only">
          Email address
        </label>
        <input
          id="ps-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") {
              setStatus("idle");
              setError(null);
            }
          }}
          placeholder="you@store.com"
          className="w-full flex-1 rounded-btn border border-ink/10 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-muted transition-colors focus:border-sky-border focus:outline-none focus:ring-2 focus:ring-sky-border/30"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex items-center justify-center rounded-btn bg-accent px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-sky disabled:text-sky-text sm:w-auto"
        >
          {status === "sending" ? "Sending…" : "Send it"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <p className="mt-2.5 text-xs text-muted">
        One email, no spam. No account needed.
      </p>
    </div>
  );
}
