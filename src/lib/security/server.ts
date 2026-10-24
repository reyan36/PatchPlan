// Server-only: security event log, alerts and rate limits.
//
// Events go to the `security_events` collection (no browser access: the Firestore rules don't list it).
// "high" events alert right away; a burst of "warn" events (an attack pattern) alerts once per 30 minutes.
// Alerts go by email to ADMIN_EMAILS and, if set, to SECURITY_WEBHOOK_URL (a Discord webhook).

import { FieldValue } from "firebase-admin/firestore";
import { EmailError, adminDb, verifyUser } from "@/lib/email/server";
import { isAdmin } from "@/lib/status/maintenance";

export const SECURITY_EVENTS = "security_events";

export type Severity = "info" | "warn" | "high";

export type EventType =
  | "auth_invalid" // a forged or malformed sign-in token (expired ones are normal and not logged)
  | "forbidden" // signed in, but asked for a workspace they're not in
  | "rate_limited"
  | "admin_denied" // a non-admin called an admin API
  | "admin_action"
  | "cron_unauthorized"
  | "ssrf_blocked" // link preview asked for a private/internal address
  | "ai_quota" // a user hit the daily AI limit
  | "studio_deleted"
  | "ownership_transferred"
  | "data_export";

export const EVENT_LABEL: Record<EventType, string> = {
  auth_invalid: "Invalid sign-in token",
  forbidden: "Access to another workspace",
  rate_limited: "Rate limit hit",
  admin_denied: "Admin API denied",
  admin_action: "Admin action",
  cron_unauthorized: "Cron called without secret",
  ssrf_blocked: "Blocked internal URL",
  ai_quota: "Daily AI limit reached",
  studio_deleted: "Studio deleted",
  ownership_transferred: "Ownership transferred",
  data_export: "Data exported",
};

/** How many warn events in 10 minutes count as an attack. */
const BURST = Number(process.env.SECURITY_BURST_THRESHOLD) || 20;
const BURST_WINDOW = 10 * 60_000;
const ALERT_COOLDOWN = 30 * 60_000;

export function clientIp(req?: Request | null) {
  const h = req?.headers;
  return h?.get("x-real-ip") || h?.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

// ---------- Rate limiting ----------

const hits = new Map<string, number[]>();

/**
 * Sliding-window limit kept in this server instance's memory. Free and instant; Vercel may run a few
 * instances, so the real ceiling is a small multiple of `max`. Good against scripts, not a hard quota.
 */
export function overLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  if (hits.size > 10_000) hits.clear();
  hits.set(key, recent);
  return recent.length > max;
}

/** Throws a 429 (and logs it once per window) when the key is over its limit. */
export function enforceLimit(req: Request, key: string, max: number, windowMs: number, uid?: string) {
  if (!overLimit(key, max, windowMs)) return;
  const n = hits.get(key)?.length ?? 0;
  if (n === max + 1) void logEvent(req, "rate_limited", `${key.split(":")[0]}: over ${max} requests in ${Math.round(windowMs / 60000)} min`, { uid });
  throw new EmailError("Too many requests. Slow down and try again in a minute.", 429);
}

// ---------- Event log ----------

const SEVERITY: Record<EventType, Severity> = {
  auth_invalid: "warn",
  forbidden: "warn",
  rate_limited: "warn",
  admin_denied: "high",
  admin_action: "info",
  cron_unauthorized: "warn",
  ssrf_blocked: "warn",
  ai_quota: "warn",
  studio_deleted: "info",
  ownership_transferred: "info",
  data_export: "info",
};

// Flood guard: during an attack, don't turn every bad request into a Firestore write.
let windowStart = 0;
let writesThisMinute = 0;
let dropped = 0;

export async function logEvent(req: Request | null, type: EventType, detail: string, opts: { uid?: string; email?: string } = {}) {
  try {
    const now = Date.now();
    if (now - windowStart > 60_000) {
      windowStart = now;
      writesThisMinute = 0;
    }
    if (++writesThisMinute > 40) {
      dropped++;
      return;
    }
    const severity = SEVERITY[type];
    const url = req ? new URL(req.url) : null;
    const event = {
      type,
      severity,
      detail: detail.slice(0, 300),
      at: now,
      ip: clientIp(req),
      country: req?.headers.get("x-vercel-ip-country") || "",
      path: url?.pathname || "",
      method: req?.method || "",
      ua: (req?.headers.get("user-agent") || "").slice(0, 200),
      uid: opts.uid || "",
      email: opts.email || "",
      // Events skipped by the flood guard since the last write on this instance.
      dropped,
      createdAt: FieldValue.serverTimestamp(),
    };
    dropped = 0;
    await adminDb().collection(SECURITY_EVENTS).add(event);
    if (severity === "high") await alert(`high:${type}`, `${EVENT_LABEL[type]}`, [describe(event)]);
    else if (severity === "warn") await checkBurst();
  } catch (err) {
    // Logging must never break the request it's describing.
    console.error("[security]", err instanceof Error ? err.message : err);
  }
}

type EventLike = { type: string; detail: string; ip: string; country: string; path: string; uid: string; email: string; at: number };

