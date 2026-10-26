import { FieldValue } from "firebase-admin/firestore";
import { buildDigest } from "@/lib/email/digest";
import { aiAllowed } from "@/lib/ai/budget";
import { adminDb, appUrl, loadSettings, ownerEmail, sendToSubscribers, studioName } from "@/lib/email/server";
import { logEvent, pruneEvents } from "@/lib/security/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY = 24 * 60 * 60 * 1000;
const ms = (ts: any): number => (ts?.toMillis ? ts.toMillis() : 0);

/**
 * Vercel Cron (see vercel.json) calls this once a day.
 * Sends each studio's daily digest, and its weekly one on the chosen weekday.
 * Skips studios with nothing new so subscribers never get an empty email.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    await logEvent(req, "cron_unauthorized", "Daily email cron called without the right secret");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Housekeeping: security events older than 30 days.
  await pruneEvents().catch(() => 0);

  const db = adminDb();
  const base = appUrl(req);
  const today = new Date().getUTCDay();
  const [weekly, daily] = await Promise.all([
    db.collection("email_settings").where("weekly.enabled", "==", true).get(),
    db.collection("email_settings").where("daily.enabled", "==", true).get(),
  ]);

  const jobs: { scopeId: string; kind: "weekly" | "daily" }[] = [];
  weekly.docs.forEach((d) => {
    const s = d.data();
    if (s.weekly?.day === today && Date.now() - ms(s.lastWeeklyAt) > 6 * DAY) jobs.push({ scopeId: d.id, kind: "weekly" });
  });
  daily.docs.forEach((d) => {
    if (Date.now() - ms(d.data().lastDailyAt) > 20 * 60 * 60 * 1000) jobs.push({ scopeId: d.id, kind: "daily" });
  });

  const results: { scopeId: string; kind: string; sent?: number; skipped?: string; error?: string }[] = [];
  for (const job of jobs) {
    try {
      const [settings, name] = await Promise.all([loadSettings(job.scopeId), studioName(job.scopeId)]);
      // The AI intro only runs for workspaces owned by an account allowed to use AI.
      const aiIntro = settings.aiIntro && aiAllowed(await ownerEmail(job.scopeId));
      const digest = await buildDigest(job.scopeId, job.kind, base, { studioName: name, aiIntro });
      const stamp = job.kind === "weekly" ? { lastWeeklyAt: FieldValue.serverTimestamp() } : { lastDailyAt: FieldValue.serverTimestamp() };

      if (digest.empty) {
        await db.collection("email_settings").doc(job.scopeId).update(stamp);
        results.push({ ...job, skipped: "nothing new" });
        continue;
      }

      const { sent } = await sendToSubscribers({ scopeId: job.scopeId, ...digest, theme: settings.theme, audience: job.kind, base });
      // Record it in the studio's campaign history. Personal scopes have no family doc.
      const isFamily = (await db.collection("families").doc(job.scopeId).get()).exists;
      await Promise.all([
        db.collection("email_settings").doc(job.scopeId).update(stamp),
        db.collection("campaigns").add({
          subject: digest.subject,
          preheader: digest.preheader,
          blocks: digest.blocks,
          theme: settings.theme,
          audience: job.kind,
          kind: job.kind,
          status: "sent",
          recipients: sent,
          familyId: isFamily ? job.scopeId : null,
          userId: isFamily ? "system" : job.scopeId,
          createdAt: FieldValue.serverTimestamp(),
          sentAt: FieldValue.serverTimestamp(),
        }),
      ]);
      results.push({ ...job, sent });
    } catch (err) {
      results.push({ ...job, error: err instanceof Error ? err.message : "failed" });
    }
  }
  return Response.json({ ran: jobs.length, results });
}
