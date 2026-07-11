# ListingRoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship ListingRoom — a free web tool that turns a product photo (or product page URL) into a ready-to-paste listing kit — to listingroom.pablo.ky in one day.

**Architecture:** Next.js 14 App Router single-page app with two API routes. `/api/generate` calls the Claude API (vision + structured outputs) server-side. URL mode scrapes Shopify JSON / OG tags server-side and feeds the same pipeline. Zero persistence; in-memory rate limiting; Docker standalone deploy on Easypanel.

**Tech Stack:** Next.js 14 + TypeScript + Tailwind CSS, `@anthropic-ai/sdk` (model `claude-opus-4-8`), cheerio, vitest, Docker multi-stage.

**Spec:** `docs/superpowers/specs/2026-06-12-listingroom-design.md`

**Conventions for every commit:** no Co-Authored-By lines. Commit messages in English, conventional-commit style.

---

## File structure (final state)

```
listingroom/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example                  # ANTHROPIC_API_KEY=
├── .gitignore
├── next.config.mjs               # output: "standalone"
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── docs/
│   ├── superpowers/specs|plans/  # (already exist)
│   └── design-notes.md           # Photoroom design recon output
├── public/                       # favicon, og image (optional)
├── src/
│   ├── app/
│   │   ├── layout.tsx            # fonts, metadata
│   │   ├── globals.css
│   │   ├── page.tsx              # state machine idle|generating|result|error
│   │   └── api/generate/route.ts # photo mode + URL mode
│   ├── components/
│   │   ├── UploadZone.tsx
│   │   ├── ContextInput.tsx
│   │   ├── LoadingState.tsx
│   │   ├── ResultView.tsx        # contains CTA card
│   │   ├── KitBlock.tsx          # block + copy button
│   │   ├── ModeToggle.tsx        # Block B
│   │   └── UrlInput.tsx          # Block B
│   └── lib/
│       ├── kit.ts                # ListingKit type, JSON schema, parseKit
│       ├── claude.ts             # generateKit()
│       ├── rate-limit.ts
│       └── scrape.ts             # Block B
└── tests/
    ├── kit.test.ts
    ├── rate-limit.test.ts
    ├── claude-prompt.test.ts
    └── scrape.test.ts            # Block B
```

---

# BLOCK A — Photo MVP (build, deploy, verify)

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "listingroom",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.78.0",
    "cheerio": "^1.2.0",
    "next": "^14.2.35",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^25.3.5",
    "@types/react": "^18.3.28",
    "@types/react-dom": "^18.3.7",
    "autoprefixer": "^10.4.27",
    "eslint": "^8.57.1",
    "eslint-config-next": "^14.2.35",
    "postcss": "^8.5.8",
    "tailwindcss": "^3.4.19",
    "typescript": "^5.9.3",
    "vitest": "^4.0.18"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 4: Create `postcss.config.mjs`**

```js
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

- [ ] **Step 5: Create `tailwind.config.ts`** (tokens are a starting point; Task 2 may adjust)

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16161A",
        muted: "#6B6B76",
        surface: "#F7F7F8",
        accent: "#4D61FC",
        "accent-dark": "#3A4BE0",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 6: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules
.next
out
.env.local
.env*.local
tsconfig.tsbuildinfo
next-env.d.ts
.temp
```

- [ ] **Step 8: Create `.env.example`**

```
# Anthropic API key (server-side only, never exposed to the client)
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 9: Create `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-white text-ink antialiased;
}
```

- [ ] **Step 10: Create `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "ListingRoom — Turn a product photo into a ready-to-paste listing kit",
  description:
    "Free AI tool for e-commerce sellers: upload a product photo and get an SEO title, description, benefit bullets, ad copy, social caption and keywords in seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans" style={{ fontFamily: "var(--font-jakarta), system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 11: Create placeholder `src/app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-bold">ListingRoom</h1>
    </main>
  );
}
```

- [ ] **Step 12: Install and verify dev server**

Run: `npm install`
Then: `npm run dev` → open http://localhost:3000, expect "ListingRoom" heading. Stop the server.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 14 + Tailwind + vitest project"
```

---

### Task 2: Photoroom design recon

**Files:**
- Create: `docs/design-notes.md`
- Possibly modify: `tailwind.config.ts`, `src/app/layout.tsx` (font), `src/app/globals.css`

- [ ] **Step 1: Visit photoroom.com with Playwright MCP** (`mcp__playwright__browser_navigate` → `https://www.photoroom.com`, take screenshot, snapshot). Note: primary background color, text/ink color, accent color(s), button shape (radius), font family (inspect via `mcp__playwright__browser_evaluate` running `getComputedStyle(document.body).fontFamily` and on a primary button: background-color, border-radius).

