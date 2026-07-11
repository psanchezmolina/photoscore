"use client";

import { useEffect } from "react";
import type { AuditResult } from "./audit";
import GradeResult from "./GradeResult";
import AnnouncementBar from "./AnnouncementBar";
import { initUtm, trackEvent } from "./analytics";

/** Shareable report page body: same result view, reset goes home. */
export default function ReportView({ result }: { result: AuditResult }) {
  useEffect(() => {
    initUtm();
    trackEvent("pageview", { page: "report", domain: result.store.domain });
  }, [result.store.domain]);

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <main className="flex-1">
        <GradeResult
          result={result}
          onReset={() => {
            window.location.href = "/";
          }}
        />
      </main>
    </div>
  );
}
