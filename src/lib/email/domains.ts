// Server-only: studios' own sending domains, managed in the platform's Resend account.
// Domain state lives in `email_domains/{scopeId}`, written only by the server, so a studio
// can't mark a domain as verified itself.

import { FieldValue } from "firebase-admin/firestore";
import { EmailError, adminDb } from "./server";

export type DnsRecord = { record: string; name: string; type: string; value: string; ttl?: string; priority?: number; status?: string };

export type DomainStatus = "not_started" | "pending" | "verified" | "failed" | "temporary_failure";

export type StudioDomain = {
  id: string;
  name: string;
  status: DomainStatus;
  records: DnsRecord[];
  /** The part before @, e.g. "news" → news@mail.yourgame.com */
  fromLocal: string;
};

const HOST_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const LOCAL_RE = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

export function cleanDomain(input: string) {
  const d = String(input || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^\.+|\.+$/g, "");
  if (!HOST_RE.test(d)) throw new EmailError("Enter a domain like mail.yourgame.com.", 400);
  // Our own sending domain is shared by every studio; nobody can claim it.
  const shared = (process.env.EMAIL_FROM_ADDRESS || "").split("@")[1]?.toLowerCase();
  if (shared && (d === shared || d.endsWith(`.${shared}`))) throw new EmailError("That domain belongs to PatchPlan. Use a domain you own.", 400);
  return d;
}

export function cleanLocal(input: string) {
  const l = String(input || "news").trim().toLowerCase();
  if (!LOCAL_RE.test(l)) throw new EmailError("The address name can use letters, numbers, dots and dashes (e.g. news).", 400);
  return l;
}

/** Turns Resend errors into something a studio can act on. */
function friendly(status: number, body: string) {
  const msg = (() => {
    try {
      return String(JSON.parse(body)?.message || body);
    } catch {
      return body;
    }
  })();
  if (/limit|plan|upgrade|maximum/i.test(msg)) return new EmailError("PatchPlan has reached its custom-domain limit for now. Your emails still send from PatchPlan's address. Please contact support.", 409);
  if (/already|exists|registered/i.test(msg)) return new EmailError("This domain is already connected to another account. Contact support if it's yours.", 409);
  if (status === 401 || status === 403) return new EmailError("Custom domains aren't available on this PatchPlan server yet.", 503);
  return new EmailError(`Couldn't set up the domain: ${msg.slice(0, 200)}`, 502);
}

async function resend(path: string, init: RequestInit = {}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new EmailError("Custom domains aren't available on this PatchPlan server yet.", 503);
  const res = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...(init.headers || {}) },
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.text();
  if (!res.ok) throw friendly(res.status, body);
  return body ? JSON.parse(body) : {};
}

const ref = (scopeId: string) => adminDb().collection("email_domains").doc(scopeId);
const claimRef = (domain: string) => adminDb().collection("email_domain_claims").doc(domain);

export async function getStudioDomain(scopeId: string): Promise<StudioDomain | null> {
  const snap = await ref(scopeId).get();
  return snap.exists ? (snap.data() as StudioDomain) : null;
}

/** Pulls the latest status and DNS record states from Resend and stores them. */
export async function refreshDomain(scopeId: string, verify = false): Promise<StudioDomain | null> {
  const current = await getStudioDomain(scopeId);
  if (!current) return null;
  if (verify) await resend(`/domains/${current.id}/verify`, { method: "POST" });
  const d = await resend(`/domains/${current.id}`);
  const next: StudioDomain = { ...current, status: d.status || current.status, records: d.records || current.records };
  await ref(scopeId).set({ ...next, checkedAt: FieldValue.serverTimestamp(), ...(next.status === "verified" && current.status !== "verified" ? { verifiedAt: FieldValue.serverTimestamp() } : {}) }, { merge: true });
  return next;
}

export async function addDomain(scopeId: string, domainInput: string, localInput: string): Promise<StudioDomain> {
  const name = cleanDomain(domainInput);
  const fromLocal = cleanLocal(localInput);
  if (await getStudioDomain(scopeId)) throw new EmailError("Remove your current domain before adding another.", 409);

  // One studio per domain, so nobody can squat on another studio's domain.
  const db = adminDb();
  const claimed = await db.runTransaction(async (tx) => {
    const c = await tx.get(claimRef(name));
    if (c.exists && c.data()?.scopeId !== scopeId) return false;
    tx.set(claimRef(name), { scopeId, createdAt: FieldValue.serverTimestamp() });
    return true;
  });
  if (!claimed) throw new EmailError("This domain is already connected to another PatchPlan studio.", 409);

  try {
    const d = await resend("/domains", { method: "POST", body: JSON.stringify({ name }) });
    const domain: StudioDomain = { id: d.id, name: d.name || name, status: d.status || "not_started", records: d.records || [], fromLocal };
    await ref(scopeId).set({ ...domain, createdAt: FieldValue.serverTimestamp() });
    return domain;
  } catch (err) {
    await claimRef(name).delete().catch(() => {});
    throw err;
  }
}

export async function updateFromLocal(scopeId: string, localInput: string) {
  const fromLocal = cleanLocal(localInput);
  await ref(scopeId).update({ fromLocal });
  return getStudioDomain(scopeId);
}

export async function removeDomain(scopeId: string) {
  const current = await getStudioDomain(scopeId);
  if (!current) return;
  // Already gone on Resend's side is fine; we still clean up here.
  await resend(`/domains/${current.id}`, { method: "DELETE" }).catch((err) => {
    if (!(err instanceof EmailError) || err.status !== 502) throw err;
  });
  await Promise.all([ref(scopeId).delete(), claimRef(current.name).delete().catch(() => {})]);
}

/** The address to send from: the studio's verified domain, or the shared PatchPlan address. */
export async function senderAddress(scopeId: string): Promise<{ address: string; custom: boolean }> {
  const shared = process.env.EMAIL_FROM_ADDRESS || "";
  const d = await getStudioDomain(scopeId).catch(() => null);
  if (d?.status === "verified") return { address: `${d.fromLocal}@${d.name}`, custom: true };
  return { address: shared, custom: false };
}

/** Called when Resend rejects the studio's domain mid-send (e.g. DNS records removed). */
export async function markDomainUnverified(scopeId: string) {
  await ref(scopeId).update({ status: "pending" }).catch(() => {});
}
