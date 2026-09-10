/**
 * Minimal Firestore REST helpers used by the public participant endpoints.
 * Participants are not authenticated, so their writes never touch Firestore
 * directly from the browser — they go through the server route, which
 * validates and re-scores the submission before storing it.
 */

const PROJECT_ID = "quiz-8bb43";

function apiKey(): string {
  return (
    process.env["VITE_FIREBASE_API_KEY"] ??
    process.env["FIREBASE_API_KEY"] ??
    "AIzaSyBsLlX8Th6IC07RlzeBKnKKxdf2y-npyYQ"
  );
}

function base() {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export function encodeValue(v: JsonValue): Record<string, unknown> {
  if (v === null) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(v) } };
}

export function encodeFields(obj: Record<string, JsonValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    out[k] = encodeValue(val);
  }
  return out;
}

export function decodeValue(v: Record<string, unknown>): JsonValue {
  if ("nullValue" in v) return null;
  if ("stringValue" in v) return v["stringValue"] as string;
  if ("booleanValue" in v) return v["booleanValue"] as boolean;
  if ("integerValue" in v) return Number(v["integerValue"]);
  if ("doubleValue" in v) return Number(v["doubleValue"]);
  if ("timestampValue" in v) return v["timestampValue"] as string;
  if ("arrayValue" in v) {
    const values = ((v["arrayValue"] as { values?: Record<string, unknown>[] })?.values ?? []) as Record<
      string,
      unknown
    >[];
    return values.map(decodeValue);
  }
  if ("mapValue" in v) {
    const fields = ((v["mapValue"] as { fields?: Record<string, Record<string, unknown>> })?.fields ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    return decodeFields(fields);
  }
  return null;
}

export function decodeFields(fields: Record<string, Record<string, unknown>>): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}

export async function getDocument<T>(path: string): Promise<T | null> {
  const res = await fetch(`${base()}/${path}?key=${apiKey()}`, { headers: { accept: "application/json" } });
  if (!res.ok) return null;
  const json = (await res.json()) as { fields?: Record<string, Record<string, unknown>> };
  return (json.fields ? decodeFields(json.fields) : null) as T | null;
}

export async function setDocument(path: string, data: Record<string, JsonValue>): Promise<void> {
  const mask = Object.keys(data)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const res = await fetch(`${base()}/${path}?key=${apiKey()}&${mask}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
  if (!res.ok) throw new Error(`Firestore write failed (${res.status}): ${await res.text()}`);
}

/**
 * Creates a document with an explicit id. Returns "created" on success and
 * "exists" when the id was already stored (a harmless resubmission), so a
 * retried offline submission is never reported as a failure.
 */
export async function createDocument(
  collection: string,
  documentId: string,
  data: Record<string, JsonValue>,
): Promise<"created" | "exists"> {
  const res = await fetch(`${base()}/${collection}?documentId=${encodeURIComponent(documentId)}&key=${apiKey()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
  if (res.ok) return "created";
  const text = await res.text();
  if (res.status === 409 || text.includes("ALREADY_EXISTS")) return "exists";
  throw new Error(`Firestore write failed (${res.status}): ${text}`);
}
