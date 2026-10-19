import { aiRoute } from "@/lib/ai/auth";
import { fetchDiscordFeedback, fetchWebFeedback } from "@/lib/ai/sources";
import type { FeedbackItem } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  discordChannelId?: string;
  gameName?: string;
  subreddit?: string;
  /** Pasted feedback, one report per line. */
  manual?: string;
};

export const POST = aiRoute<Body>(async (body) => {
  const errors: string[] = [];
  const settle = async (label: string, p: Promise<FeedbackItem[]>) => {
    try {
      return await p;
    } catch (err) {
      errors.push(`${label}: ${err instanceof Error ? err.message : "failed"}`);
      return [];
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

  const [discord, web] = await Promise.all([
    body.discordChannelId ? settle("Discord", fetchDiscordFeedback(body.discordChannelId)) : Promise.resolve([]),
    body.gameName ? settle("Web", fetchWebFeedback(body.gameName, body.subreddit)) : Promise.resolve([]),
  ]);

  return {
    items: [...manual, ...discord, ...web],
    errors,
    sources: {
      discord: !!process.env.DISCORD_BOT_TOKEN,
      web: !!process.env.TAVILY_API_KEY,
    },
  };
});
