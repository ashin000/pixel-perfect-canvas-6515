import { collection, getDocs, query, where } from "firebase/firestore";
import { getDbFirestore, isFirebaseConfigured } from "./firebase";
import {
  deleteFirestoreDocument,
  getFirestoreDocument,
  listFirestoreDocuments,
  putFirestoreDocument,
} from "./firestore-client";
import {
  localCloudDeleteQuiz,
  localCloudListAttempts,
  localCloudListQuizzes,
  localCloudPutAttempt,
  localCloudPutQuiz,
} from "./db";
import type { Attempt, Quiz } from "./types";

/**
 * Cloud layer. Uses Firebase Cloud Firestore when credentials are present,
 * otherwise mirrors everything into a local store so the whole flow is
 * demonstrable without any credentials.
 */
export const cloudMode = () => (isFirebaseConfigured ? "firebase" : "local");

export async function saveQuizToCloud(quiz: Quiz) {
  if (!isFirebaseConfigured) return localCloudPutQuiz(quiz);
  // keep a local copy first so nothing is lost if the network is slow
  await localCloudPutQuiz(quiz);
  await putFirestoreDocument("quizzes", quiz.id, quiz as unknown as Record<string, unknown>);
}

export async function deleteQuizFromCloud(id: string) {
  if (!isFirebaseConfigured) return localCloudDeleteQuiz(id);
  await deleteFirestoreDocument("quizzes", id);
  await localCloudDeleteQuiz(id);
}

export async function listTeacherQuizzes(teacherId: string): Promise<Quiz[]> {
  if (!isFirebaseConfigured) return (await localCloudListQuizzes()).filter((q) => q.teacherId === teacherId);
  return (await listFirestoreDocuments<Quiz>("quizzes")).filter((quiz) => quiz.teacherId === teacherId);
}

export async function findQuizByCode(code: string): Promise<Quiz | null> {
  const wanted = code.trim().toUpperCase();
  if (!isFirebaseConfigured) {
    const all = await localCloudListQuizzes();
    return all.find((q) => q.code === wanted && q.published) ?? null;
  }
  const db = getDbFirestore();
  if (!db) return null;
  const snap = await getDocs(query(collection(db, "quizzes"), where("code", "==", wanted), where("published", "==", true)));
  return snap.docs[0]?.data() as Quiz | undefined ?? null;
}

export async function getQuizFromCloud(id: string): Promise<Quiz | null> {
  if (!isFirebaseConfigured) return (await localCloudListQuizzes()).find((q) => q.id === id) ?? null;
  return getFirestoreDocument<Quiz>("quizzes", id);
}

export async function pushAttemptToCloud(attempt: Attempt) {
  const payload: Attempt = { ...attempt, syncStatus: "SYNCED" };
  if (!isFirebaseConfigured) return localCloudPutAttempt(payload);
  // Participants are not signed in, so the submission is validated and stored
  // by our own server endpoint instead of writing to the database directly.
  const res = await fetch("/api/public/submit-attempt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(attempt),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Sync failed (${res.status}) ${detail.slice(0, 200)}`);
  }

}

export async function listCloudAttempts(teacherQuizIds: string[]): Promise<Attempt[]> {
  if (!isFirebaseConfigured) return (await localCloudListAttempts()).filter((a) => teacherQuizIds.includes(a.quizId));
  if (teacherQuizIds.length === 0) return [];
  return (await listFirestoreDocuments<Attempt>("attempts")).filter((attempt) => teacherQuizIds.includes(attempt.quizId));
}

export async function listAllCloudAttempts(): Promise<Attempt[]> {
  if (!isFirebaseConfigured) return localCloudListAttempts();
  return listFirestoreDocuments<Attempt>("attempts");
}
