// Server-only: Firebase Admin + Resend helpers for the email feature.
// Never import from client components (reads service-account and API keys).

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { renderEmail, renderText } from "./render";
import type { Audience, EmailBlock, EmailSettings, EmailTheme } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { markDomainUnverified, senderAddress } from "./domains";

export class EmailError extends Error {
  /** For send failures: messages delivered before the error. */
  sent = 0;
  constructor(message: string, public status = 500) {
    super(message);
  }
}

let app: App | null = null;

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(json);
  // Env vars often store the key with escaped newlines.
  if (parsed.private_key) parsed.private_key = String(parsed.private_key).replace(/\\n/g, "\n");
  return parsed;
}

export function adminDb(): Firestore {
  if (!app) {
    const sa = serviceAccount();
    if (!sa) throw new EmailError("FIREBASE_SERVICE_ACCOUNT is not set on the server.", 503);
    app = getApps()[0] ?? initializeApp({ credential: cert(sa) });
  }
  return getFirestore(app);
}

export const emailStatus = () => ({
  firebaseAdmin: !!process.env.FIREBASE_SERVICE_ACCOUNT,
  resend: !!process.env.RESEND_API_KEY,
  fromAddress: !!process.env.EMAIL_FROM_ADDRESS,
  appUrl: !!process.env.NEXT_PUBLIC_APP_URL,
  cron: !!process.env.CRON_SECRET,
});

export function appUrl(req?: Request) {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  return req ? new URL(req.url).origin : "http://localhost:3000";
}

/** Verifies the Firebase ID token and that the caller belongs to the scope (their own uid or a studio they're in). */
export async function verifyUser(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new EmailError("Sign in first.", 401);
  adminDb();
  const decoded = await getAuth(app!).verifyIdToken(token).catch(() => null);
  if (!decoded) throw new EmailError("Your session expired. Sign in again.", 401);
  return decoded;
}

export async function requireMember(req: Request, scopeId: string) {
  const decoded = await verifyUser(req);
  if (!scopeId) throw new EmailError("Missing workspace.", 400);
  if (scopeId !== decoded.uid) {
    const fam = await adminDb().collection("families").doc(scopeId).get();
    const members: { uid: string }[] = fam.data()?.members || [];
    if (!fam.exists || (fam.data()?.ownerId !== decoded.uid && !members.some((m) => m.uid === decoded.uid))) {
      throw new EmailError("You're not a member of this workspace.", 403);
    }
  }
  return { uid: decoded.uid, email: decoded.email || "" };
}

/** The workspace owner's account email: the default reply-to, so studios don't have to configure one. */
async function ownerEmail(scopeId: string) {
  const fam = await adminDb().collection("families").doc(scopeId).get();
  const uid = fam.exists ? fam.data()?.ownerId : scopeId;
  if (!uid) return "";
  return (await getAuth(app!).getUser(uid).catch(() => null))?.email || "";
}

export async function loadSettings(scopeId: string): Promise<EmailSettings & { lastWeeklyAt?: number; lastDailyAt?: number }> {
  const snap = await adminDb().collection("email_settings").doc(scopeId).get();
  const d = snap.data() || {};
  const settings = {
    ...DEFAULT_SETTINGS,
    ...d,
    theme: { ...DEFAULT_SETTINGS.theme, ...(d.theme || {}) },
    weekly: { ...DEFAULT_SETTINGS.weekly, ...(d.weekly || {}) },
    daily: { ...DEFAULT_SETTINGS.daily, ...(d.daily || {}) },
  } as EmailSettings;
  if (!settings.replyTo) settings.replyTo = await ownerEmail(scopeId);
  return settings;
}

/**
 * The name players see on emails and the sign-up page. Uses the first one the studio set:
 * Email name → public page names → workspace name → owner's display name.
 */
export async function studioName(scopeId: string) {
  const db = adminDb();
  const [mail, cfg, fam] = await Promise.all([
    db.collection("email_settings").doc(scopeId).get(),
    db.collection("public_configs").doc(scopeId).get(),
    db.collection("families").doc(scopeId).get(),
  ]);
  const c = cfg.data() || {};
  const name = mail.data()?.fromName || c.newsStudioName || c.studioName || c.roadmapStudioName || fam.data()?.name;
  if (name) return String(name);
  const owner = fam.exists ? null : await getAuth(app!).getUser(scopeId).catch(() => null);
  return owner?.displayName || "Our studio";
}

/** Public sign-up page branding, resolved from a workspace id or a custom news/roadmap slug. */
export async function publicProfile(idOrSlug: string) {
  const db = adminDb();
  let scopeId = idOrSlug;
  const direct = await db.collection("public_configs").doc(idOrSlug).get();
  if (!direct.exists) {
    for (const field of ["newsSlug", "roadmapSlug"]) {
      const hit = await db.collection("public_configs").where(field, "==", idOrSlug).limit(1).get();
      if (!hit.empty) {
        scopeId = hit.docs[0].id;
        break;
      }
    }
  }
  const [cfg, name] = await Promise.all([db.collection("public_configs").doc(scopeId).get(), studioName(scopeId)]);
  const c = cfg.data() || {};
  return { scopeId, name, logoUrl: c.newsLogoUrl || c.logoUrl || "", theme: c.newsTheme || c.theme || "dark", accent: c.newsAccent || "" };
}

