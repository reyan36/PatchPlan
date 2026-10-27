// When automatic digests run and what they cover. Safe to import from client and server.

/** vercel.json runs the email cron at "0 15 * * *" (15:00 UTC). Vercel may start it up to an hour late. */
export const CRON_HOUR_UTC = 15;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type DigestKind = "weekly" | "daily";

/** Date key (UTC) of a run, used to skip one specific send. */
export const runKey = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Start time of the next run that hasn't happened yet. */
export function nextRun(kind: DigestKind, weeklyDay: number, lastSentAt: number, now = Date.now()) {
  const today = new Date(now);
  today.setUTCHours(CRON_HOUR_UTC, 0, 0, 0);
  for (let i = 0; i < 9; i++) {
    const t = today.getTime() + i * DAY;
    if (kind === "weekly" && new Date(t).getUTCDay() !== weeklyDay) continue;
    const done = now > t + HOUR || lastSentAt >= t - HOUR;
    if (!done) return t;
  }
  return today.getTime() + 7 * DAY;
}

/**
 * What a digest covers: everything since the previous one, so several updates merge into one email
 * and nothing is sent twice. Capped so a long pause doesn't send a huge email.
 */
export function digestSince(kind: DigestKind, lastSentAt: number, now = Date.now()) {
  const span = (kind === "weekly" ? 7 : 1) * DAY;
  return lastSentAt ? Math.max(lastSentAt, now - 2 * span) : now - span;
}
