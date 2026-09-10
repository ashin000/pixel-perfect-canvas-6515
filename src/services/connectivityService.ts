/**
 * Central internet-access detection.
 * navigator.onLine is only a fast hint; a real network probe decides.
 */
export const PROBE_URL = "/api/public/connectivity-check";
const PROBE_TIMEOUT_MS = 2500;

export async function hasInternetAccess(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  if (typeof fetch === "undefined") return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${PROBE_URL}?t=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { "cache-control": "no-store" },
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** Confirms offline state with N consecutive failed probes (avoids flapping). */
export async function confirmOffline(checks = 2, gapMs = 1000): Promise<boolean> {
  for (let i = 0; i < checks; i++) {
    if (await hasInternetAccess()) return false;
    if (i < checks - 1) await new Promise((r) => setTimeout(r, gapMs));
  }
  return true;
}