- [ ] **Step 2: Write findings to `docs/design-notes.md`** — actual hex values, font stack, radius, spacing feel, and 3-5 adjectives for the visual direction. Include what we adopt vs. deliberately diverge from (we evoke the family, we don't clone).

- [ ] **Step 3: Update `tailwind.config.ts` tokens and the Google font in `layout.tsx`** to match the findings (pick the closest available Google Font to Photoroom's typeface; if inconclusive keep Plus Jakarta Sans).

- [ ] **Step 4: Commit**

```bash
git add docs/design-notes.md tailwind.config.ts src/app/layout.tsx src/app/globals.css
git commit -m "docs: Photoroom design recon and token alignment"
```

---

### Task 3: Kit types, JSON schema, and validator (TDD)

**Files:**
- Create: `src/lib/kit.ts`
- Test: `tests/kit.test.ts`

- [ ] **Step 1: Write the failing test `tests/kit.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { parseKit } from "@/lib/kit";

const validKit = {
  productSummary: "handmade ceramic mug",
  title: "Handmade Ceramic Coffee Mug — Speckled Glaze, 12oz",
  description: "Start your morning right...",
  bullets: ["b1", "b2", "b3", "b4", "b5"],
  adCopy: ["ad1", "ad2", "ad3"],
  socialCaption: "Morning ritual, upgraded ☕",
  keywords: ["ceramic mug", "handmade mug"],
};

describe("parseKit", () => {
  it("accepts a valid kit", () => {
    expect(parseKit(validKit)).toEqual(validKit);
  });

  it("trims strings and drops empty array entries", () => {
    const kit = parseKit({
      ...validKit,
      title: "  padded  ",
      keywords: ["ceramic mug", "", "  "],
    });
    expect(kit.title).toBe("padded");
    expect(kit.keywords).toEqual(["ceramic mug"]);
  });

  it("rejects a non-object", () => {
    expect(() => parseKit(null)).toThrow();
    expect(() => parseKit("hi")).toThrow();
  });

  it("rejects missing required fields", () => {
    const { title, ...rest } = validKit;
    expect(() => parseKit(rest)).toThrow(/title/);
  });

  it("rejects empty bullets array", () => {
    expect(() => parseKit({ ...validKit, bullets: [] })).toThrow(/bullets/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/kit.test.ts`
Expected: FAIL — cannot resolve `@/lib/kit`.

- [ ] **Step 3: Implement `src/lib/kit.ts`**

```ts
export interface ListingKit {
  productSummary: string;
  title: string;
  description: string;
  bullets: string[];
  adCopy: string[];
  socialCaption: string;
  keywords: string[];
}

// JSON Schema for Claude structured outputs.
// Note: exact item counts (5 bullets, 3 ads) are enforced by the prompt, not the
// schema — the structured-outputs API does not support array length constraints.
export const KIT_JSON_SCHEMA = {
  type: "object",
  properties: {
    productSummary: {
      type: "string",
      description:
        "Short noun phrase naming the product visible in the photo, lowercase, e.g. 'handmade ceramic mug'",
    },
    title: {
      type: "string",
      description: "SEO-optimized listing title, 60-80 characters, no quotes",
    },
    description: {
      type: "string",
      description:
        "Conversion-focused product description, 2-3 short paragraphs separated by blank lines",
    },
    bullets: {
      type: "array",
      items: { type: "string" },
      description: "Exactly 5 benefit-led bullet points, no leading dashes",
    },
    adCopy: {
      type: "array",
      items: { type: "string" },
      description:
        "Exactly 3 ad copy variants (primary text for paid social), each 1-2 sentences with a hook",
    },
    socialCaption: {
      type: "string",
      description: "One engaging social caption, light emoji use, 1-2 hashtags",
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "10-15 SEO keywords or short phrases, lowercase",
    },
  },
  required: [
    "productSummary",
    "title",
    "description",
    "bullets",
    "adCopy",
    "socialCaption",
    "keywords",
  ],
  additionalProperties: false,
} as const;

const STRING_FIELDS = [
  "productSummary",
  "title",
  "description",
  "socialCaption",
] as const;
const ARRAY_FIELDS = ["bullets", "adCopy", "keywords"] as const;

export function parseKit(raw: unknown): ListingKit {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Kit is not an object");
  }
  const obj = raw as Record<string, unknown>;
  const kit: Partial<ListingKit> = {};

  for (const field of STRING_FIELDS) {
    const value = obj[field];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`Invalid or missing field: ${field}`);
    }
    kit[field] = value.trim();
  }

  for (const field of ARRAY_FIELDS) {
    const value = obj[field];
    if (!Array.isArray(value)) {
      throw new Error(`Invalid or missing field: ${field}`);
    }
    const items = value
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v !== "");
    if (items.length === 0) {
      throw new Error(`Empty array field: ${field}`);
    }
    kit[field] = items;
  }

  return kit as ListingKit;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/kit.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/kit.ts tests/kit.test.ts
git commit -m "feat: listing kit type, JSON schema and validator"
```

---

### Task 4: In-memory rate limiter (TDD)

**Files:**
- Create: `src/lib/rate-limit.ts`
- Test: `tests/rate-limit.test.ts`

- [ ] **Step 1: Write the failing test `tests/rate-limit.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

const HOUR = 60 * 60 * 1000;

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimit());

  it("allows up to 10 requests per hour per IP", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit("1.2.3.4", 1000 + i)).toBe(true);
    }
    expect(checkRateLimit("1.2.3.4", 2000)).toBe(false);
  });

  it("tracks IPs independently", () => {
    for (let i = 0; i < 10; i++) checkRateLimit("1.2.3.4", 1000 + i);
    expect(checkRateLimit("5.6.7.8", 2000)).toBe(true);
  });

  it("frees slots after the window passes", () => {
    for (let i = 0; i < 10; i++) checkRateLimit("1.2.3.4", 1000 + i);
    expect(checkRateLimit("1.2.3.4", 1000 + HOUR + 100)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/rate-limit.test.ts`
Expected: FAIL — cannot resolve `@/lib/rate-limit`.

- [ ] **Step 3: Implement `src/lib/rate-limit.ts`**

```ts
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;

const hits = new Map<string, number[]>();

/** Returns true if the request is allowed (and records it), false if rate-limited. */
export function checkRateLimit(ip: string, now: number = Date.now()): boolean {
  const windowStart = now - WINDOW_MS;
  const recent = (hits.get(ip) ?? []).filter((t) => t > windowStart);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

/** Test helper. */
export function resetRateLimit(): void {
  hits.clear();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/rate-limit.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limit.ts tests/rate-limit.test.ts
git commit -m "feat: in-memory per-IP rate limiter"
```

---

### Task 5: Claude generation library

**Files:**
- Create: `src/lib/claude.ts`
- Test: `tests/claude-prompt.test.ts` (pure prompt-builder only; the API call is verified in Task 6)

- [ ] **Step 1: Write the failing test `tests/claude-prompt.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { buildInstruction } from "@/lib/claude";

describe("buildInstruction", () => {
  it("returns the base instruction with no context", () => {
    const text = buildInstruction({});
    expect(text).toContain("listing kit");
    expect(text).not.toContain("Seller-provided context");
    expect(text).not.toContain("original listing");
  });

  it("includes seller context when provided", () => {
    const text = buildInstruction({ extraContext: "Brand: Acme, audience: hikers" });
    expect(text).toContain("Seller-provided context");
    expect(text).toContain("Brand: Acme, audience: hikers");
  });

  it("includes scraped data when provided", () => {
    const text = buildInstruction({
      scraped: { title: "Old title", description: "Old desc", url: "https://shop.com/p/x" },
    });
    expect(text).toContain("original listing");
    expect(text).toContain("Old title");
    expect(text).toContain("Old desc");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/claude-prompt.test.ts`
Expected: FAIL — cannot resolve `@/lib/claude`.

- [ ] **Step 3: Implement `src/lib/claude.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { KIT_JSON_SCHEMA, parseKit, type ListingKit } from "./kit";

export const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

const SYSTEM_PROMPT = `You are an expert e-commerce copywriter who writes listing copy that ranks and converts for Shopify, Etsy and Amazon sellers.

You will receive a product photo (and sometimes extra context). Look carefully at the product: its type, material, color, style, likely use case and likely buyer. Then produce a complete listing kit.

Rules:
- Write in natural, confident English. No hype clichés ("game-changer", "must-have"), no invented specs (never claim a material, size or feature you cannot see or that wasn't provided).
- Title: 60-80 characters, front-load the main keyword, include the most distinctive attribute you can actually see.
- Description: 2-3 short paragraphs. First paragraph hooks with the main benefit; the rest covers details and use cases. Plain text, no markdown headers.
- Bullets: exactly 5, each leading with a benefit, max ~15 words each.
- Ad copy: exactly 3 variants with different angles (e.g. emotional, practical, social proof style). 1-2 sentences each.
- Social caption: one caption, warm tone, light emoji, 1-2 hashtags.
- Keywords: 10-15 lowercase keywords/phrases buyers would actually search.`;

export interface ScrapedContext {
  title?: string;
  description?: string;
  url?: string;
}

export interface InstructionInput {
  extraContext?: string;
  scraped?: ScrapedContext;
}

export function buildInstruction(input: InstructionInput): string {
  const parts = [
    "Create the complete listing kit for the product in this photo.",
  ];
  if (input.scraped && (input.scraped.title || input.scraped.description)) {
    parts.push(
      `For reference, here is the product's original listing (improve on it, don't copy it):\n` +
        (input.scraped.title ? `Original title: ${input.scraped.title}\n` : "") +
        (input.scraped.description
          ? `Original description: ${input.scraped.description}`
          : ""),
    );
  }
  if (input.extraContext && input.extraContext.trim() !== "") {
    parts.push(`Seller-provided context: ${input.extraContext.trim()}`);
  }
  return parts.join("\n\n");
}

export interface GenerateInput extends InstructionInput {
  imageBase64: string;
  mediaType: AllowedMediaType;
}

export async function generateKit(input: GenerateInput): Promise<ListingKit> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: KIT_JSON_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: input.mediaType,
              data: input.imageBase64,
            },
          },
          { type: "text", text: buildInstruction(input) },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text block in Claude response");
  }
  return parseKit(JSON.parse(textBlock.text));
}
```

Implementation notes for the engineer:
- `output_config.format` with a raw JSON schema is the canonical structured-outputs parameter; the schema deliberately avoids array length constraints (unsupported) — counts are in the prompt and `parseKit` is lenient about counts.
- If the installed SDK version's TypeScript types reject `output_config`, first try upgrading `@anthropic-ai/sdk` to latest; only as last resort cast the params object with `as any` and leave a comment.
- Do NOT set `temperature` (removed on this model family).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: PASS (kit, rate-limit, claude-prompt — all green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/claude.ts tests/claude-prompt.test.ts
git commit -m "feat: Claude vision generation with structured outputs"
```

---

### Task 6: API route `/api/generate` (photo mode)

**Files:**
- Create: `src/app/api/generate/route.ts`
- Create: `.env.local` (untracked) with the real `ANTHROPIC_API_KEY`

- [ ] **Step 1: Implement `src/app/api/generate/route.ts`**

```ts
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  generateKit,
  ALLOWED_MEDIA_TYPES,
  type AllowedMediaType,
} from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

// ~5MB of binary ≈ 6.8M base64 chars
const MAX_BASE64_LENGTH = 7_000_000;
const MAX_CONTEXT_LENGTH = 500;

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: code, message }, { status });
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown")
    .split(",")[0]
    .trim();
  if (!checkRateLimit(ip)) {
    return jsonError(
      429,
      "rate_limited",
      "You've reached the hourly limit. Come back in a little while.",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_request", "Request body must be JSON.");
  }

  const extraContext =
    typeof body.extraContext === "string"
      ? body.extraContext.slice(0, MAX_CONTEXT_LENGTH)
      : undefined;

  const { imageBase64, mediaType } = body;
  if (
    typeof imageBase64 !== "string" ||
    imageBase64.length === 0 ||
    typeof mediaType !== "string" ||
    !(ALLOWED_MEDIA_TYPES as readonly string[]).includes(mediaType)
  ) {
    return jsonError(
      400,
      "invalid_image",
      "Please upload a JPEG, PNG, WebP or GIF image.",
    );
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return jsonError(413, "image_too_large", "Images must be under 5MB.");
  }

  try {
    const kit = await generateKit({
      imageBase64,
      mediaType: mediaType as AllowedMediaType,
      extraContext,
    });
    return NextResponse.json({ kit });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return jsonError(
        429,
        "upstream_busy",
        "We're handling a lot of requests right now — try again in a minute.",
      );
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return jsonError(
        502,
        "upstream_error",
        "The AI service had a hiccup. Please try again.",
      );
    }
    console.error("generate failed", err);
    return jsonError(
      500,
      "internal_error",
      "Something went wrong on our side. Please try again.",
    );
  }
}
```

- [ ] **Step 2: Create `.env.local` with the real key** (ask Pablo for the key if not present; it may be copyable from `demo-maker-pabs-ai/.env.local`). Never commit it.

- [ ] **Step 3: Manual verification with a real image**

Start dev server (`npm run dev`, background). Then in PowerShell:

```powershell
$img = [Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:TEMP\test-product.jpg"))
$body = @{ imageBase64 = $img; mediaType = "image/jpeg"; extraContext = "Brand: test" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/api/generate -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 5
```

(Use any real product photo; download one to `$env:TEMP\test-product.jpg` first, e.g. from unsplash.)
Expected: JSON with `kit.title`, `kit.bullets` (5 items), `kit.adCopy` (3 items), etc. Also verify a bad request: empty body → 400 with `invalid_request`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat: /api/generate route for photo mode"
```

---

### Task 7: UI — hero, upload zone, context input (idle state)

**Files:**
- Create: `src/components/UploadZone.tsx`, `src/components/ContextInput.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create `src/components/UploadZone.tsx`**

```tsx
"use client";

import { useCallback, useRef, useState } from "react";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

export interface ImagePayload {
  base64: string;
  mediaType: string;
  previewUrl: string;
}

export default function UploadZone({
  image,
  onImage,
  onError,
}: {
  image: ImagePayload | null;
  onImage: (img: ImagePayload) => void;
  onError: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        onError("Please use a JPEG, PNG, WebP or GIF image.");
        return;
      }
      if (file.size > MAX_BYTES) {
        onError("Images must be under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        onImage({ base64, mediaType: file.type, previewUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    },
    [onImage, onError],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a product photo"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center transition-colors ${
        dragging
          ? "border-accent bg-accent/5"
          : "border-ink/15 bg-surface hover:border-accent/50"
      }`}
    >
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.previewUrl}
            alt="Your product"
            className="max-h-48 rounded-2xl object-contain"
          />
          <p className="mt-3 text-sm text-muted">
            Click or drop to replace the photo
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold">Drop your product photo here</p>
          <p className="mt-1 text-sm text-muted">
            or click to browse — JPEG, PNG, WebP or GIF, up to 5MB
          </p>
        </>
      )}
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
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/ContextInput.tsx`**

```tsx
"use client";

export default function ContextInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      maxLength={500}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Add context: brand, audience, platform… (optional)"
      className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent"
    />
  );
}
```

- [ ] **Step 3: Rewrite `src/app/page.tsx` with the state machine (idle + wiring; loading/result land in Task 8)**

```tsx
"use client";

import { useState } from "react";
import UploadZone, { type ImagePayload } from "@/components/UploadZone";
import ContextInput from "@/components/ContextInput";
import type { ListingKit } from "@/lib/kit";

type Status = "idle" | "generating" | "result" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [image, setImage] = useState<ImagePayload | null>(null);
  const [context, setContext] = useState("");
  const [kit, setKit] = useState<ListingKit | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!image) return;
    setStatus("generating");
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: image.base64,
          mediaType: image.mediaType,
          extraContext: context || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? "Something went wrong. Please try again.");
      }
      setKit(data.kit);
      setStatus("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  function startOver() {
    setStatus("idle");
    setImage(null);
    setContext("");
    setKit(null);
    setError(null);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-10 sm:px-6">
      {(status === "idle" || status === "error") && (
        <section className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 py-10">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              ListingRoom
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
              Turn a product photo into a ready-to-paste listing kit
            </h1>
            <p className="mt-4 text-lg text-muted">
              SEO title, description, bullets, ad copy, caption and keywords —
              generated from your real product in seconds. Free.
            </p>
          </header>

          <UploadZone
            image={image}
            onImage={(img) => {
              setImage(img);
              setError(null);
            }}
            onError={(msg) => setError(msg)}
          />
          <ContextInput value={context} onChange={setContext} />

          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={!image}
            className="rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Generate my listing kit
          </button>
        </section>
      )}

      {status === "generating" && <p className="m-auto">Generating…</p>}
      {status === "result" && kit && (
        <pre className="overflow-auto text-xs">{JSON.stringify(kit, null, 2)}</pre>
      )}

      <footer className="mt-auto pt-10 text-center text-xs text-muted">
        Made with ♥ for Photoroom · Not affiliated with Photoroom
      </footer>
    </main>
  );
}
```

(The `generating`/`result` placeholders are intentional — replaced in Task 8.)

- [ ] **Step 4: Verify in browser with Playwright MCP** — navigate to http://localhost:3000, check hero renders, upload a photo (file chooser), confirm preview + button enables. Mobile check: `mcp__playwright__browser_resize` to 390x844 and confirm layout stacks cleanly.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/UploadZone.tsx src/components/ContextInput.tsx
git commit -m "feat: hero, upload zone and context input"
```

---

### Task 8: UI — loading state, result view, copy buttons, CTA

**Files:**
- Create: `src/components/LoadingState.tsx`, `src/components/KitBlock.tsx`, `src/components/ResultView.tsx`
- Modify: `src/app/page.tsx` (replace the two placeholders)

- [ ] **Step 1: Create `src/components/LoadingState.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Reading your product photo…",
  "Identifying what makes it sell…",
  "Writing your SEO title…",
  "Drafting the description…",
  "Polishing your ad copy…",
  "Picking the right keywords…",
];

export default function LoadingState() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % MESSAGES.length),
      3500,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 py-10">
      <div className="h-3 w-3 animate-ping rounded-full bg-accent" />
      <p className="text-lg font-medium text-ink" aria-live="polite">
        {MESSAGES[index]}
      </p>
      <div className="w-full space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-2xl bg-surface"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <p className="text-sm text-muted">This usually takes 15–30 seconds.</p>
    </section>
  );
}
```

- [ ] **Step 2: Create `src/components/KitBlock.tsx`**

```tsx
"use client";

