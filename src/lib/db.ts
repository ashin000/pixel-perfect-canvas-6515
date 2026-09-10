import { openDB, type IDBPDatabase } from "idb";
import type { Attempt, OfflineQuiz, Quiz } from "./types";

const DB_NAME = "offline-quiz-platform";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (typeof window === "undefined") throw new Error("IndexedDB unavailable on server");
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("quizzes")) db.createObjectStore("quizzes", { keyPath: "id" });
        if (!db.objectStoreNames.contains("attempts")) db.createObjectStore("attempts", { keyPath: "attemptId" });
        if (!db.objectStoreNames.contains("syncQueue")) db.createObjectStore("syncQueue", { keyPath: "id" });
        if (!db.objectStoreNames.contains("session")) db.createObjectStore("session");
        // local stand-in for the cloud when no cloud credentials are configured
        if (!db.objectStoreNames.contains("cloudQuizzes")) db.createObjectStore("cloudQuizzes", { keyPath: "id" });
        if (!db.objectStoreNames.contains("cloudAttempts")) db.createObjectStore("cloudAttempts", { keyPath: "attemptId" });
      },
    });
  }
  return dbPromise;
}

/* ---------- offline quizzes (student device) ---------- */
export async function saveOfflineQuiz(quiz: Quiz): Promise<OfflineQuiz> {
  const db = await getDb();
  const offline: OfflineQuiz = { ...quiz, downloadedAt: new Date().toISOString(), offlineReady: true };
  await db.put("quizzes", offline);
  return offline;
}
export async function getOfflineQuiz(id: string): Promise<OfflineQuiz | undefined> {
  return (await getDb()).get("quizzes", id);
}
export async function listOfflineQuizzes(): Promise<OfflineQuiz[]> {
  return (await getDb()).getAll("quizzes");
}

/* ---------- attempts ---------- */
export async function putAttempt(attempt: Attempt) {
  await (await getDb()).put("attempts", attempt);
  return attempt;
}
export async function getAttempt(attemptId: string): Promise<Attempt | undefined> {
  return (await getDb()).get("attempts", attemptId);
}
export async function listAttempts(): Promise<Attempt[]> {
  return (await getDb()).getAll("attempts");
}

/* ---------- sync queue ---------- */
export interface SyncJob {
  id: string;
  attemptId: string;
  createdAt: string;
  retries: number;
  lastError?: string;
}
export async function enqueueSync(attemptId: string) {
  const db = await getDb();
  await db.put("syncQueue", { id: attemptId, attemptId, createdAt: new Date().toISOString(), retries: 0 } as SyncJob);
}
export async function listSyncJobs(): Promise<SyncJob[]> {
  return (await getDb()).getAll("syncQueue");
}
export async function updateSyncJob(job: SyncJob) {
  await (await getDb()).put("syncQueue", job);
}
export async function removeSyncJob(id: string) {
  await (await getDb()).delete("syncQueue", id);
}

/* ---------- student session ---------- */
export interface StudentSession {
  studentName: string;
  roleNumber: string;
  /** @deprecated mirrors roleNumber */
  registerNumber: string;
}
export async function saveStudentSession(s: StudentSession) {
  await (await getDb()).put("session", s, "student");
}
export async function getStudentSession(): Promise<StudentSession | undefined> {
  return (await getDb()).get("session", "student");
}

/* ---------- local cloud mirror (fallback when no cloud config) ---------- */
export async function localCloudPutQuiz(quiz: Quiz) {
  await (await getDb()).put("cloudQuizzes", quiz);
}
export async function localCloudListQuizzes(): Promise<Quiz[]> {
  return (await getDb()).getAll("cloudQuizzes");
}
export async function localCloudDeleteQuiz(id: string) {
  await (await getDb()).delete("cloudQuizzes", id);
}
export async function localCloudPutAttempt(a: Attempt) {
  await (await getDb()).put("cloudAttempts", a);
}
export async function localCloudListAttempts(): Promise<Attempt[]> {
  return (await getDb()).getAll("cloudAttempts");
}
