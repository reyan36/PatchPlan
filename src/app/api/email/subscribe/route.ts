import { createHash, randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { EmailError, adminDb, emailRoute } from "@/lib/email/server";
import type { EmailList } from "@/lib/email/types";

export const dynamic = "force-dynamic";

const LISTS: EmailList[] = ["weekly", "daily", "announcements"];
const EMAIL_RE = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,}$/i;

// Best-effort per-instance throttle: 8 sign-ups per IP per 10 minutes.
const hits = new Map<string, number[]>();
function throttle(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  if (recent.length >= 8) throw new EmailError("Too many sign-ups from this network. Try again later.", 429);
  if (hits.size > 5000) hits.clear();
  hits.set(ip, [...recent, now]);
}

/** Public pages use either the workspace id or a custom news/roadmap slug. Returns the workspace id if it exists. */
async function resolveScope(idOrSlug: string): Promise<string | null> {
  const db = adminDb();
  const [fam, cfg, profile] = await Promise.all([
    db.collection("families").doc(idOrSlug).get(),
    db.collection("public_configs").doc(idOrSlug).get(),
    db.collection("user_profiles").doc(idOrSlug).get(),
  ]);
  if (fam.exists || cfg.exists || profile.exists) return idOrSlug;
  for (const field of ["newsSlug", "roadmapSlug"]) {
    const hit = await db.collection("public_configs").where(field, "==", idOrSlug).limit(1).get();
    if (!hit.empty) return hit.docs[0].id;
  }
  return null;
}

/** Public: a player subscribes to a studio's emails. */
export const POST = emailRoute(async (req) => {
  const body = await req.json().catch(() => ({}));
  // Honeypot field: real people never fill it.
  if (body.website) return { ok: true };

  throttle(req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local");

  const requested = String(body.scopeId || "").slice(0, 128);
  const email = String(body.email || "").trim().toLowerCase();
  if (!requested || !/^[A-Za-z0-9_-]+$/.test(requested)) throw new EmailError("Unknown studio.", 400);
  if (!EMAIL_RE.test(email)) throw new EmailError("Enter a valid email address.", 400);

  const lists = (Array.isArray(body.lists) ? body.lists : LISTS).filter((l: string) => LISTS.includes(l as EmailList));
  const db = adminDb();
  const scopeId = await resolveScope(requested);
  if (!scopeId) throw new EmailError("Unknown studio.", 404);

  // One doc per studio + email, so re-subscribing updates instead of duplicating.
  const id = `${scopeId}_${createHash("sha256").update(email).digest("hex").slice(0, 24)}`;
  const ref = db.collection("subscribers").doc(id);
  const existing = await ref.get();

  await ref.set(
    {
      scopeId,
      email,
      name: String(body.name || "").slice(0, 80),
      status: "active",
      lists: lists.length ? lists : LISTS,
      source: String(body.source || "signup").slice(0, 32),
      token: existing.data()?.token || randomBytes(24).toString("hex"),
      ...(existing.exists ? { resubscribedAt: FieldValue.serverTimestamp() } : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true }
  );
  return { ok: true };
});
