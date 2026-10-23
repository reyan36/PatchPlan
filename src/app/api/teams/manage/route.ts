// Owner-only studio actions that the Firestore rules don't allow from the browser:
// transferring ownership and deleting the studio with all of its data.

import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { EmailError, adminDb, emailRoute, verifyUser } from "@/lib/email/server";
import { removeDomain } from "@/lib/email/domains";

export const dynamic = "force-dynamic";

// Studio data, by how it's scoped.
const BY_FAMILY_ID = ["tasks", "ideas", "articles", "roadmap", "signals", "modules", "module_rows", "campaigns"];
const BY_SCOPE_ID = ["contacts", "subscribers", "beta_testers", "beta_reports", "beta_files"];
const BY_DOC_ID = ["board_configs", "integrations", "email_settings", "public_configs", "roadmap_configs", "beta_programs"];

async function deleteStudioData(db: Firestore, familyId: string) {
  const writer = db.bulkWriter();
  let count = 0;
  const queries = [
    ...BY_FAMILY_ID.map((c) => db.collection(c).where("familyId", "==", familyId)),
    ...BY_SCOPE_ID.map((c) => db.collection(c).where("scopeId", "==", familyId)),
  ];
  for (const q of queries) {
    const snap = await q.select().get();
    snap.docs.forEach((d) => {
      writer.delete(d.ref);
      count++;
    });
  }
  BY_DOC_ID.forEach((c) => writer.delete(db.collection(c).doc(familyId)));
  await writer.close();
  return count;
}

export const POST = emailRoute(async (req) => {
  const user = await verifyUser(req);
  const body = await req.json().catch(() => ({}));
  const familyId = String(body.familyId || "").slice(0, 128);
  const db = adminDb();
  const ref = db.collection("families").doc(familyId);
  const fam = await ref.get();
  if (!fam.exists) throw new EmailError("Studio not found.", 404);
  const data = fam.data()!;
  if (data.ownerId !== user.uid) throw new EmailError("Only the studio owner can do this.", 403);
  const members: { uid: string; role: string }[] = data.members || [];

  if (body.action === "transfer") {
    const to = String(body.uid || "");
    if (!to || to === user.uid || !members.some((m) => m.uid === to)) throw new EmailError("Pick a current member.", 400);
    await ref.update({
      ownerId: to,
      members: members.map((m) => ({ ...m, role: m.uid === to ? "owner" : m.uid === user.uid ? "worker" : m.role })),
    });
    return { ok: true };
  }

  if (body.action === "delete") {
    if (String(body.confirm || "").trim() !== String(data.name || "").trim()) throw new EmailError("Type the studio name to confirm.", 400);
    // A custom sending domain is removed from the email provider too.
    await removeDomain(familyId).catch(() => {});
    const deleted = await deleteStudioData(db, familyId);
    // Take the studio out of every member's profile.
    const uids = Array.from(new Set([data.ownerId, ...(data.memberIds || []), ...members.map((m) => m.uid)].filter(Boolean)));
    const profiles = await Promise.all(uids.map((uid) => db.collection("user_profiles").doc(uid).get()));
    const batch = db.batch();
    profiles.forEach((p) => {
      if (!p.exists) return;
      batch.update(p.ref, {
        joinedFamilies: FieldValue.arrayRemove(familyId),
        ...(p.data()?.activeFamilyId === familyId ? { activeFamilyId: null } : {}),
      });
    });
    batch.delete(ref);
    await batch.commit();
    return { ok: true, deleted };
  }

  throw new EmailError("Unknown action.", 400);
});
