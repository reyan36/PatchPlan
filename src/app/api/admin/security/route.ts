// Security log for PatchPlan admins (ADMIN_EMAILS): recent events, alert setup and a test alert.

import { adminDb, emailRoute } from "@/lib/email/server";
import { EVENT_LABEL, SECURITY_EVENTS, logEvent, requireAdmin, sendAlert } from "@/lib/security/server";

export const dynamic = "force-dynamic";

export const GET = emailRoute(async (req) => {
  await requireAdmin(req);
  const snap = await adminDb()
    .collection(SECURITY_EVENTS)
    .where("at", ">=", Date.now() - 7 * 86400000)
    .orderBy("at", "desc")
    .limit(500)
    .get();
  return {
    events: snap.docs.map((d) => {
      const e = d.data();
      return { id: d.id, type: e.type, label: EVENT_LABEL[e.type as keyof typeof EVENT_LABEL] ?? e.type, severity: e.severity, detail: e.detail, at: e.at, ip: e.ip, country: e.country, path: e.path, uid: e.uid, email: e.email, dropped: e.dropped || 0 };
    }),
    alerts: {
      email: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM_ADDRESS && process.env.ADMIN_EMAILS),
      webhook: !!process.env.SECURITY_WEBHOOK_URL,
      recipients: (process.env.ADMIN_EMAILS || "").split(",").filter((e) => e.trim()).length,
    },
  };
});

export const POST = emailRoute(async (req) => {
  const user = await requireAdmin(req);
  const sent = await sendAlert("Test alert", [`Sent from the security page by ${user.email}.`, "If you can read this, alerts reach you."]);
  await logEvent(req, "admin_action", `Sent a test alert (${sent.join(", ") || "not delivered"})`, { uid: user.uid, email: user.email });
  return { sent };
});
