import { buildDigest } from "@/lib/email/digest";
import { appUrl, emailRoute, loadSettings, requireMember, studioName } from "@/lib/email/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Builds this week's (or today's) update for the designer to start from. */
export const POST = emailRoute(async (req) => {
  const { scopeId, kind } = await req.json().catch(() => ({}));
  await requireMember(req, String(scopeId || ""));
  const [settings, name] = await Promise.all([loadSettings(scopeId), studioName(scopeId)]);
  return buildDigest(scopeId, kind === "daily" ? "daily" : "weekly", appUrl(req), { studioName: name, aiIntro: settings.aiIntro });
});
