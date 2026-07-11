# Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate all confirmed security findings from the June 2026 audit: SSRF via redirects, CVE-affected dependencies, missing security headers, HTML body size limit, base64 validation, and rate-limiter memory leak.

**Architecture:** Surgical edits to three files (`scrape.ts`, `rate-limit.ts`, `next.config.mjs`) plus one new utility file (`validate.ts`). No new external dependencies. All logic is unit-tested with vitest before implementation.

**Tech Stack:** Next.js 14 App Router, Node.js, vitest, TypeScript.

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `src/lib/scrape.ts` | Modify | Replace `fetchWithTimeout` with `safeFetch` (manual redirects + re-validation); add `readBodyWithLimit` for HTML size cap |
| `src/lib/rate-limit.ts` | Modify | Add `evictExpired` for map cleanup + `rateLimitStoreSize` test helper |
| `src/lib/validate.ts` | Create | Pure `isValidBase64` helper |
| `src/app/api/generate/route.ts` | Modify | Import and call `isValidBase64` on photo-mode input |
| `next.config.mjs` | Modify | Add CSP, HSTS, Permissions-Policy headers |
| `tests/scrape.test.ts` | Modify | Add `safeFetch` and `readBodyWithLimit` tests |
| `tests/rate-limit.test.ts` | Modify | Add `evictExpired` tests |
| `tests/validate.test.ts` | Create | Unit tests for `isValidBase64` |

---

## Task 1: Update Dependencies

**Files:**
- Modify: `package.json` (via npm, not by hand)

- [ ] **Step 1: Check current audit state**

```bash
npm audit
```

Expected: 5 vulnerabilities (4 high, 1 moderate). Note the exact output before proceeding.

- [ ] **Step 2: Update Next.js to latest patch within the 14.x line**

```bash
npm update next eslint-config-next
```

- [ ] **Step 3: Run audit fix for remaining CVEs**

```bash
npm audit fix
```

Expected: 0 critical/high vulnerabilities remaining. Moderate/low are acceptable if not auto-fixable without breaking changes.

- [ ] **Step 4: Verify the app still builds**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 5: Run existing tests to check nothing broke**

```bash
npm test
```

Expected: All existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: update Next.js and fix CVEs (npm audit fix)"
```

---

## Task 2: Security Headers (CSP, HSTS, Permissions-Policy)

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: Write the updated config**

Open `next.config.mjs`. Replace the entire `headers()` block with:

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
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self'",
              "font-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verify headers are present in a dev build**

```bash
npm run dev
```

In a separate terminal:

```bash
curl -I http://localhost:3000 2>/dev/null | grep -iE "content-security|strict-transport|permissions"
```

Expected output (3 matching lines):
```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
strict-transport-security: max-age=63072000; includeSubDomains; preload
permissions-policy: camera=(), microphone=(), geolocation=()
```

Stop the dev server (Ctrl+C) after verifying.

- [ ] **Step 3: Commit**

```bash
git add next.config.mjs
git commit -m "security: add CSP, HSTS, and Permissions-Policy headers"
```

---

## Task 3: Fix SSRF - Replace `fetchWithTimeout` with `safeFetch`

**Context:** The current `fetchWithTimeout` uses `redirect: "follow"`, which lets an attacker serve a redirect from a public URL to `http://127.0.0.1` or `http://169.254.169.254` (cloud metadata). `safeFetch` uses `redirect: "manual"` and re-validates each Location header with `assertPublicUrl` before following it.

**Files:**
- Modify: `src/lib/scrape.ts` (replace `fetchWithTimeout`, update callers)
- Modify: `tests/scrape.test.ts` (add `safeFetch` tests)

- [ ] **Step 1: Write the failing tests for `safeFetch`**

Add to `tests/scrape.test.ts` at the top of the file (after existing imports):

```typescript
import { vi, afterEach } from "vitest";
import { safeFetch } from "@/lib/scrape";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue({ address: "93.184.216.34" }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});
```

Then add a new describe block at the bottom of the file:

