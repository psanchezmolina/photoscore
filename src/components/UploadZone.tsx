"use client";

import { useCallback, useRef, useState } from "react";

export interface ImagePayload {
  base64: string;
  mediaType: string;
  previewUrl: string;
}

interface UploadZoneProps {
  image: ImagePayload | null;
  onImage: (img: ImagePayload) => void;
  onError: (msg: string) => void;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

export default function UploadZone({ image, onImage, onError }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        onError("That file type isn't supported. Please use JPEG, PNG, WebP or GIF.");
        return;
      }
      if (file.size > MAX_BYTES) {
        onError("That image is over 5MB. Please pick a smaller file.");
        return;
      }
      const reader = new FileReader();
      reader.onerror = () =>
        onError("We couldn't read that file. Please try another one.");
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          onError("We couldn't read that file. Please try another one.");
          return;
        }
        const base64 = result.split(",")[1] ?? "";
        if (!base64) {
          onError("We couldn't read that file. Please try another one.");
          return;
        }
        onImage({ base64, mediaType: file.type, previewUrl: result });
      };
      reader.readAsDataURL(file);
    },
    [onImage, onError],
  );

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={
        image ? "Click or drop to replace the photo" : "Upload a product photo"
      }
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragActive(false);
      }}
      onDrop={onDrop}
      className={[
        "group flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
        dragActive
          ? "border-sky-border bg-sky"
          : "border-ink/15 bg-white hover:border-sky-border hover:bg-sky/50",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.previewUrl}
            alt="Your product"
            className="max-h-40 w-auto rounded-lg object-contain shadow-sm"
          />
          <p className="text-sm font-medium text-muted">
            Click or drop to replace the photo
          </p>
        </>
      ) : (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface transition-colors group-hover:bg-sky">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-ink">
              Drop your product photo here
            </h3>
            <p className="text-sm text-muted">
              or click to browse · JPEG, PNG, WebP or GIF · up to 5MB
            </p>
          </div>
        </>
      )}
    </div>
  );
}
