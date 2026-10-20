import { FieldValue } from "firebase-admin/firestore";
import { EmailError, adminDb, appUrl, emailRoute, requireMember, sendTest, sendToSubscribers, verifyUser } from "@/lib/email/server";
import type { Campaign } from "@/lib/email/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sends a saved campaign to its audience, or with {test:true} sends one copy to the caller only.
 * The campaign is read on the server, so what goes out is exactly what's saved.
 */
export const POST = emailRoute(async (req) => {
  await verifyUser(req);
  const { campaignId, test } = await req.json().catch(() => ({}));
  if (!campaignId) throw new EmailError("Missing campaign.", 400);

  const ref = adminDb().collection("campaigns").doc(String(campaignId));
  const snap = await ref.get();
  if (!snap.exists) throw new EmailError("Campaign not found.", 404);
  const c = snap.data() as Omit<Campaign, "id">;
  const scopeId = c.familyId || c.userId;
  const { email } = await requireMember(req, scopeId);

  if (!c.subject?.trim()) throw new EmailError("Add a subject line first.", 400);
  if (!c.blocks?.length) throw new EmailError("Add some content first.", 400);
  const content = { subject: c.subject, preheader: c.preheader || "", blocks: c.blocks, theme: c.theme };

  if (test) {
    if (!email) throw new EmailError("Your account has no email address for a test send.", 400);
    await sendTest(scopeId, email, appUrl(req), content);
    return { ok: true, sentTo: email };
  }

  // Claim the campaign so a double click can't send twice.
  const claimed = await adminDb().runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (fresh.data()?.status !== "draft") return false;
    tx.update(ref, { status: "sending", updatedAt: FieldValue.serverTimestamp() });
    return true;
  });
  if (!claimed) throw new EmailError("This campaign was already sent.", 409);

  try {
    const { sent } = await sendToSubscribers({ scopeId, ...content, audience: c.audience || "all", base: appUrl(req) });
    await ref.update({ status: "sent", recipients: sent, sentAt: FieldValue.serverTimestamp(), error: FieldValue.delete() });
    return { ok: true, sent };
  } catch (err) {
    // Back to draft so the studio can fix the setup and retry.
    await ref.update({ status: "draft", error: err instanceof Error ? err.message : "Send failed" });
    throw err;
  }
});
