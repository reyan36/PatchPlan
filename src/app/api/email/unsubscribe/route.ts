import { timingSafeEqual } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { EmailError, adminDb, emailRoute } from "@/lib/email/server";

export const dynamic = "force-dynamic";

/**
 * Public: unsubscribe with the per-subscriber token.
 * POST only, so link scanners that prefetch URLs can't unsubscribe anyone.
 * Also serves RFC 8058 one-click (List-Unsubscribe-Post) from mail clients.
 */
export const POST = emailRoute(async (req) => {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const id = String(body.s || url.searchParams.get("s") || "");
  const token = String(body.t || url.searchParams.get("t") || "");
  const resubscribe = body.resubscribe === true;
  if (!id || !token || id.includes("/")) throw new EmailError("This unsubscribe link is invalid.", 400);

  const ref = adminDb().collection("subscribers").doc(id);
  const snap = await ref.get();
  const stored = String(snap.data()?.token || "");
  const valid = snap.exists && stored.length === token.length && timingSafeEqual(Buffer.from(stored), Buffer.from(token));
  if (!valid) throw new EmailError("This unsubscribe link is invalid or expired.", 404);

  await ref.update(
    resubscribe
      ? { status: "active", resubscribedAt: FieldValue.serverTimestamp() }
      : { status: "unsubscribed", unsubscribedAt: FieldValue.serverTimestamp() }
  );
  return { ok: true, status: resubscribe ? "active" : "unsubscribed" };
});
