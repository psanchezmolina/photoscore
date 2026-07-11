const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 3;
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
  hits.forEach((times, ip) => {
    if (times[times.length - 1] <= cutoff) hits.delete(ip);
  });
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
