"use client";

import { useEffect, useState, type FormEvent } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import SiteFooter from "@/components/SiteFooter";
import AuditLoading from "@/components/AuditLoading";
import GradeResult from "@/components/GradeResult";
import { getUtm, initUtm, trackEvent } from "@/components/analytics";
import type { ApiError, AuditResult } from "@/components/audit";

type Status = "idle" | "loading" | "result" | "error";

interface ErrorState {
  code: string;
  message: string;
}

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [storeUrl, setStoreUrl] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);

  // First load: capture UTM and register a pageview (once).
  useEffect(() => {
    initUtm();
    trackEvent("pageview");
  }, []);

  function reset() {
    setStatus("idle");
    setStoreUrl("");
    setResult(null);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = storeUrl.trim();
    if (!trimmed) return;

    setStatus("loading");
    setError(null);
    trackEvent("audit_started");

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeUrl: trimmed, utm: getUtm() }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        setError({
          code: data?.error ?? "unknown",
          message:
            data?.message ??
            "Something went wrong grading your store. Please try again.",
        });
        setStatus("error");
        return;
      }

      const data = (await res.json()) as AuditResult;
      setResult(data);
      setStatus("result");
      trackEvent("audit_completed", { grade: data.score.grade });
    } catch {
      setError({
        code: "network",
        message:
          "We couldn't reach the grader. Check your connection and try again.",
      });
      setStatus("error");
    }
  }

  // Full-screen loading, no top bar.
  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col bg-hero-gradient">
        <main className="flex flex-1 items-center justify-center">
          <AuditLoading />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (status === "result" && result) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <AnnouncementBar />
        <main className="flex-1">
          <GradeResult result={result} onReset={reset} />
        </main>
        <SiteFooter />
      </div>
    );
  }

  // idle | error -> hero
  return (
    <div className="flex min-h-screen flex-col bg-hero-gradient">
      <AnnouncementBar />
      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:py-16">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight-hero text-ink sm:text-[56px] sm:leading-[1.04]">
            What&apos;s your store&apos;s Photo Score?
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-muted">
            Your product photos, graded in 60 seconds. Free.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex max-w-xl flex-col gap-2.5 sm:flex-row"
          >
            <label htmlFor="store-url" className="sr-only">
              Your Shopify store URL
            </label>
            <input
              id="store-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              value={storeUrl}
              onChange={(e) => {
                setStoreUrl(e.target.value);
                if (status === "error") setError(null);
              }}
              placeholder="https://yourstore.com"
              className="w-full flex-1 rounded-btn border border-ink/10 bg-white px-4 py-3.5 text-[16px] text-ink shadow-sm placeholder:text-muted transition-colors focus:border-sky-border focus:outline-none focus:ring-2 focus:ring-sky-border/30"
            />
            <button
              type="submit"
              disabled={!storeUrl.trim()}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-btn bg-accent px-7 py-3.5 text-[16px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-sky disabled:text-sky-text"
            >
              Get my Photo Score
            </button>
          </form>

          {error && (
            <div
              role="alert"
              className="mx-auto mt-4 max-w-xl rounded-btn bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700"
            >
              {error.message}
              {error.code === "not_shopify" && (
                <span className="mt-1 block font-normal text-red-600">
                  Make sure you pasted your store&apos;s home page, for example
                  https://mystore.com
                </span>
              )}
            </div>
          )}

          <p className="mt-4 text-sm text-muted">
            Free. No signup. ~60 seconds.
          </p>
          <p className="mt-2 text-xs text-muted">
            Built by Pablo Sanchez in one afternoon for the Photoroom growth
            challenge.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
