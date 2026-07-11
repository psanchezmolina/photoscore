import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit, evictExpired, rateLimitStoreSize } from "@/lib/rate-limit";

const HOUR = 60 * 60 * 1000;

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimit());

  it("allows up to 3 requests per hour per IP", () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("1.2.3.4", 1000 + i)).toBe(true);
    }
    expect(checkRateLimit("1.2.3.4", 2000)).toBe(false);
  });

  it("tracks IPs independently", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("1.2.3.4", 1000 + i);
    expect(checkRateLimit("5.6.7.8", 2000)).toBe(true);
  });

  it("frees slots after the window passes", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("1.2.3.4", 1000 + i);
    expect(checkRateLimit("1.2.3.4", 1000 + HOUR + 100)).toBe(true);
  });
});

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
    checkRateLimit("old-ip", now - HOUR - 1);
    checkRateLimit("new-ip", now - 100);
    evictExpired(now);
    expect(rateLimitStoreSize()).toBe(1);
  });

  it("is a no-op when the store is empty", () => {
    evictExpired(Date.now());
    expect(rateLimitStoreSize()).toBe(0);
  });
});
