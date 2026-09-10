import { doc, getDoc } from "firebase/firestore";
import { getDbFirestore } from "./firebase";

/**
 * Coordinator (admin) accounts are created manually in Firebase Authentication.
 * An optional Firestore record at `admins/{uid}` can deactivate an account:
 *   { email, name, role: "admin", active: true }
 * When no record exists, any manually created Firebase user is treated as an
 * active coordinator (there is no public sign-up).
 */
export interface AdminRecord {
  email: string;
  name?: string;
  role: "admin";
  active: boolean;
}

/** Coordinator accounts allowed to reach the admin area. */
export const COORDINATOR_EMAILS: string[] = ["laptopnodell@gmail.com"];

export async function resolveIsAdmin(uid: string, email?: string | null): Promise<boolean> {
  if (COORDINATOR_EMAILS.length > 0) {
    const allowed = COORDINATOR_EMAILS.some((e) => e.toLowerCase() === (email ?? "").toLowerCase());
    if (!allowed) return false;
  }

  const db = getDbFirestore();
  if (!db) return true;
  try {
    // Never let a slow / blocked lookup keep the coordinator on "Checking access…".
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
    const snap = await Promise.race([getDoc(doc(db, "admins", uid)), timeout]);
    if (!snap || !snap.exists()) return true;
    const data = snap.data() as Partial<AdminRecord>;
    return data.role === "admin" && data.active !== false;
  } catch {
    // offline or rules blocked the read -> the Firebase session is enough
    return true;
  }
}