```typescript
describe("safeFetch", () => {
  it("returns a 200 response without redirects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("body", { status: 200 })),
    );
    const res = await safeFetch("https://example.com/page");
    expect(res.status).toBe(200);
  });

  it("follows a redirect to a public URL and returns the final response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(
          new Response(null, {
            status: 301,
            headers: { location: "https://example.com/final" },
          }),
        )
        .mockResolvedValueOnce(new Response("ok", { status: 200 })),
    );
    const res = await safeFetch("https://example.com/original");
    expect(res.status).toBe(200);
  });

  it("throws ScrapeError('invalid_url') when a redirect points to a private IP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 301,
          headers: { location: "http://127.0.0.1/secret" },
        }),
      ),
    );
    await expect(safeFetch("https://example.com/trap")).rejects.toMatchObject({
      code: "invalid_url",
    });
  });

  it("throws ScrapeError('blocked') after exceeding max redirects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 301,
          headers: { location: "https://example.com/loop" },
        }),
      ),
    );
    await expect(safeFetch("https://example.com/loop")).rejects.toMatchObject({
      code: "blocked",
    });
  });

  it("throws ScrapeError('blocked') when a redirect has no Location header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 301 })),
    );
    await expect(safeFetch("https://example.com/broken")).rejects.toMatchObject(
      { code: "blocked" },
    );
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail (function not exported yet)**

```bash
npm test -- tests/scrape.test.ts
```

Expected: FAIL — `safeFetch is not exported from '@/lib/scrape'` (or similar import error).

- [ ] **Step 3: Implement `safeFetch` in `src/lib/scrape.ts`**

Replace the entire `fetchWithTimeout` function (lines 155-170) with:

```typescript
export async function safeFetch(
  rawUrl: string,
  timeoutMs = 8000,
  maxRedirects = 5,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let currentUrl = rawUrl;
    for (let hop = 0; hop <= maxRedirects; hop++) {
      await assertPublicUrl(currentUrl);
      const res = await fetch(currentUrl, {
        headers: BROWSER_HEADERS,
        signal: controller.signal,
        redirect: "manual",
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) throw new ScrapeError("blocked");
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      return res;
    }
    throw new ScrapeError("blocked");
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Update callers inside `scrape.ts`**

In `scrapeProduct` (around line 179), replace:
```typescript
const res = await fetchWithTimeout(jsonUrl);
```
with:
```typescript
const res = await safeFetch(jsonUrl);
```

And replace:
```typescript
res = await fetchWithTimeout(url.toString());
```
with:
```typescript
res = await safeFetch(url.toString());
```

In `downloadImageAsBase64` (around line 221), replace:
```typescript
res = await fetchWithTimeout(imageUrl);
```
with:
```typescript
res = await safeFetch(imageUrl);
```

- [ ] **Step 5: Run the tests — they should pass now**

```bash
npm test -- tests/scrape.test.ts
```

Expected: All tests PASS, including the 5 new `safeFetch` tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scrape.ts tests/scrape.test.ts
git commit -m "security: fix SSRF via redirect by re-validating each hop in safeFetch"
```

---

## Task 4: Limit HTML Response Body Size

**Context:** `scrapeProduct` calls `res.text()` with no size cap. A hostile server (URL is user-supplied) can serve an unbounded response, consuming server memory. Cap at 5 MB.

**Files:**
- Modify: `src/lib/scrape.ts` (add `readBodyWithLimit`, use it in `scrapeProduct`)
- Modify: `tests/scrape.test.ts` (add tests for `readBodyWithLimit`)

- [ ] **Step 1: Write failing tests for `readBodyWithLimit`**

Add to the imports in `tests/scrape.test.ts`:

```typescript
import { readBodyWithLimit } from "@/lib/scrape";
```

Add a new describe block at the bottom of `tests/scrape.test.ts`:

```typescript
describe("readBodyWithLimit", () => {
  it("returns the full text when body is under the limit", async () => {
    const res = new Response("hello world");
    const text = await readBodyWithLimit(res, 100);
    expect(text).toBe("hello world");
  });

  it("throws ScrapeError('blocked') when body exceeds the byte limit", async () => {
    const body = "x".repeat(101);
    const res = new Response(body);
    await expect(readBodyWithLimit(res, 100)).rejects.toMatchObject({
      code: "blocked",
    });
  });

  it("throws ScrapeError('blocked') when Response body is null", async () => {
    const res = new Response(null, { status: 200 });
    await expect(readBodyWithLimit(res, 100)).rejects.toMatchObject({
      code: "blocked",
    });
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm test -- tests/scrape.test.ts
```

Expected: FAIL — `readBodyWithLimit is not exported`.

- [ ] **Step 3: Implement `readBodyWithLimit` in `src/lib/scrape.ts`**

Add this function after the `BROWSER_HEADERS` constant (before `safeFetch`):

```typescript
const MAX_HTML_BYTES = 5 * 1024 * 1024;

export async function readBodyWithLimit(
  res: Response,
  maxBytes: number = MAX_HTML_BYTES,
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new ScrapeError("blocked");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new ScrapeError("blocked");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
}
```

- [ ] **Step 4: Replace `res.text()` in `scrapeProduct`**

In `scrapeProduct`, replace:
```typescript
const product = extractOg(await res.text(), url.toString());
```
with:
```typescript
const product = extractOg(await readBodyWithLimit(res), url.toString());
```

- [ ] **Step 5: Run the tests — they should pass**

```bash
npm test -- tests/scrape.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scrape.ts tests/scrape.test.ts
git commit -m "security: cap HTML response body at 5 MB to prevent memory exhaustion"
```

---

## Task 5: Validate Base64 Format in Photo Mode

**Context:** `POST /api/generate` in photo mode accepts `imageBase64` without verifying it is valid base64. The string goes directly to the Anthropic SDK. Add a format check.

**Files:**
- Create: `src/lib/validate.ts`
- Create: `tests/validate.test.ts`
- Modify: `src/app/api/generate/route.ts` (import and use `isValidBase64`)

- [ ] **Step 1: Write failing tests**

Create `tests/validate.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { isValidBase64 } from "@/lib/validate";

describe("isValidBase64", () => {
  it("accepts valid base64 strings", () => {
    expect(isValidBase64("SGVsbG8gV29ybGQ=")).toBe(true); // "Hello World"
    expect(isValidBase64("dGVzdA==")).toBe(true); // "test"
    expect(isValidBase64("YQ==")).toBe(true); // "a"
    expect(isValidBase64("AAAA")).toBe(true); // no padding needed
  });

  it("rejects strings with invalid base64 characters", () => {
    expect(isValidBase64("not-valid!")).toBe(false);
    expect(isValidBase64("has space here==")).toBe(false);
    expect(isValidBase64("<script>alert(1)</script>")).toBe(false);
  });

  it("rejects strings whose length is not a multiple of 4", () => {
    expect(isValidBase64("abc")).toBe(false);
    expect(isValidBase64("abcde")).toBe(false);
  });

  it("accepts empty string (represents zero bytes)", () => {
    expect(isValidBase64("")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm test -- tests/validate.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/validate.ts`**

```typescript
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

export function isValidBase64(s: string): boolean {
  return s.length % 4 === 0 && BASE64_RE.test(s);
}
```

- [ ] **Step 4: Run the tests — they should pass**

```bash
npm test -- tests/validate.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Use `isValidBase64` in the API route**

In `src/app/api/generate/route.ts`, add the import at the top:

```typescript
import { isValidBase64 } from "@/lib/validate";
```

In the photo-mode validation block (around line 125), after the existing checks for `imageBase64` type and `mediaType`, add one more condition to the `if` guard:

Before (the existing if block):
```typescript
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
```

After (add the new check after the length check):
```typescript
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
if (!isValidBase64(imageBase64)) {
  return jsonError(400, "invalid_image", "Please upload a JPEG, PNG, WebP or GIF image.");
}
```

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/validate.ts tests/validate.test.ts src/app/api/generate/route.ts
git commit -m "security: validate base64 format in photo-mode input"
```

---

## Task 6: Fix Rate Limiter Memory Leak

**Context:** `rate-limit.ts` stores one entry per unique IP and never removes old ones. With many distinct IPs (e.g. from spoofed `x-forwarded-for`), the `hits` Map grows without bound. Add `evictExpired` to prune stale entries, and call it on a background interval.

**Files:**
- Modify: `src/lib/rate-limit.ts`
- Modify: `tests/rate-limit.test.ts`

- [ ] **Step 1: Write failing tests for `evictExpired`**

Add to `tests/rate-limit.test.ts`:

```typescript
import { checkRateLimit, resetRateLimit, evictExpired, rateLimitStoreSize } from "@/lib/rate-limit";
```

(Update the existing import line to include the two new exports.)

Add a new describe block at the bottom of `tests/rate-limit.test.ts`:

```typescript
describe("evictExpired", () => {
  beforeEach(() => resetRateLimit());

  it("removes IPs whose last request is outside the window", () => {
    checkRateLimit("1.2.3.4", 1000);
    checkRateLimit("5.6.7.8", 1000);
    expect(rateLimitStoreSize()).toBe(2);
    evictExpired(1000 + HOUR + 1);
    expect(rateLimitStoreSize()).toBe(0);
  });

  it("keeps IPs that have a recent request within the window", () => {
    const now = 1_000_000;
    checkRateLimit("old-ip", now - HOUR - 1); // outside window
    checkRateLimit("new-ip", now - 100);       // inside window
    evictExpired(now);
    expect(rateLimitStoreSize()).toBe(1);
  });

  it("is a no-op when the store is empty", () => {
    evictExpired(Date.now());
    expect(rateLimitStoreSize()).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm test -- tests/rate-limit.test.ts
```

Expected: FAIL — `evictExpired` and `rateLimitStoreSize` not exported.

- [ ] **Step 3: Implement `evictExpired`, `rateLimitStoreSize`, and the background cleanup**

Replace the entire content of `src/lib/rate-limit.ts` with:

```typescript
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

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

/** Removes entries whose most recent request is older than the sliding window. */
export function evictExpired(now: number = Date.now()): void {
  const cutoff = now - WINDOW_MS;
  for (const [ip, times] of hits) {
    if (times[times.length - 1] <= cutoff) hits.delete(ip);
  }
}

/** Test/diagnostic helper: number of IPs currently tracked. */
export function rateLimitStoreSize(): number {
  return hits.size;
}

/** Test helper. */
export function resetRateLimit(): void {
  hits.clear();
}

// Prune stale entries every 10 minutes. .unref() so the timer does not
// prevent the process from exiting cleanly in serverless environments.
if (typeof setInterval !== "undefined") {
  setInterval(() => evictExpired(), CLEANUP_INTERVAL_MS).unref();
}
```

- [ ] **Step 4: Run the tests — they should pass**

```bash
npm test -- tests/rate-limit.test.ts
```

Expected: All tests PASS (existing 3 + new 3 = 6 total).

- [ ] **Step 5: Run the full test suite to confirm nothing regressed**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rate-limit.ts tests/rate-limit.test.ts
git commit -m "security: add evictExpired to prevent unbounded rate-limit map growth"
```

---

## Self-Review

**Spec coverage check:**

| Finding | Task | Covered? |
|---------|------|----------|
| SSRF via redirects (ALTA) | Task 3 | Yes |
| CVE dependencies (ALTA) | Task 1 | Yes |
| TOCTOU DNS (MEDIA) | Task 3 (partial: re-validates on each hop; full fix requires custom DNS agent, out of scope for demo) | Partial |
| Missing CSP/HSTS (MEDIA) | Task 2 | Yes |
| Rate limit memory leak (MEDIA) | Task 6 | Yes |
| No auth on endpoint (BAJA) | Not implemented — acceptable for demo; mitigated by rate limit fix | Acknowledged |
| HTML size limit (BAJA) | Task 4 | Yes |
| Base64 validation (BAJA) | Task 5 | Yes |

**Placeholder scan:** No TBD, TODO, or vague steps found.

**Type consistency:** `ScrapeError`, `safeFetch`, `readBodyWithLimit` all use the same `ScrapeErrorCode` union defined in `scrape.ts`. `isValidBase64` is a plain boolean function with no shared types. `evictExpired`/`rateLimitStoreSize` match the `hits` Map type.
