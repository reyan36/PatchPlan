// Server-only: collect player feedback from Discord (bot token) and the web (Tavily).

import type { FeedbackItem, FeedbackSource } from "./types";
import { reserveBudget } from "./budget";

const MAX_TEXT = 800;

const clip = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);

/** Reads recent messages from a Discord channel with the PatchPlan bot. */
export async function fetchDiscordFeedback(channelId: string, limit = 50): Promise<FeedbackItem[]> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !channelId) return [];
  if (!/^\d{5,25}$/.test(channelId)) throw new Error("Discord channel ID must be numeric.");

  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=${Math.min(limit, 100)}`, {
    headers: { Authorization: `Bot ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Discord ${res.status}: the bot needs View Channel + Read Message History there.`);

  const msgs: any[] = await res.json();
  return msgs
    .filter((m) => !m.author?.bot && typeof m.content === "string" && m.content.trim().length > 8)
    .map((m) => ({
      id: `discord-${m.id}`,
      source: "discord" as const,
      author: m.author?.global_name || m.author?.username || "player",
      text: clip(m.content),
      url: m.guild_id ? `https://discord.com/channels/${m.guild_id}/${channelId}/${m.id}` : undefined,
    }));
}

type TavilyResult = { title: string; url: string; content: string };

async function tavily(query: string, includeDomains: string[], maxResults: number): Promise<TavilyResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query,
      // "basic" costs 1 Tavily credit per search, "advanced" 2. Snippets are enough for feedback triage.
      search_depth: process.env.TAVILY_SEARCH_DEPTH === "advanced" ? "advanced" : "basic",
      max_results: maxResults,
      include_domains: includeDomains.length ? includeDomains : undefined,
      time_range: "month",
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}`);
  const data = await res.json();
  return data?.results ?? [];
}

function sourceFor(url: string): FeedbackSource {
  if (/steamcommunity\.com|store\.steampowered\.com/.test(url)) return "steam";
  if (/reddit\.com/.test(url)) return "reddit";
  return "web";
}

function authorFor(url: string, source: FeedbackSource) {
  const reddit = url.match(/reddit\.com\/user\/([^/?#]+)/);
  if (reddit) return reddit[1];
  const steam = url.match(/steamcommunity\.com\/id\/([^/?#]+)/);
  if (steam) return steam[1];
  return source === "steam" ? "Steam player" : source === "reddit" ? "Reddit player" : "Web";
}

/** Short, stable id for a URL, so collecting again never re-imports the same post. */
function urlId(url: string) {
  let h = 5381;
  for (let i = 0; i < url.length; i++) h = ((h << 5) + h + url.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Searches Steam, Reddit and the wider web for recent player feedback about a game (3 searches). */
export async function fetchWebFeedback(gameName: string, subreddit?: string): Promise<FeedbackItem[]> {
  if (!gameName.trim() || !process.env.TAVILY_API_KEY) return [];
  await reserveBudget("search", 3);
  const game = `"${gameName.trim()}"`;
  const reddit = subreddit ? `reddit.com/r/${subreddit.replace(/^r\//, "")}` : "reddit.com";

  const batches = await Promise.allSettled([
    tavily(`${game} review bug OR crash OR balance OR "please add"`, ["steamcommunity.com", "store.steampowered.com"], 8),
    tavily(`${game} feedback bug balance suggestion`, [reddit], 8),
    tavily(`${game} player feedback bugs patch`, [], 5),
  ]);

  if (batches.every((b) => b.status === "rejected")) throw (batches[0] as PromiseRejectedResult).reason;

  const seen = new Set<string>();
  const items: FeedbackItem[] = [];
  batches.forEach((b) => {
    if (b.status !== "fulfilled") return;
    b.value.forEach((r) => {
      if (!r.content || seen.has(r.url)) return;
      seen.add(r.url);
      const source = sourceFor(r.url);
      items.push({ id: `web-${urlId(r.url)}`, source, author: authorFor(r.url, source), text: clip(`${r.title}: ${r.content}`), url: r.url });
    });
  });
  return items;
}
