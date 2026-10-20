import { EmailError, emailRoute, requireMember } from "@/lib/email/server";
import { addDomain, getStudioDomain, refreshDomain, removeDomain, updateFromLocal } from "@/lib/email/domains";

export const dynamic = "force-dynamic";

/** A studio's own sending domain. Every action checks the caller belongs to the workspace. */

// Current domain; refreshes status from Resend while it isn't verified yet.
export const GET = emailRoute(async (req) => {
  const scopeId = new URL(req.url).searchParams.get("scopeId") || "";
  await requireMember(req, scopeId);
  const domain = await getStudioDomain(scopeId);
  if (domain && domain.status !== "verified") return { domain: await refreshDomain(scopeId).catch(() => domain) };
  return { domain };
});

// Connect a domain: {scopeId, domain, fromLocal}
export const POST = emailRoute(async (req) => {
  const body = await req.json().catch(() => ({}));
  await requireMember(req, String(body.scopeId || ""));
  return { domain: await addDomain(body.scopeId, body.domain, body.fromLocal) };
});

// {scopeId, action: "verify"} re-checks DNS; {scopeId, fromLocal} changes the address name.
export const PATCH = emailRoute(async (req) => {
  const body = await req.json().catch(() => ({}));
  await requireMember(req, String(body.scopeId || ""));
  if (body.action === "verify") return { domain: await refreshDomain(body.scopeId, true) };
  if (typeof body.fromLocal === "string") return { domain: await updateFromLocal(body.scopeId, body.fromLocal) };
  throw new EmailError("Nothing to update.", 400);
});

// Disconnect: {scopeId}
export const DELETE = emailRoute(async (req) => {
  const body = await req.json().catch(() => ({}));
  await requireMember(req, String(body.scopeId || ""));
  await removeDomain(body.scopeId);
  return { domain: null };
});
