// Server-only: verifies the caller's Firebase ID token so AI routes can't be used anonymously,
// and caps how many AI calls one account can make (protects the AI bill from abuse).

import { NextResponse } from "next/server";
import { adminDb, checkIdToken, EmailError } from "@/lib/email/server";
import { clientIp, enforceLimit, logEvent } from "@/lib/security/server";
import { AIError } from "./llm";
import { AI_PRIVATE_MESSAGE, aiAllowed } from "./budget";

/** AI requests per account per day (UTC). Override with AI_DAILY_LIMIT. */
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT) || 40;
/** Player Signal web collects (3 Tavily searches each) per account per day. Override with TAVILY_ACCOUNT_DAILY_LIMIT. */
const WEB_DAILY_LIMIT = Number(process.env.TAVILY_ACCOUNT_DAILY_LIMIT) || 5;

/** Judges' accounts (AI_JUDGE_EMAILS, comma-separated) get higher daily limits so they never run out while testing. */
const JUDGE_EMAILS = (process.env.AI_JUDGE_EMAILS || "judges@patchplan.net").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const JUDGE_DAILY_LIMIT = Number(process.env.AI_JUDGE_DAILY_LIMIT) || 150;
const JUDGE_WEB_DAILY_LIMIT = Number(process.env.TAVILY_JUDGE_DAILY_LIMIT) || 10;

/** This account's daily AI requests and web collects. */
function limitsFor(email: string) {
  return JUDGE_EMAILS.includes(email.toLowerCase()) ? { ai: JUDGE_DAILY_LIMIT, web: JUDGE_WEB_DAILY_LIMIT } : { ai: DAILY_LIMIT, web: WEB_DAILY_LIMIT };
}

/** Verifies the caller and checks the account is on the AI allowlist (budget.ts). */
export async function requireUser(req: Request): Promise<{ uid: string; email: string }> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new AIError("Sign in to use PatchPlan AI.", 401);
  const decoded = await checkIdToken(req, token);
  if (!decoded) throw new AIError("Your session expired. Sign in again.", 401);
  if (!aiAllowed(decoded.email)) throw new AIError(AI_PRIVATE_MESSAGE, 403);
  return { uid: decoded.uid, email: decoded.email || "" };
}

/** Counts one AI call for today in `ai_usage/{uid}` (server-only collection). */
async function useQuota(req: Request, uid: string, email: string) {
  const DAILY_LIMIT = limitsFor(email).ai;
  const day = new Date().toISOString().slice(0, 10);
  const ref = adminDb().collection("ai_usage").doc(uid);
  const count = await adminDb().runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data();
    const n = d?.day === day ? Number(d.count) || 0 : 0;
    if (n < DAILY_LIMIT) tx.set(ref, { day, count: n + 1 }, { merge: true });
    return n;
  });
  if (count >= DAILY_LIMIT) {
    if (count === DAILY_LIMIT) {
      // Log once per day per account.
      await adminDb().collection("ai_usage").doc(uid).set({ day, count: count + 1 }, { merge: true });
      await logEvent(req, "ai_quota", `Reached ${DAILY_LIMIT} AI calls today`, { uid });
    }
    throw new AIError(`You've used today's ${DAILY_LIMIT} AI requests. It resets at midnight UTC.`, 429);
  }
}

/** Counts one web collect for this account today; refuses past its daily limit. */
export async function chargeWebSearch(uid: string, email: string) {
  const WEB_DAILY_LIMIT = limitsFor(email).web;
  const day = new Date().toISOString().slice(0, 10);
  const ref = adminDb().collection("ai_usage").doc(uid);
  const ok = await adminDb().runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data();
    const n = d?.webDay === day ? Number(d.web) || 0 : 0;
    if (n >= WEB_DAILY_LIMIT) return false;
    tx.set(ref, { webDay: day, web: n + 1 }, { merge: true });
    return true;
  });
  if (!ok) throw new AIError(`You've used today's ${WEB_DAILY_LIMIT} web searches. Paste feedback manually, or try again tomorrow.`, 429);
}

/** Wraps a route handler with auth, limits and consistent JSON errors. */
export function aiRoute<T>(handler: (body: T, uid: string, email: string) => Promise<unknown>) {
  return async (req: Request) => {
    try {
      enforceLimit(req, `ai-ip:${clientIp(req)}`, 30, 60_000);
      const { uid, email } = await requireUser(req);
      enforceLimit(req, `ai:${uid}`, 20, 60_000, uid);
      await useQuota(req, uid, email);
      const body = (await req.json().catch(() => ({}))) as T;
      return NextResponse.json(await handler(body, uid, email));
    } catch (err) {
      const status = err instanceof AIError || err instanceof EmailError ? err.status : 500;
      const message = err instanceof Error ? err.message : "AI request failed.";
      if (status >= 500) console.error("[ai]", message);
      return NextResponse.json({ error: message }, { status });
    }
  };
}
