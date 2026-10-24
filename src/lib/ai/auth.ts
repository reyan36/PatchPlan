// Server-only: verifies the caller's Firebase ID token so AI routes can't be used anonymously,
// and caps how many AI calls one account can make (protects the AI bill from abuse).

import { NextResponse } from "next/server";
import { adminDb, checkIdToken, EmailError } from "@/lib/email/server";
import { clientIp, enforceLimit, logEvent } from "@/lib/security/server";
import { AIError } from "./llm";

/** AI calls per account per day (UTC). Override with AI_DAILY_LIMIT. */
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT) || 300;

export async function requireUser(req: Request): Promise<string> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new AIError("Sign in to use PatchPlan AI.", 401);
  const decoded = await checkIdToken(req, token);
  if (!decoded) throw new AIError("Your session expired. Sign in again.", 401);
  return decoded.uid;
}

/** Counts one AI call for today in `ai_usage/{uid}` (server-only collection). */
async function useQuota(req: Request, uid: string) {
  const day = new Date().toISOString().slice(0, 10);
  const ref = adminDb().collection("ai_usage").doc(uid);
  const count = await adminDb().runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data();
    const n = d?.day === day ? Number(d.count) || 0 : 0;
    if (n < DAILY_LIMIT) tx.set(ref, { day, count: n + 1 });
    return n;
  });
  if (count >= DAILY_LIMIT) {
    if (count === DAILY_LIMIT) {
      // Log once per day per account.
      await adminDb().collection("ai_usage").doc(uid).set({ day, count: count + 1 });
      await logEvent(req, "ai_quota", `Reached ${DAILY_LIMIT} AI calls today`, { uid });
    }
    throw new AIError(`You've used today's ${DAILY_LIMIT} AI requests. It resets at midnight UTC.`, 429);
  }
}

/** Wraps a route handler with auth, limits and consistent JSON errors. */
export function aiRoute<T>(handler: (body: T, uid: string) => Promise<unknown>) {
  return async (req: Request) => {
    try {
      enforceLimit(req, `ai-ip:${clientIp(req)}`, 30, 60_000);
      const uid = await requireUser(req);
      enforceLimit(req, `ai:${uid}`, 20, 60_000, uid);
      await useQuota(req, uid);
      const body = (await req.json().catch(() => ({}))) as T;
      return NextResponse.json(await handler(body, uid));
    } catch (err) {
      const status = err instanceof AIError || err instanceof EmailError ? err.status : 500;
      const message = err instanceof Error ? err.message : "AI request failed.";
      if (status >= 500) console.error("[ai]", message);
      return NextResponse.json({ error: message }, { status });
    }
  };
}
