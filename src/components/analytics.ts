// Fire-and-forget analytics + UTM handling. Never blocks the UI.

const UTM_KEY = "ps_utm";

/**
 * On first load: if the URL carries a utm_source, persist the full query
 * string (minus the leading "?") under sessionStorage["ps_utm"]. Returns the
 * stored value (or null) so callers can send it as the `utm` field everywhere.
 */
export function initUtm(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.sessionStorage.getItem(UTM_KEY);
    if (existing) return existing;
    const search = window.location.search;
    const params = new URLSearchParams(search);
    if (params.get("utm_source")) {
      const value = search.replace(/^\?/, "");
      window.sessionStorage.setItem(UTM_KEY, value);
      return value;
    }
  } catch {
    // sessionStorage can throw in private modes; degrade silently.
  }
  return null;
}

export function getUtm(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(UTM_KEY);
  } catch {
    return null;
  }
}

/**
 * Fire a server-side event. Uses sendBeacon when available so the request
 * survives navigation, falling back to fetch with keepalive. Always swallows
 * errors: analytics must never break or block the UI.
 */
export function trackEvent(
  name: string,
  props: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ name, props: { ...props, utm: getUtm() } });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/event", blob);
      if (ok) return;
    }
    void fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}
