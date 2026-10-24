// "Download my data": exports everything in a workspace as JSON (GDPR data portability).
//
// The browser asks for one collection page at a time (POST { scopeId, part, after }), so no
// response gets near Vercel's 4.5 MB limit even with big whiteboards or screenshots, and joins
// the pages into one file. A studio can be exported by its owner; a personal workspace by its user.

import { FieldPath, type DocumentData, type Query } from "firebase-admin/firestore";
import { EmailError, adminDb, emailRoute, verifyUser } from "@/lib/email/server";
import { enforceLimit, logEvent } from "@/lib/security/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// How each collection is tied to a workspace (same lists as studio deletion in /api/teams/manage).
const BY_OWNER = ["tasks", "ideas", "idea_bodies", "articles", "roadmap", "signals", "modules", "module_rows", "campaigns", "projects", "teams"];
const BY_SCOPE_ID = ["contacts", "subscribers", "beta_testers", "beta_reports", "beta_files"];
const BY_DOC_ID = ["board_configs", "integrations", "email_settings", "public_configs", "roadmap_configs", "beta_programs"];
const EXPORT_PARTS = [...BY_OWNER, ...BY_SCOPE_ID, ...BY_DOC_ID];

const PAGE_DOCS = 300;
const PAGE_BYTES = 3_000_000;

// Credentials never go into a file that might be emailed or shared by mistake.
const SECRET_KEY = /token|secret|password|webhook|apikey|api_key/i;

/** Firestore values → plain JSON (timestamps as ISO strings), with secrets removed. */
function plain(value: unknown, key = ""): unknown {
  if (key && SECRET_KEY.test(key) && typeof value === "string") return "[removed]";
  if (value === null || typeof value !== "object") return value;
  if (typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate().toISOString();
  if (Array.isArray(value)) return value.map((v) => plain(v));
  if ("path" in (value as object) && "firestore" in (value as object)) return (value as { path: string }).path;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as DocumentData)) out[k] = plain(v, k);
  return out;
}

async function authorize(req: Request, scopeId: string) {
  const user = await verifyUser(req);
  enforceLimit(req, `export:${user.uid}`, 300, 10 * 60_000, user.uid);
  if (!scopeId) throw new EmailError("Missing workspace.", 400);
  if (scopeId === user.uid) return { user, studio: null };
  const fam = await adminDb().collection("families").doc(scopeId).get();
  if (!fam.exists) throw new EmailError("Studio not found.", 404);
  if (fam.data()?.ownerId !== user.uid) throw new EmailError("Only the studio owner can export its data.", 403);
  return { user, studio: fam };
}

export const POST = emailRoute(async (req) => {
  const body = await req.json().catch(() => ({}));
  const scopeId = String(body.scopeId || "").slice(0, 128);
  const part = String(body.part || "");
  const after = typeof body.after === "string" ? body.after : null;
  const { user, studio } = await authorize(req, scopeId);
  const db = adminDb();
  const personal = !studio;

  // First call: the workspace itself plus the list of parts to fetch.
  if (part === "_start") {
    await logEvent(req, "data_export", `${personal ? "Personal workspace" : `Studio ${String(studio!.data()?.name || scopeId).slice(0, 60)}`}`, { uid: user.uid, email: user.email });
    const profile = personal ? await db.collection("user_profiles").doc(user.uid).get() : null;
    return {
      parts: EXPORT_PARTS,
      workspace: personal
        ? { type: "personal", id: user.uid, account: { email: user.email || "", name: user.name || "" }, profile: plain(profile?.data() || {}) }
        : { type: "studio", id: scopeId, ...(plain(studio!.data()) as object) },
    };
  }
  if (!EXPORT_PARTS.includes(part)) throw new EmailError("Unknown part.", 400);

  if (BY_DOC_ID.includes(part)) {
    const snap = await db.collection(part).doc(scopeId).get();
    return { docs: snap.exists ? [{ id: snap.id, ...(plain(snap.data()) as object) }] : [], next: null };
  }

  let q: Query = db.collection(part);
  if (BY_SCOPE_ID.includes(part)) q = q.where("scopeId", "==", scopeId);
  else q = personal ? q.where("userId", "==", user.uid) : q.where("familyId", "==", scopeId);
  q = q.orderBy(FieldPath.documentId()).limit(PAGE_DOCS);
  if (after) q = q.startAfter(after);
  const snap = await q.get();

  const docs: unknown[] = [];
  let bytes = 0;
  let last: string | null = null;
  for (const d of snap.docs) {
    const data = d.data();
    // Personal workspaces hold only docs that aren't part of a studio.
    if (personal && BY_OWNER.includes(part) && data.familyId) {
      last = d.id;
      continue;
    }
    const row = { id: d.id, ...(plain(data) as object) };
    const size = JSON.stringify(row).length;
    if (docs.length && bytes + size > PAGE_BYTES) break;
    docs.push(row);
    bytes += size;
    last = d.id;
  }
  const more = snap.size === PAGE_DOCS || (last !== null && last !== snap.docs[snap.size - 1]?.id);
  return { docs, next: more ? last : null };
});
