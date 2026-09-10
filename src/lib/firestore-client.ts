import { getFirebaseAuth } from "./firebase";

const PROJECT_ID = "quiz-8bb43";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

type FirestoreValue = Record<string, unknown>;

function encodeValue(value: unknown): FirestoreValue {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "object") return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } };
  return { nullValue: null };
}

function encodeFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) fields[key] = encodeValue(value);
  }
  return fields;
}

function decodeValue(value: FirestoreValue): unknown {
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value["stringValue"];
  if ("booleanValue" in value) return value["booleanValue"];
  if ("integerValue" in value) return Number(value["integerValue"]);
  if ("doubleValue" in value) return Number(value["doubleValue"]);
  if ("timestampValue" in value) return value["timestampValue"];
  if ("arrayValue" in value) {
    const array = value["arrayValue"] as { values?: FirestoreValue[] };
    return (array.values ?? []).map(decodeValue);
  }
  if ("mapValue" in value) {
    const map = value["mapValue"] as { fields?: Record<string, FirestoreValue> };
    return decodeFields(map.fields ?? {});
  }
  return null;
}

function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

async function authHeaders(): Promise<Record<string, string>> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new Error("Your coordinator session has expired. Please sign in again.");
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

async function firestoreRequest(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const headers = { ...(await authHeaders()), ...(init?.headers ?? {}) };
    const response = await fetch(`${BASE_URL}/${path}`, { ...init, headers, signal: controller.signal });
    if (!response.ok) {
      const detail = await response.text();
      if (response.status === 403) throw new Error("This coordinator account does not have database permission.");
      throw new Error(`Database request failed (${response.status}): ${detail}`);
    }
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Database request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function putFirestoreDocument(collection: string, id: string, data: Record<string, unknown>): Promise<void> {
  await firestoreRequest(`${collection}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
}

export async function deleteFirestoreDocument(collection: string, id: string): Promise<void> {
  await firestoreRequest(`${collection}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getFirestoreDocument<T>(collection: string, id: string): Promise<T | null> {
  try {
    const response = await firestoreRequest(`${collection}/${encodeURIComponent(id)}`);
    const document = (await response.json()) as { fields?: Record<string, FirestoreValue> };
    return document.fields ? (decodeFields(document.fields) as T) : null;
  } catch (error) {
    if (String((error as Error).message).includes("(404)")) return null;
    throw error;
  }
}

export async function listFirestoreDocuments<T>(collection: string): Promise<T[]> {
  const response = await firestoreRequest(`${collection}?pageSize=1000`);
  const payload = (await response.json()) as { documents?: Array<{ fields?: Record<string, FirestoreValue> }> };
  return (payload.documents ?? []).flatMap((document) =>
    document.fields ? [decodeFields(document.fields) as T] : [],
  );
}