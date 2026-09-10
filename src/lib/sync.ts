import { getAttempt, listSyncJobs, putAttempt, removeSyncJob, updateSyncJob } from "./db";
import { pushAttemptToCloud } from "./cloud";

let running = false;
const listeners = new Set<() => void>();

export function onSyncChange(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((l) => l());
}

export async function pendingSyncCount() {
  return (await listSyncJobs()).length;
}

/** Drains the sync queue. Safe to call repeatedly; retries with backoff counter. */
export async function runSync(): Promise<{ synced: number; failed: number }> {
  if (running || typeof navigator === "undefined" || !navigator.onLine) return { synced: 0, failed: 0 };
  running = true;
  let synced = 0;
  let failed = 0;
  try {
    for (const job of await listSyncJobs()) {
      const attempt = await getAttempt(job.attemptId);
      if (!attempt) {
        await removeSyncJob(job.id);
        continue;
      }
      try {
        await pushAttemptToCloud(attempt);
        await putAttempt({ ...attempt, syncStatus: "SYNCED" });
        await removeSyncJob(job.id);
        synced++;
      } catch (e) {
        failed++;
        await putAttempt({ ...attempt, syncStatus: "SYNC_FAILED" });
        await updateSyncJob({ ...job, retries: job.retries + 1, lastError: String(e) });
      }
    }
  } finally {
    running = false;
    notify();
  }
  return { synced, failed };
}

export function startSyncWatcher() {
  if (typeof window === "undefined") return () => {};
  const trigger = () => void runSync();
  window.addEventListener("online", trigger);
  const interval = window.setInterval(trigger, 20000);
  trigger();
  return () => {
    window.removeEventListener("online", trigger);
    window.clearInterval(interval);
  };
}
