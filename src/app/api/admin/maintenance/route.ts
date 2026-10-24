// Developer controls for scheduled maintenance. Only signed-in users whose verified email is in
// ADMIN_EMAILS can use it. The public status page reads the same data through /api/status.

import { FieldValue } from "firebase-admin/firestore";
import { EmailError, adminDb, emailRoute } from "@/lib/email/server";
import { logEvent, requireAdmin } from "@/lib/security/server";
import { MAINTENANCE, toMaintenance } from "@/lib/status/maintenance";
import { COMPONENTS } from "@/lib/status/types";

export const dynamic = "force-dynamic";

const MAX_SPAN = 7 * 86400000;

function parseWindow(body: any) {
  const title = String(body.title || "").trim().slice(0, 120);
  const description = String(body.description || "").trim().slice(0, 2000);
  const start = Number(body.start);
  const end = Number(body.end);
  const components = (Array.isArray(body.components) ? body.components : []).filter((c: unknown) => typeof c === "string" && COMPONENTS[c as string]);
  if (!title) throw new EmailError("Add a title.", 400);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new EmailError("The end must be after the start.", 400);
  if (end - start > MAX_SPAN) throw new EmailError("A window can be at most 7 days long.", 400);
  return { title, description, start, end, components };
}

/** All windows, newest first (the panel shows upcoming, current and past). */
export const GET = emailRoute(async (req) => {
  await requireAdmin(req);
  const snap = await adminDb().collection(MAINTENANCE).orderBy("start", "desc").limit(100).get();
  return { windows: snap.docs.map((d) => toMaintenance(d.id, d.data())), components: Object.values(COMPONENTS).map((c) => ({ id: c.id, name: c.name })) };
});

export const POST = emailRoute(async (req) => {
  const user = await requireAdmin(req);
  const body = await req.json().catch(() => ({}));
  const db = adminDb();
  const col = db.collection(MAINTENANCE);
  if (typeof body.action === "string") await logEvent(req, "admin_action", `Maintenance: ${body.action}${body.title ? ` "${String(body.title).slice(0, 60)}"` : ""}`, { uid: user.uid, email: user.email });

  switch (body.action) {
    case "create": {
      const w = parseWindow(body);
      const ref = await col.add({ ...w, createdBy: user.email, createdAt: FieldValue.serverTimestamp() });
      return { window: toMaintenance(ref.id, w) };
    }
    case "update": {
      const ref = col.doc(String(body.id || ""));
      if (!(await ref.get()).exists) throw new EmailError("Window not found.", 404);
      const w = parseWindow(body);
      await ref.update({ ...w, updatedBy: user.email, updatedAt: FieldValue.serverTimestamp() });
      return { window: toMaintenance(ref.id, w) };
    }
    case "end-now": {
      // Finish a window early, or start a scheduled one right away.
      const ref = col.doc(String(body.id || ""));
      const snap = await ref.get();
      if (!snap.exists) throw new EmailError("Window not found.", 404);
      const now = Date.now();
      const patch = body.which === "start" ? { start: now } : { end: now, ...(Number(snap.data()!.start) > now ? { start: now - 60000 } : {}) };
      await ref.update({ ...patch, updatedBy: user.email, updatedAt: FieldValue.serverTimestamp() });
      return { window: toMaintenance(ref.id, { ...snap.data(), ...patch }) };
    }
    case "delete": {
      await col.doc(String(body.id || "")).delete();
      return { ok: true };
    }
    default:
      throw new EmailError("Unknown action.", 400);
  }
});