import { useState } from "react";

export default function KitBlock({
  label,
  copyText,
  children,
}: {
  label: string;
  copyText: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {label}
        </h3>
        <button
          onClick={copy}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
            copied
              ? "bg-green-100 text-green-700"
              : "bg-surface text-ink hover:bg-accent/10 hover:text-accent"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/ResultView.tsx`**

```tsx
"use client";

import KitBlock from "./KitBlock";
import type { ListingKit } from "@/lib/kit";

const PHOTOROOM_URL =
  "https://www.photoroom.com/?utm_source=listingroom&utm_medium=referral&utm_campaign=listing-kit";

export default function ResultView({
  imageSrc,
  kit,
  onStartOver,
}: {
  imageSrc: string;
  kit: ListingKit;
  onStartOver: () => void;
}) {
  return (
    <section className="flex flex-1 flex-col gap-8 py-6 lg:flex-row">
      {/* Left: photo + CTA */}
      <aside className="lg:w-2/5 lg:shrink-0">
        <div className="lg:sticky lg:top-8 space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={kit.productSummary}
            className="w-full rounded-3xl border border-ink/10 object-contain"
          />
          <div className="rounded-3xl bg-ink p-5 text-white">
            <p className="text-sm font-medium text-white/70">
              Your copy is ready. Now the photo:
            </p>
            <p className="mt-1 font-semibold">
              Remove the background, add a pro backdrop, make it pop.
            </p>
            <a
              href={PHOTOROOM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block rounded-2xl bg-accent px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
            >
              Generate the real photo → Open in Photoroom
            </a>
          </div>
          <button
            onClick={onStartOver}
            className="w-full rounded-2xl border border-ink/15 px-5 py-3 text-sm font-semibold text-muted transition-colors hover:border-ink/30 hover:text-ink"
          >
            ← Start over with another product
          </button>
        </div>
      </aside>

      {/* Right: kit blocks */}
      <div className="flex-1 space-y-4">
        <header>
          <p className="text-sm text-muted">Your listing kit for</p>
          <h2 className="text-2xl font-bold capitalize">{kit.productSummary}</h2>
        </header>

        <KitBlock label="SEO Title" copyText={kit.title}>
          <p className="font-medium">{kit.title}</p>
        </KitBlock>

        <KitBlock label="Product Description" copyText={kit.description}>
          {kit.description.split(/\n\n+/).map((p, i) => (
            <p key={i} className={i > 0 ? "mt-3" : ""}>
              {p}
            </p>
          ))}
        </KitBlock>

        <KitBlock label="Benefit Bullets" copyText={kit.bullets.map((b) => `• ${b}`).join("\n")}>
          <ul className="list-disc space-y-1.5 pl-5">
            {kit.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </KitBlock>

        <KitBlock
          label="Ad Copy Variants"
          copyText={kit.adCopy.map((a, i) => `Variant ${i + 1}: ${a}`).join("\n\n")}
        >
          <ol className="space-y-3">
            {kit.adCopy.map((a, i) => (
              <li key={i} className="rounded-2xl bg-surface p-3">
                <span className="mb-1 block text-xs font-semibold text-muted">
                  Variant {i + 1}
                </span>
                {a}
              </li>
            ))}
          </ol>
        </KitBlock>

        <KitBlock label="Social Caption" copyText={kit.socialCaption}>
          <p>{kit.socialCaption}</p>
        </KitBlock>

        <KitBlock label="Keywords" copyText={kit.keywords.join(", ")}>
          <div className="flex flex-wrap gap-2">
            {kit.keywords.map((k, i) => (
              <span
                key={i}
                className="rounded-full bg-surface px-3 py-1 text-xs font-medium"
              >
                {k}
              </span>
            ))}
          </div>
        </KitBlock>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Wire into `src/app/page.tsx`** — replace the two placeholder lines:

```tsx
// imports to add at top:
import LoadingState from "@/components/LoadingState";
import ResultView from "@/components/ResultView";

// replace `{status === "generating" && ...}` and `{status === "result" && ...}` with:
{status === "generating" && <LoadingState />}
{status === "result" && kit && image && (
  <ResultView imageSrc={image.previewUrl} kit={kit} onStartOver={startOver} />
)}
```

- [ ] **Step 5: Full happy-path verification with Playwright MCP** — upload a real product photo, click Generate, wait for the result (real API call), verify: all 6 blocks render, copy button shows "Copied!", CTA href contains `utm_source=listingroom`, Start over resets. Repeat at 390x844 (mobile): photo stacks above blocks.

- [ ] **Step 6: Run full test suite + build**

Run: `npx vitest run` → all green. Then `npm run build` → compiles without errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/components
git commit -m "feat: loading state, result view with copy buttons and Photoroom CTA"
```

---

### Task 9: Visual polish pass

**Files:**
- Modify: any of `src/app/*`, `src/components/*`, `tailwind.config.ts`

- [ ] **Step 1: Screenshot review** — with Playwright MCP take full-page screenshots (desktop 1440px + mobile 390px) of idle, loading and result states. Save to `.temp/`.

- [ ] **Step 2: Compare against `docs/design-notes.md`** and the bar in the spec ("minimal and confident, one clear action, generous whitespace"). Fix the 3-5 most visible issues (spacing rhythm, font sizes, contrast, button hover, dropzone proportions). Do not add features.

- [ ] **Step 3: Re-screenshot, confirm, commit**

```bash
git add -A
git commit -m "style: visual polish pass on all three states"
```

---

### Task 10: Docker

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `.dockerignore`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
# ---- Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN mkdir -p ./public
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 2: Create `.dockerignore`**

```
node_modules
.next
.git
.env.local
.env*.local
.temp
docs
```

- [ ] **Step 3: Create `docker-compose.yml`**

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

- [ ] **Step 4: Build and run the container locally**

Run: `docker compose up --build -d` (Docker Desktop must be running)
Then verify http://localhost:3000 loads AND a full generation works against the container (Playwright MCP, real photo). Then `docker compose down`.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "feat: Docker multi-stage build with standalone output"
```

---

### Task 11: README + GitHub repo

**Files:**
- Create: `README.md`
- Create: screenshot at `docs/screenshot.png`

- [ ] **Step 1: Take a hero screenshot** of the result state (desktop, real generation) via Playwright MCP, save as `docs/screenshot.png`.

- [ ] **Step 2: Write `README.md`** (English). Required sections — write real content for each, this outline is the structure, not the copy:
  - **ListingRoom** — one-line value prop + link to https://listingroom.pablo.ky
  - Screenshot
  - **What it does** — the 6 kit blocks, photo + URL input, Photoroom CTA
  - **How it works** — Next.js 14, single Claude API call (vision + structured outputs, `claude-opus-4-8`), no DB, in-memory rate limit, Shopify `.json` + OG tag scraping with graceful fallback
  - **Run it locally** — `npm install`, `.env.local` with `ANTHROPIC_API_KEY`, `npm run dev`
  - **Run with Docker** — `docker compose up --build`
  - **Why this exists** — one honest paragraph: built as a growth-marketing portfolio piece for Photoroom; the words are the free hook, the visual is the natural next step in Photoroom. Not affiliated with Photoroom.

- [ ] **Step 3: Create the public GitHub repo and push**

```bash
git add README.md docs/screenshot.png
git commit -m "docs: README with screenshot"
gh repo create listingroom --public --source . --push
```

(If `gh` is not authenticated, run `gh auth status` and ask Pablo to authenticate.)

---

### Task 12: Deploy to Easypanel + live verification — ⚠️ requires Pablo

- [ ] **Step 1 (Pablo, in Easypanel UI):** Create new app from the GitHub repo `listingroom`, build type Dockerfile, add env var `ANTHROPIC_API_KEY`, expose port 3000.

- [ ] **Step 2 (Pablo, DNS):** Add record `listingroom.pablo.ky` → Contabo VPS IP (same pattern as existing pabs.ky apps). Enable HTTPS in Easypanel (Let's Encrypt).

- [ ] **Step 3: Live verification (Claude, with Playwright MCP):** Navigate to https://listingroom.pablo.ky, run a full real generation with a product photo, verify all blocks + copy + CTA work over HTTPS. Per Pablo's global rules: the task is NOT done until this passes against the live URL.

- [ ] **Step 4: Tag the milestone**

```bash
git tag block-a-live
git push --tags
```

---

# BLOCK B — URL input mode

### Task 13: Scrape library (TDD)

**Files:**
- Create: `src/lib/scrape.ts`
- Test: `tests/scrape.test.ts`

- [ ] **Step 1: Write the failing tests `tests/scrape.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  isPrivateIp,
  shopifyJsonUrl,
  mapShopifyProduct,
  extractOg,
  ScrapeError,
} from "@/lib/scrape";

describe("isPrivateIp", () => {
  it("flags private and loopback ranges", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.1.1", "::1"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });
  it("allows public IPs", () => {
    for (const ip of ["8.8.8.8", "172.32.0.1", "104.18.0.1"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });
});

describe("shopifyJsonUrl", () => {
  it("builds the .json URL for product pages", () => {
    expect(
      shopifyJsonUrl(new URL("https://shop.example.com/products/blue-mug?variant=1")),
    ).toBe("https://shop.example.com/products/blue-mug.json");
    expect(
      shopifyJsonUrl(new URL("https://shop.example.com/collections/all/products/blue-mug")),
    ).toBe("https://shop.example.com/collections/all/products/blue-mug.json");
  });
  it("returns null for non-product URLs", () => {
    expect(shopifyJsonUrl(new URL("https://shop.example.com/pages/about"))).toBeNull();
  });
});

describe("mapShopifyProduct", () => {
  it("maps the Shopify product JSON shape", () => {
    const out = mapShopifyProduct(
      {
        product: {
          title: "Blue Mug",
          body_html: "<p>A <strong>nice</strong> mug</p>",
          images: [{ src: "https://cdn.shopify.com/mug.jpg" }],
        },
      },
      "https://shop.example.com/products/blue-mug",
    );
    expect(out).toEqual({
      title: "Blue Mug",
      description: "A nice mug",
      imageUrl: "https://cdn.shopify.com/mug.jpg",
      sourceUrl: "https://shop.example.com/products/blue-mug",
    });
  });
  it("returns null when there is no image", () => {
    expect(
      mapShopifyProduct({ product: { title: "X", body_html: "", images: [] } }, "u"),
    ).toBeNull();
  });
});

describe("extractOg", () => {
  const html = `<html><head>
    <title>Fallback Title</title>
    <meta property="og:title" content="OG Mug" />
    <meta property="og:description" content="The best mug" />
    <meta property="og:image" content="https://cdn.example.com/og.jpg" />
  </head><body></body></html>`;

  it("extracts og tags", () => {
    expect(extractOg(html, "https://x.com/p")).toEqual({
      title: "OG Mug",
      description: "The best mug",
      imageUrl: "https://cdn.example.com/og.jpg",
      sourceUrl: "https://x.com/p",
    });
  });

  it("falls back to twitter:image and <title>", () => {
    const alt = `<html><head><title>T</title>
      <meta name="twitter:image" content="https://cdn.example.com/tw.jpg" />
    </head></html>`;
    const out = extractOg(alt, "https://x.com/p");
    expect(out?.imageUrl).toBe("https://cdn.example.com/tw.jpg");
    expect(out?.title).toBe("T");
  });

  it("returns null without any image", () => {
    expect(extractOg("<html><head></head></html>", "u")).toBeNull();
  });
});

describe("ScrapeError", () => {
  it("carries a code", () => {
    expect(new ScrapeError("blocked").code).toBe("blocked");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/scrape.test.ts`
Expected: FAIL — cannot resolve `@/lib/scrape`.

- [ ] **Step 3: Implement `src/lib/scrape.ts`**

```ts
import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import net from "node:net";

export type ScrapeErrorCode =
  | "invalid_url"
  | "blocked"
  | "no_product"
  | "image_failed";

export class ScrapeError extends Error {
  constructor(public code: ScrapeErrorCode) {
    super(code);
    this.name = "ScrapeError";
  }
}

export interface ScrapedProduct {
  title?: string;
  description?: string;
  imageUrl: string;
  sourceUrl: string;
}

export function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) {
    return true;
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

/** Throws ScrapeError("invalid_url") for non-http(s) or private/internal targets. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ScrapeError("invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScrapeError("invalid_url");
  }
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new ScrapeError("invalid_url");
  }
  if (net.isIP(host) && isPrivateIp(host)) {
    throw new ScrapeError("invalid_url");
  }
  if (!net.isIP(host)) {
    try {
      const { address } = await lookup(host);
      if (isPrivateIp(address)) throw new ScrapeError("invalid_url");
    } catch (err) {
      if (err instanceof ScrapeError) throw err;
      throw new ScrapeError("invalid_url"); // DNS failure
    }
  }
  return url;
}

export function shopifyJsonUrl(url: URL): string | null {
  const match = url.pathname.match(/^(.*\/products\/[^/]+?)\/?$/);
  if (!match) return null;
  return `${url.origin}${match[1]}.json`;
}

export function mapShopifyProduct(
  json: unknown,
  sourceUrl: string,
): ScrapedProduct | null {
  const product = (json as { product?: Record<string, unknown> })?.product;
  if (!product) return null;
  const images = product.images as Array<{ src?: string }> | undefined;
  const imageUrl = images?.[0]?.src;
  if (!imageUrl) return null;
  const bodyHtml = typeof product.body_html === "string" ? product.body_html : "";
  const description = cheerio.load(bodyHtml).text().trim() || undefined;
  return {
    title: typeof product.title === "string" ? product.title : undefined,
    description,
    imageUrl,
    sourceUrl,
  };
}

export function extractOg(html: string, sourceUrl: string): ScrapedProduct | null {
  const $ = cheerio.load(html);
  const meta = (key: string) =>
    $(`meta[property="${key}"]`).attr("content") ??
    $(`meta[name="${key}"]`).attr("content");
  const imageUrl = meta("og:image") ?? meta("twitter:image");
  if (!imageUrl) return null;
  return {
    title: meta("og:title") ?? ($("title").text().trim() || undefined),
    description: meta("og:description") ?? meta("description"),
    imageUrl,
    sourceUrl,
  };
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
};

export async function fetchWithTimeout(
  url: string,
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Main entry: Shopify .json first, OG tags as fallback. */
export async function scrapeProduct(rawUrl: string): Promise<ScrapedProduct> {
  const url = await assertPublicUrl(rawUrl);

  const jsonUrl = shopifyJsonUrl(url);
  if (jsonUrl) {
    try {
      const res = await fetchWithTimeout(jsonUrl);
      if (res.ok && (res.headers.get("content-type") ?? "").includes("json")) {
        const mapped = mapShopifyProduct(await res.json(), url.toString());
        if (mapped) return mapped;
      }
    } catch {
      // fall through to OG scraping
    }
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(url.toString());
  } catch {
    throw new ScrapeError("blocked");
  }
  if (!res.ok) throw new ScrapeError("blocked");

  const product = extractOg(await res.text(), url.toString());
  if (!product) throw new ScrapeError("no_product");
  return product;
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function downloadImageAsBase64(
  imageUrl: string,
): Promise<{ base64: string; mediaType: string }> {
  let res: Response;
  try {
    res = await fetchWithTimeout(imageUrl);
  } catch {
    throw new ScrapeError("image_failed");
  }
  if (!res.ok) throw new ScrapeError("image_failed");
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const mediaType = ALLOWED_IMAGE_TYPES[contentType];
  if (!mediaType) throw new ScrapeError("image_failed");
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new ScrapeError("image_failed");
  return { base64: buffer.toString("base64"), mediaType };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/scrape.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scrape.ts tests/scrape.test.ts
git commit -m "feat: product URL scraper (Shopify JSON + OG tags, SSRF-guarded)"
```

---

### Task 14: URL mode in `/api/generate`

**Files:**
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Add the URL branch.** In `route.ts`, after the rate-limit and body-parse blocks and BEFORE the photo-mode validation, insert:

```ts
// imports to add at top:
import { scrapeProduct, downloadImageAsBase64, ScrapeError } from "@/lib/scrape";
import type { AllowedMediaType } from "@/lib/claude";

const SCRAPE_MESSAGES: Record<string, string> = {
  invalid_url: "That doesn't look like a public product page URL.",
  blocked:
    "This store blocks automated access — try uploading a photo instead.",
  no_product:
    "We couldn't find a product image on that page — try uploading a photo instead.",
  image_failed:
    "We couldn't fetch the product image from that page — try uploading a photo instead.",
};

// URL mode branch:
if (typeof body.url === "string" && body.url.trim() !== "") {
  try {
    const product = await scrapeProduct(body.url.trim());
    const img = await downloadImageAsBase64(product.imageUrl);
    const kit = await generateKit({
      imageBase64: img.base64,
      mediaType: img.mediaType as AllowedMediaType,
      extraContext,
      scraped: {
        title: product.title,
        description: product.description,
        url: product.sourceUrl,
      },
    });
    return NextResponse.json({
      kit,
      image: `data:${img.mediaType};base64,${img.base64}`,
    });
  } catch (err) {
    if (err instanceof ScrapeError) {
      return jsonError(422, `scrape_${err.code}`, SCRAPE_MESSAGES[err.code]);
    }
    if (err instanceof Anthropic.RateLimitError) {
      return jsonError(429, "upstream_busy", "We're handling a lot of requests right now — try again in a minute.");
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return jsonError(502, "upstream_error", "The AI service had a hiccup. Please try again.");
    }
    console.error("url generate failed", err);
    return jsonError(500, "internal_error", "Something went wrong on our side. Please try again.");
  }
}
```

- [ ] **Step 2: Manual verification with a real Shopify store**

With dev server running:

```powershell
$body = @{ url = "https://shop.gymshark.com/products/<any-live-product-handle>" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/api/generate -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 5
```

Pick any live Shopify product URL (find one by browsing a known Shopify store; verify `<url>.json` returns JSON in the browser first).
Expected: `{ kit: {...}, image: "data:image/..." }`.
Also verify failures: `{"url": "http://localhost/x"}` → 422 `scrape_invalid_url`; an Amazon product URL → 422 `scrape_blocked` or a kit (either is acceptable; blocked is expected).

- [ ] **Step 3: Run full suite + commit**

Run: `npx vitest run` → green.

```bash
git add src/app/api/generate/route.ts
git commit -m "feat: URL mode in /api/generate with scrape error mapping"
```

---

### Task 15: URL mode UI

**Files:**
- Create: `src/components/ModeToggle.tsx`, `src/components/UrlInput.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create `src/components/ModeToggle.tsx`**

```tsx
"use client";

export type InputMode = "photo" | "url";

export default function ModeToggle({
  mode,
  onChange,
}: {
  mode: InputMode;
  onChange: (m: InputMode) => void;
}) {
  const base =
    "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors";
  return (
    <div className="flex gap-1 rounded-2xl bg-surface p-1">
      <button
        onClick={() => onChange("photo")}
        className={`${base} ${mode === "photo" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
      >
        Upload photo
      </button>
      <button
        onClick={() => onChange("url")}
        className={`${base} ${mode === "url" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
      >
        Paste URL
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/UrlInput.tsx`**

```tsx
"use client";

export default function UrlInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-ink/15 bg-surface p-6">
      <p className="text-lg font-semibold">Paste your product page URL</p>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://yourstore.com/products/…"
        className="w-full max-w-md rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent"
      />
      <p className="text-xs text-muted">
        Works great with Shopify and most independent stores
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Wire into `src/app/page.tsx`.** Changes:

```tsx
// new imports:
import ModeToggle, { type InputMode } from "@/components/ModeToggle";
import UrlInput from "@/components/UrlInput";

// new state:
const [mode, setMode] = useState<InputMode>("photo");
const [url, setUrl] = useState("");
const [resultImage, setResultImage] = useState<string | null>(null);

// handleGenerate becomes mode-aware:
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
      // Scrape failures: switch back to photo mode so the fallback is one tap away
      if (typeof data.error === "string" && data.error.startsWith("scrape_")) {
        setMode("photo");
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

// in startOver, also reset: setUrl(""); setResultImage(null); setMode("photo");

// in the idle JSX, above UploadZone:
<ModeToggle mode={mode} onChange={(m) => { setMode(m); setError(null); }} />
{mode === "photo" ? (
  <UploadZone ... (unchanged) />
) : (
  <UrlInput value={url} onChange={setUrl} />
)}

// Generate button disabled condition becomes:
disabled={mode === "photo" ? !image : url.trim() === ""}

// ResultView call uses resultImage:
{status === "result" && kit && resultImage && (
  <ResultView imageSrc={resultImage} kit={kit} onStartOver={startOver} />
)}
```

- [ ] **Step 4: E2E verification with Playwright MCP** — (a) URL mode with a live Shopify product URL → full kit renders with the scraped image; (b) URL mode with an Amazon URL → friendly error + auto-switch to photo mode; (c) photo mode still works end to end; (d) mobile 390px check.

- [ ] **Step 5: Build + full suite + commit**

Run: `npx vitest run` and `npm run build` → both green.

```bash
git add src/app/page.tsx src/components/ModeToggle.tsx src/components/UrlInput.tsx
git commit -m "feat: URL input mode with graceful fallback to photo upload"
```

---

### Task 16: Ship Block B + close out

- [ ] **Step 1: Push and redeploy**

```bash
git push
```

Then redeploy in Easypanel (or it auto-deploys on push if configured in Task 12).

- [ ] **Step 2: Live verification on https://listingroom.pablo.ky** — full URL-mode generation with a real Shopify product + photo-mode regression check (Playwright MCP).

- [ ] **Step 3: Update `README.md`** if anything shipped differently than documented; push.

- [ ] **Step 4: Update `_estado.md`** (prepend, real timestamp via `date "+%Y-%m-%d %H:%M"` in bash): what shipped, the live URL, and Phase 2 items left for the application write-up.

- [ ] **Step 5: Tag**

```bash
git tag v1.0
git push --tags
```
