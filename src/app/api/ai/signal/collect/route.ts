import { aiRoute, chargeWebSearch } from "@/lib/ai/auth";
import { fetchDiscordFeedback, fetchSteamReviews, fetchWebFeedback, steamAppId } from "@/lib/ai/sources";
import type { FeedbackItem } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  discordChannelId?: string;
  gameName?: string;
  subreddit?: string;
  /** Steam store link or app ID: reviews come straight from Steam (free). */
  steamApp?: string;
  /** Pasted feedback, one report per line. */
  manual?: string;
};

export const POST = aiRoute<Body>(async (body, uid, email) => {
  const errors: string[] = [];
  const appId = steamAppId(body.steamApp);
  // Web search is the expensive source: a per-account daily limit on top of the shared budget.
  const searchWeb = !!body.gameName?.trim() && !!process.env.TAVILY_API_KEY;
  if (searchWeb) await chargeWebSearch(uid, email);
  const settle = async <T,>(label: string, p: Promise<T>, empty: T) => {
    try {
      return await p;
    } catch (err) {
      errors.push(`${label}: ${err instanceof Error ? err.message : "failed"}`);
      return empty;
    }
  };

  const manual: FeedbackItem[] = (body.manual || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3)
    .slice(0, 50)
    .map((text, i) => {
      // "Name: message" credits the reporter.
      const m = text.match(/^([^:]{2,32}):\s+(.+)$/);
      return { id: `manual-${i}`, source: "manual" as const, author: m ? m[1] : "Player", text: (m ? m[2] : text).slice(0, 800) };
    });

  const [discord, steam, web] = await Promise.all([
    body.discordChannelId ? settle("Discord", fetchDiscordFeedback(body.discordChannelId), []) : Promise.resolve([]),
    appId ? settle("Steam", fetchSteamReviews(appId), []) : Promise.resolve([]),
    searchWeb
      ? settle("Web", fetchWebFeedback(body.gameName!, { subreddit: body.subreddit, skipSteam: !!appId }), { items: [], dropped: 0 })
      : Promise.resolve({ items: [], dropped: 0 }),
  ]);

  return {
    items: [...manual, ...discord, ...steam, ...web.items],
    errors,
    /** Web results dropped because they weren't about this game. */
    dropped: web.dropped,
  };
});