function describe(e: EventLike) {
  const who = [e.email || e.uid, e.ip, e.country].filter(Boolean).join(" · ");
  return `${EVENT_LABEL[e.type as EventType] ?? e.type}: ${e.detail}${e.path ? ` (${e.path})` : ""}${who ? ` — ${who}` : ""}`;
}

let lastBurstCheck = 0;

/** At most once a minute per instance: are there enough warn events in the last 10 minutes to call it an attack? */
async function checkBurst() {
  if (Date.now() - lastBurstCheck < 60_000) return;
  lastBurstCheck = Date.now();
  const snap = await adminDb()
    .collection(SECURITY_EVENTS)
    .where("at", ">=", Date.now() - BURST_WINDOW)
    .orderBy("at", "desc")
    .limit(200)
    .get();
  const warns = snap.docs.map((d) => d.data() as EventLike & { severity: Severity; dropped?: number }).filter((e) => e.severity !== "info");
  const total = warns.reduce((n, e) => n + 1 + (e.dropped || 0), 0);
  if (total < BURST) return;

  const byIp = new Map<string, number>();
  const byType = new Map<string, number>();
  for (const e of warns) {
    byIp.set(e.ip, (byIp.get(e.ip) || 0) + 1);
    byType.set(e.type, (byType.get(e.type) || 0) + 1);
  }
  const top = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  await alert("burst", `Unusual activity: ${total} suspicious requests in 10 minutes`, [
    "Most common:",
    ...top(byType).map(([t, n]) => `• ${EVENT_LABEL[t as EventType] ?? t}: ${n}`),
    "Top IP addresses:",
    ...top(byIp).map(([ip, n]) => `• ${ip}: ${n}`),
    "",
    "Latest:",
    ...warns.slice(0, 5).map((e) => `• ${describe(e)}`),
  ]);
}

// ---------- Alerts ----------

/** Sends one alert per key per 30 minutes (shared across instances through Firestore). */
async function alert(key: string, title: string, lines: string[]) {
  const ref = adminDb().collection("security_state").doc("alerts");
  const go = await adminDb().runTransaction(async (tx) => {
    const last = Number((await tx.get(ref)).data()?.[key] || 0);
    if (Date.now() - last < ALERT_COOLDOWN) return false;
    tx.set(ref, { [key]: Date.now() }, { merge: true });
    return true;
  });
  if (go) await sendAlert(title, lines);
}

export async function sendAlert(title: string, lines: string[]) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://patchplan.net").replace(/\/$/, "");
  const link = `${base}/admin/security`;
  const sent: string[] = [];

  const webhook = process.env.SECURITY_WEBHOOK_URL;
  if (webhook) {
    const content = `🚨 **PatchPlan security: ${title}**\n${lines.join("\n")}\n${link}`.slice(0, 1900);
    const ok = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) })
      .then((r) => r.ok)
      .catch(() => false);
    if (ok) sent.push("webhook");
  }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM_ADDRESS;
  const to = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);
  if (key && from && to.length) {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111">
<h2 style="margin:0 0 12px;font-size:18px">⚠️ ${esc(title)}</h2>
<pre style="white-space:pre-wrap;font-family:inherit;margin:0 0 16px">${esc(lines.join("\n"))}</pre>
<a href="${link}" style="display:inline-block;background:#c8ff00;color:#000;padding:8px 14px;border-radius:8px;text-decoration:none;font-weight:600">Open security log</a>
<p style="color:#666;font-size:12px;margin-top:16px">Sent by PatchPlan's security monitor. You get at most one alert of each kind per 30 minutes.</p></div>`;
    const ok = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from: `PatchPlan Security <${from}>`, to, subject: `[PatchPlan] ${title}`, html, text: `${title}\n\n${lines.join("\n")}\n\n${link}` }),
    })
      .then((r) => r.ok)
      .catch(() => false);
    if (ok) sent.push("email");
  }

  if (!sent.length) console.error("[security] alert not delivered (set ADMIN_EMAILS + Resend, or SECURITY_WEBHOOK_URL):", title);
  return sent;
}

// ---------- Admin access ----------

/** Signed-in, verified email listed in ADMIN_EMAILS. Anyone else is logged as a high-severity event. */
export async function requireAdmin(req: Request) {
  const user = await verifyUser(req);
  if (!process.env.ADMIN_EMAILS) throw new EmailError("Set ADMIN_EMAILS on the server to use this page.", 403);
  if (!isAdmin(user.email, user.email_verified)) {
    await logEvent(req, "admin_denied", "Non-admin account called an admin API", { uid: user.uid, email: user.email });
    throw new EmailError("This page is for PatchPlan admins only.", 403);
  }
  return user;
}

/** Deletes events older than 30 days (called by the daily cron). */
export async function pruneEvents() {
  const old = await adminDb()
    .collection(SECURITY_EVENTS)
    .where("at", "<", Date.now() - 30 * 86400000)
    .limit(400)
    .get();
  if (old.empty) return 0;
  const batch = adminDb().batch();
  old.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return old.size;
}
