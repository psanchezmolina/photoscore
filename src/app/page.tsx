"use client";

import { useState } from "react";
import type { ListingKit } from "@/lib/kit";
import ModeToggle, { type InputMode } from "@/components/ModeToggle";
import UploadZone, { type ImagePayload } from "@/components/UploadZone";
import UrlInput from "@/components/UrlInput";
import ContextInput from "@/components/ContextInput";
import LoadingState from "@/components/LoadingState";
import ResultView from "@/components/ResultView";

type Status = "idle" | "generating" | "result" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [mode, setMode] = useState<InputMode>("photo");
  const [image, setImage] = useState<ImagePayload | null>(null);
  const [url, setUrl] = useState("");
  const [context, setContext] = useState("");
  const [kit, setKit] = useState<ListingKit | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateDisabled =
    (mode === "photo" && !image) || (mode === "url" && !url.trim());

  function startOver() {
    setStatus("idle");
    setMode("photo");
    setImage(null);
    setUrl("");
    setContext("");
    setKit(null);
    setResultImage(null);
    setError(null);
  }

  async function handleGenerate() {
    if (mode === "photo" && !image) return;
    if (mode === "url" && url.trim() === "") return;
    setStatus("generating");
    setError(null);
    try {
      const payload =
        mode === "photo"
          ? {
              imageBase64: image!.base64,
              mediaType: image!.mediaType,
              extraContext: context || undefined,
            }
          : { url: url.trim(), extraContext: context || undefined };
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.error === "string" && data.error.startsWith("scrape_")) {
          setMode("photo"); // fallback: one tap from photo upload
        }
        throw new Error(data.message ?? "Something went wrong. Please try again.");
      }
      setKit(data.kit);
      setResultImage(mode === "photo" ? image!.previewUrl : data.image);
      setStatus("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "result" && kit && resultImage) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <TopBar />
        <main className="flex-1">
          <ResultView
            imageSrc={resultImage}
            kit={kit}
            onStartOver={startOver}
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (status === "generating") {
    return (
      <div className="flex min-h-screen flex-col bg-hero-gradient">
        <main className="flex flex-1 items-center justify-center px-5">
          <LoadingState />
        </main>
        <Footer />
      </div>
    );
  }

  // idle | error
  return (
    <div className="flex min-h-screen flex-col bg-hero-gradient">
      <TopBar />
      <main className="flex flex-1 items-start justify-center px-5 py-8 sm:py-10">
        <div className="w-full max-w-xl">
          <header className="text-center">
            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight-hero text-ink sm:text-[44px] sm:leading-[1.05]">
              Turn a product {mode === "photo" ? "photo" : "link"} into a
              ready-to-paste listing kit
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-muted">
              SEO title, description, bullets, ad copy, caption and keywords,
              generated from your real product in seconds. Free.
            </p>
          </header>

          <div className="mt-6 rounded-3xl border border-ink/10 bg-white/70 p-5 shadow-sm backdrop-blur-sm sm:p-6">
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-btn bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </div>
            )}

            <div className="flex justify-center">
              <ModeToggle mode={mode} onChange={setMode} />
            </div>

            <div className="mt-6">
              {mode === "photo" ? (
                <UploadZone
                  image={image}
                  onImage={(img) => {
                    setImage(img);
                    if (status === "error") {
                      setError(null);
                      setStatus("idle");
                    }
                  }}
                  onError={(msg) => {
                    setError(msg);
                    setStatus("error");
                  }}
                />
              ) : (
                <UrlInput value={url} onChange={setUrl} />
              )}
            </div>

            <div className="mt-4">
              <ContextInput value={context} onChange={setContext} />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generateDisabled}
              className="mt-4 inline-flex w-full items-center justify-center rounded-btn bg-accent px-8 py-3.5 text-[16px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-sky disabled:text-sky-text"
            >
              Generate my listing kit
            </button>

            <p className="mt-2.5 text-center text-xs text-muted">
              No sign-up required · Your photo never leaves the generation step.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function TopBar() {
  return (
    <header className="bg-accent py-2.5 text-center">
      <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
        ListingRoom
      </span>
    </header>
  );
}

function Footer() {
  return (
    <footer className="px-5 py-4 text-center text-xs text-muted">
      Made with ♥ by{" "}
      <a
        href="https://pablo.ky"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-ink underline-offset-2 transition-colors hover:text-accent hover:underline"
      >
        Pablo Sánchez
      </a>{" "}
      to join the Photoroom Growth team · Not affiliated with Photoroom
    </footer>
  );
}
