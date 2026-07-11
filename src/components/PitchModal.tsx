"use client";

import { useEffect, useRef, useState } from "react";

interface PitchModalProps {
  photoroomUrl: string;
  onClose: () => void;
}

const SECONDS = 14;

export default function PitchModal({ photoroomUrl, onClose }: PitchModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(SECONDS);
  const [photoOk, setPhotoOk] = useState(true);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) {
      window.location.assign(photoroomUrl);
    }
  }, [secondsLeft, photoroomUrl]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="A note from Pablo before you go"
        className="animate-modal-pop relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close and stay here"
          className="absolute right-4 top-4 rounded-full p-1 text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        <div className="flex items-stretch gap-4 pr-5 sm:gap-5">
          {photoOk && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src="/pablo.jpg"
              alt="Pablo Sánchez"
              className="w-24 rounded-xl object-cover sm:w-28"
              onError={() => setPhotoOk(false)}
            />
          )}
          <div className="flex-1">
            <p className="leading-relaxed text-ink">
              One thing before you go. This button is a working referral
              funnel, UTMs included.{" "}
              <span className="font-semibold">
                I built it to apply for the Senior Growth Marketing role.
              </span>
            </p>
            <p className="mt-3 leading-relaxed text-ink">
              Let&apos;s talk:{" "}
              <a
                href="mailto:psm.pablosanchez@gmail.com"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                psm.pablosanchez@gmail.com
              </a>
            </p>
          </div>
        </div>

        <a
          href={photoroomUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="mt-6 inline-flex w-full items-center justify-center rounded-btn bg-accent px-6 py-3.5 text-[15px] font-medium uppercase tracking-wide text-white transition-colors hover:bg-accent-hover"
        >
          Open Photoroom now
        </a>

        <p className="mt-3 text-center text-sm text-muted" aria-live="polite">
          Opening Photoroom in {Math.max(secondsLeft, 0)}…
        </p>
      </div>
    </div>
  );
}
