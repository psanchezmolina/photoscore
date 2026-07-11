"use client";

import { useState } from "react";
import type { ListingKit } from "@/lib/kit";
import KitBlock from "./KitBlock";
import PitchModal from "./PitchModal";

interface ResultViewProps {
  imageSrc: string;
  kit: ListingKit;
  onStartOver: () => void;
}

const PHOTOROOM_URL =
  "https://www.photoroom.com/?utm_source=listingroom&utm_medium=referral&utm_campaign=listing-kit";

const PITCH_SEEN_KEY = "lr_pitch_seen";

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function ResultView({
  imageSrc,
  kit,
  onStartOver,
}: ResultViewProps) {
  const [showPitch, setShowPitch] = useState(false);

  function handlePhotoroomClick(e: React.MouseEvent<HTMLAnchorElement>) {
    let seen = true;
    try {
      seen = window.localStorage.getItem(PITCH_SEEN_KEY) === "1";
      if (!seen) window.localStorage.setItem(PITCH_SEEN_KEY, "1");
    } catch {
      seen = false; // private mode: still show it once per page load
    }
    if (!seen) {
      e.preventDefault();
      setShowPitch(true);
    }
  }

  const descriptionParagraphs = kit.description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const bulletsCopyText = kit.bullets.map((b) => `• ${b}`).join("\n");
  const adCopyText = kit.adCopy
    .map((ad, i) => `Variant ${i + 1}: ${ad}`)
    .join("\n\n");
  const keywordsCopyText = kit.keywords.join(", ");

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-10">
        {/* Left column */}
        <aside className="lg:col-span-2">
          <div className="lg:sticky lg:top-10 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={kit.productSummary}
                className="h-auto w-full object-contain"
              />
            </div>

            <div className="mt-5 rounded-2xl bg-ink p-6 text-white">
              <p className="text-xs font-medium uppercase tracking-wide text-white/60">
                Your copy is ready. Now the photo:
              </p>
              <p className="mt-2 text-balance text-lg font-semibold leading-snug">
                Remove the background, add a pro backdrop, make it pop.
              </p>
              <a
                href={PHOTOROOM_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handlePhotoroomClick}
                className="mt-5 inline-flex w-full items-center justify-center rounded-btn bg-accent px-6 py-3.5 text-center text-[15px] font-medium uppercase tracking-wide text-white transition-colors hover:bg-accent-hover"
              >
                Open in Photoroom
              </a>
            </div>

            <button
              type="button"
              onClick={onStartOver}
              className="mt-4 inline-flex w-full items-center justify-center rounded-btn border border-ink/10 bg-white px-6 py-3 text-[15px] font-medium text-muted transition-colors hover:border-ink/20 hover:text-ink"
            >
              ← Start over with another product
            </button>
          </div>
        </aside>

        {/* Right column */}
        <div className="lg:col-span-3">
          <header className="mb-6">
            <p className="text-sm font-medium text-muted">
              Your listing kit for
            </p>
            <h2 className="mt-1 text-balance text-2xl font-semibold tracking-tight-hero text-ink sm:text-3xl">
              {capitalize(kit.productSummary)}
            </h2>
          </header>

          <div className="space-y-4">
            <KitBlock label="SEO Title" copyText={kit.title}>
              <p className="font-medium">{kit.title}</p>
            </KitBlock>

            <KitBlock label="Product Description" copyText={kit.description}>
              <div className="space-y-3">
                {descriptionParagraphs.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </KitBlock>

            <KitBlock label="Benefit Bullets" copyText={bulletsCopyText}>
              <ul className="space-y-2">
                {kit.bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-[2px] text-accent" aria-hidden="true">
                      •
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </KitBlock>

            <KitBlock label="Ad Copy Variants" copyText={adCopyText}>
              <div className="space-y-3">
                {kit.adCopy.map((ad, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-ink/10 bg-surface/50 p-4"
                  >
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
                      Variant {i + 1}
                    </p>
                    <p>{ad}</p>
                  </div>
                ))}
              </div>
            </KitBlock>

            <KitBlock label="Social Caption" copyText={kit.socialCaption}>
              <p>{kit.socialCaption}</p>
            </KitBlock>

            <KitBlock label="Keywords" copyText={keywordsCopyText}>
              <div className="flex flex-wrap gap-2">
                {kit.keywords.map((keyword, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-surface px-3 py-1 text-sm font-medium text-ink"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </KitBlock>
          </div>
        </div>
      </div>

      {showPitch && (
        <PitchModal
          photoroomUrl={PHOTOROOM_URL}
          onClose={() => setShowPitch(false)}
        />
      )}
    </div>
  );
}