type Outgoing = { to: string; subject: string; html: string; text: string; unsubscribeUrl: string };

/** Sends through Resend's batch API, 100 per call, pacing for the default 2 req/s limit. */
async function resendBatch(fromName: string, replyTo: string, messages: Outgoing[], fromAddress = process.env.EMAIL_FROM_ADDRESS) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !fromAddress) throw new EmailError("RESEND_API_KEY and EMAIL_FROM_ADDRESS must be set on the server.", 503);
  const from = `${fromName.replace(/[<>"\r\n]/g, "").slice(0, 60) || "PatchPlan"} <${fromAddress}>`;

  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(
        chunk.map((m) => ({
          from,
          to: [m.to],
          subject: m.subject,
          html: m.html,
          text: m.text,
          ...(replyTo ? { reply_to: replyTo } : {}),
          headers: { "List-Unsubscribe": `<${m.unsubscribeUrl.replace("/p/unsubscribe", "/api/email/unsubscribe")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        }))
      ),
    });
    if (!res.ok) {
      const err = new EmailError(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`, 502);
      err.sent = sent; // how many went out before this batch failed
      throw err;
    }
    sent += chunk.length;
    if (i + 100 < messages.length) await new Promise((r) => setTimeout(r, 600));
  }
  return sent;
}

/**
 * Sends from the studio's own verified domain when it has one, otherwise the shared address.
 * If Resend rejects the studio's domain (e.g. DNS records were removed), it falls back to the
 * shared address and marks the domain for re-verification, so the send still goes out.
 */
async function sendAs(scopeId: string, fromName: string, replyTo: string, messages: Outgoing[]) {
  const sender = await senderAddress(scopeId);
  if (!sender.custom) return resendBatch(fromName, replyTo, messages);
  try {
    return await resendBatch(fromName, replyTo, messages, sender.address);
  } catch (err) {
    const domainProblem = err instanceof EmailError && err.status === 502 && /domain/i.test(err.message);
    if (!domainProblem) throw err;
    await markDomainUnverified(scopeId);
    // Resend only what didn't go out, so nobody gets the email twice.
    const already = (err as EmailError).sent;
    return already + (await resendBatch(fromName, replyTo, messages.slice(already)));
  }
}

type SendInput = {
  scopeId: string;
  subject: string;
  preheader: string;
  blocks: EmailBlock[];
  theme: EmailTheme;
  audience: Audience;
  base: string;
};

/** Renders per recipient (unique unsubscribe link) and sends to active subscribers on the audience list. */
export async function sendToSubscribers(input: SendInput) {
  const db = adminDb();
  const [settings, name, subs] = await Promise.all([
    loadSettings(input.scopeId),
    studioName(input.scopeId),
    db.collection("subscribers").where("scopeId", "==", input.scopeId).where("status", "==", "active").get(),
  ]);

  const recipients = subs.docs
    .map((d) => ({ id: d.id, ...(d.data() as { email: string; token: string; lists?: string[] }) }))
    .filter((s) => input.audience === "all" || (s.lists || []).includes(input.audience));
  if (!recipients.length) return { sent: 0 };

  const listLabel = input.audience === "all" ? "" : `You're receiving this because you subscribed to ${name}'s ${input.audience} emails.`;
  const messages: Outgoing[] = recipients.map((r) => {
    const unsubscribeUrl = `${input.base}/p/unsubscribe?s=${encodeURIComponent(r.id)}&t=${encodeURIComponent(r.token)}`;
    const doc = { ...input, studioName: name, address: settings.address, unsubscribeUrl, preferencesNote: listLabel };
    return { to: r.email, subject: input.subject, html: renderEmail(doc), text: renderText(doc), unsubscribeUrl };
  });
  return { sent: await sendAs(input.scopeId, settings.fromName || name, settings.replyTo, messages) };
}

/** Sends one copy to a single address (test sends go only to the signed-in user). */
export async function sendTest(scopeId: string, to: string, base: string, email: Omit<SendInput, "scopeId" | "audience" | "base">) {
  const [settings, name] = await Promise.all([loadSettings(scopeId), studioName(scopeId)]);
  const doc = { ...email, studioName: name, address: settings.address, unsubscribeUrl: `${base}/p/unsubscribe?test=1` };
  await sendAs(scopeId, settings.fromName || name, settings.replyTo, [
    { to, subject: `[Test] ${email.subject}`, html: renderEmail(doc), text: renderText(doc), unsubscribeUrl: `${base}/p/unsubscribe?test=1` },
  ]);
}

/** Wraps a route with JSON errors. */
export function emailRoute(handler: (req: Request) => Promise<unknown>) {
  return async (req: Request) => {
    try {
      return Response.json(await handler(req));
    } catch (err) {
      const status = err instanceof EmailError ? err.status : 500;
      const message = err instanceof Error ? err.message : "Email request failed.";
      if (status >= 500) console.error("[email]", message);
      return Response.json({ error: message }, { status });
    }
  };
}
