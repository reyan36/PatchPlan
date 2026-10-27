import { aiAllowed } from "@/lib/ai/budget";
import { buildDigest } from "@/lib/email/digest";
import { digestSince } from "@/lib/email/schedule";
import { appUrl, emailRoute, loadSettings, requireMember, studioName } from "@/lib/email/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ms = (ts: any): number => (ts?.toMillis ? ts.toMillis() : typeof ts === "number" ? ts : 0);

/**
 * Builds this week's (or today's) update for the designer to start from.
 * With `upcoming`, previews exactly what the next scheduled send will cover (no AI intro, so it's free).
 */
export const POST = emailRoute(async (req) => {
  const { scopeId, kind: rawKind, upcoming } = await req.json().catch(() => ({}));
  const { email } = await requireMember(req, String(scopeId || ""));
  const kind = rawKind === "daily" ? "daily" : "weekly";
  const [settings, name] = await Promise.all([loadSettings(scopeId), studioName(scopeId)]);
  if (upcoming) {
    const last = ms(kind === "weekly" ? settings.lastWeeklyAt : settings.lastDailyAt);
    return buildDigest(scopeId, kind, appUrl(req), { studioName: name, aiIntro: false, since: digestSince(kind, last) });
  }
  return buildDigest(scopeId, kind, appUrl(req), { studioName: name, aiIntro: settings.aiIntro && aiAllowed(email) });
});
