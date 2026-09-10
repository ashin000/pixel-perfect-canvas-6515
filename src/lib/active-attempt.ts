const KEY = "aithera:active-attempt";

export function setActiveAttemptId(attemptId: string) {
  try {
    window.localStorage.setItem(KEY, attemptId);
  } catch {
    // storage unavailable — the attempt is still in IndexedDB
  }
}

export function getActiveAttemptId(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearActiveAttemptId() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
