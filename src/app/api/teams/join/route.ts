// Joining a studio with its code. This runs on the server because the Firestore rules don't let
// non-members read or edit a studio, so nobody can list studios or their join codes from a browser.

import { FieldValue } from "firebase-admin/firestore";
import { EmailError, adminDb, emailRoute, verifyUser } from "@/lib/email/server";

export const dynamic = "force-dynamic";

// Best-effort per-instance throttle against guessing codes: 10 tries per user per 10 minutes.
const tries = new Map<string, number[]>();

export const POST = emailRoute(async (req) => {
  const user = await verifyUser(req);
  const now = Date.now();
  const recent = (tries.get(user.uid) || []).filter((t) => now - t < 10 * 60_000);
  if (recent.length >= 10) throw new EmailError("Too many attempts. Try again in a few minutes.", 429);
  if (tries.size > 5000) tries.clear();
  tries.set(user.uid, [...recent, now]);

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "").trim().toUpperCase().slice(0, 32);
  const nickname = String(body.nickname || "").trim().slice(0, 60);
  if (!code || !nickname) throw new EmailError("Enter the join code and your nickname.", 400);

  const db = adminDb();
  const hit = await db.collection("families").where("joinCode", "==", code).limit(1).get();
  if (hit.empty) throw new EmailError("Invalid join code.", 404);
  const fam = hit.docs[0];
  const members: { uid: string }[] = fam.data().members || [];
  const already = members.some((m) => m.uid === user.uid);

  const batch = db.batch();
  if (!already) {
    batch.update(fam.ref, {
      // The owner rejoining (e.g. after an older version let them leave) keeps the owner role.
      members: FieldValue.arrayUnion({ uid: user.uid, nickname, role: fam.data().ownerId === user.uid ? "owner" : "worker", email: user.email || "" }),
      memberIds: FieldValue.arrayUnion(user.uid),
    });
  } else {
    // Older studios may not have memberIds yet.
    batch.update(fam.ref, { memberIds: FieldValue.arrayUnion(user.uid) });
  }
  batch.set(db.collection("user_profiles").doc(user.uid), { activeFamilyId: fam.id, joinedFamilies: FieldValue.arrayUnion(fam.id) }, { merge: true });
  await batch.commit();

  return { familyId: fam.id, alreadyMember: already };
});
