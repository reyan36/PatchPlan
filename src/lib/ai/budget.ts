// Server-only: hard spending caps for paid AI providers, shared by every account.
//
// Each Nebius model call and each Tavily search reserves a unit from today's and this month's budget
// (ai_budget/{YYYY-MM-DD} and ai_budget/{YYYY-MM}; no browser access). When either is used up, the
// call is refused before anything is billed. Token usage is recorded for the admin security page.
// Setting AI_DISABLED=true on Vercel (and redeploying) pauses all AI.

import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/email/server";
import { sendAlert } from "@/lib/security/server";
import { AIError } from "./llm";

const num = (v: string | undefined, fallback: number) => (Number(v) > 0 ? Number(v) : fallback);

export const AI_LIMITS = {
  /** Nebius model calls across all accounts. */
  llmDay: num(process.env.AI_GLOBAL_DAILY_LIMIT, 150),
  llmMonth: num(process.env.AI_GLOBAL_MONTHLY_LIMIT, 2000),
  /** Tavily searches across all accounts (one Player Signal collect = 3 searches). */
  searchDay: num(process.env.TAVILY_DAILY_LIMIT, 30),
  searchMonth: num(process.env.TAVILY_MONTHLY_LIMIT, 300),
};

export const aiPaused = () => /^(1|true|yes|on)$/i.test(process.env.AI_DISABLED || "");

type Kind = "llm" | "search";
const periods = () => {
  const iso = new Date().toISOString();
  return { day: iso.slice(0, 10), month: iso.slice(0, 7) };
};

/** Reserves `amount` units of today's and this month's budget, or throws (nothing is billed). */
export async function reserveBudget(kind: Kind, amount = 1) {
  if (aiPaused()) throw new AIError("PatchPlan AI is paused right now. Try again later.", 503);
  const db = adminDb();
  const { day, month } = periods();
  const dayRef = db.collection("ai_budget").doc(day);
  const monthRef = db.collection("ai_budget").doc(month);
  const [dayLimit, monthLimit] = kind === "llm" ? [AI_LIMITS.llmDay, AI_LIMITS.llmMonth] : [AI_LIMITS.searchDay, AI_LIMITS.searchMonth];

  const r = await db.runTransaction(async (tx) => {
    const [d, m] = await tx.getAll(dayRef, monthRef);
    const usedDay = Number(d.get(kind) || 0);
    const usedMonth = Number(m.get(kind) || 0);
    if (usedDay + amount > dayLimit || usedMonth + amount > monthLimit) return { ok: false, usedMonth };
    tx.set(dayRef, { [kind]: usedDay + amount }, { merge: true });
    tx.set(monthRef, { [kind]: usedMonth + amount }, { merge: true });
    return { ok: true, usedMonth: usedMonth + amount };
  });

  if (!r.ok) {
    throw new AIError(
      kind === "llm"
        ? "PatchPlan AI has reached its usage limit for now. Please try again tomorrow."
        : "Web search has reached its limit for now. Paste feedback manually, or try again tomorrow.",
      429,
    );
  }

  // One email when this month's budget passes 80%, and one when it runs out.
  const warnAt = Math.ceil(monthLimit * 0.8);
  const label = kind === "llm" ? "Nebius AI calls" : "Tavily searches";
  if (r.usedMonth - amount < warnAt && r.usedMonth >= warnAt) {
    void sendAlert(`${label}: 80% of this month's budget used`, [`${r.usedMonth} of ${monthLimit} used in ${month}.`, "Raise the limit or pause AI with AI_DISABLED=true on Vercel."]);
  }
  if (r.usedMonth - amount < monthLimit && r.usedMonth >= monthLimit) {
    void sendAlert(`${label}: monthly budget used up`, [`All ${monthLimit} used in ${month}. Requests are refused until next month or until you raise the limit.`]);
  }
}

/** Adds a model call's token counts to today's and this month's totals. */
export function recordTokens(usage: { prompt_tokens?: number; completion_tokens?: number } | undefined) {
  if (!usage) return;
  const inc = { tokensIn: FieldValue.increment(usage.prompt_tokens || 0), tokensOut: FieldValue.increment(usage.completion_tokens || 0) };
  const { day, month } = periods();
  const db = adminDb();
  void Promise.all([db.collection("ai_budget").doc(day).set(inc, { merge: true }), db.collection("ai_budget").doc(month).set(inc, { merge: true })]).catch(() => {});
}

export type BudgetUsage = { llm: number; search: number; tokensIn: number; tokensOut: number };

/** Today's and this month's usage, for the admin page. */
export async function budgetUsage() {
  const { day, month } = periods();
  const [d, m] = await adminDb().getAll(adminDb().collection("ai_budget").doc(day), adminDb().collection("ai_budget").doc(month));
  const read = (s: DocumentSnapshot): BudgetUsage => ({
    llm: Number(s.get("llm") || 0),
    search: Number(s.get("search") || 0),
    tokensIn: Number(s.get("tokensIn") || 0),
    tokensOut: Number(s.get("tokensOut") || 0),
  });
  return { today: read(d), month: read(m), limits: AI_LIMITS, paused: aiPaused() };
}

/**
 * Accounts allowed to use PatchPlan AI (AI_ALLOWED_EMAILS, comma-separated; "*" opens it to everyone).
 * Defaults to the judges' account so a fresh deploy never spends credits on strangers.
 */
export function aiAllowed(email?: string | null) {
  const list = (process.env.AI_ALLOWED_EMAILS || "judges@patchplan.net").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes("*") || (!!email && list.includes(email.toLowerCase()));
}

export const AI_PRIVATE_MESSAGE = "PatchPlan AI is in private preview and isn't enabled for this account yet.";
