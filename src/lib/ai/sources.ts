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
      max_results: maxResults, // up to 20; doesn't change the cost
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

/** Steam app ID from a store link ("store.steampowered.com/app/123/...") or a bare number. */
export function steamAppId(input?: string) {
  const s = (input || "").trim();
  return s.match(/\/app\/(\d{1,10})/)?.[1] || (/^\d{1,10}$/.test(s) ? s : null);
}

async function steamPage(appId: string, reviewType: 0 | 2, perPage: number): Promise<any[]> {
  // filter 1 = most recent, purchase_type 1 = all purchases; English by default.
  const input = JSON.stringify({ appid: Number(appId), filter: 1, review_type: reviewType, purchase_type: 1, num_per_page: perPage });
  const res = await fetch(`https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?input_json=${encodeURIComponent(input)}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(res.status === 429 ? "Steam is rate-limiting requests, try again in a few minutes" : `Steam ${res.status}`);
  const data = await res.json().catch(() => null);
  return data?.response?.reviews || [];
}

/**
 * Reviews from Steam's public reviews API (IUserReviewsService): free, and always about the right game.
 * The latest reviews plus the latest negative ones, where most bug reports and balance complaints live.
 */
export async function fetchSteamReviews(appId: string): Promise<FeedbackItem[]> {
  const [recent, negative] = await Promise.all([steamPage(appId, 0, 50), steamPage(appId, 2, 40)]);
  const seen = new Set<string>();
  return [...negative, ...recent]
    .filter((r) => typeof r.review === "string" && r.review.trim().length > 15 && !seen.has(r.recommendationid) && !!seen.add(r.recommendationid))
    .map((r) => ({
      id: `steam-${r.recommendationid}`,
      source: "steam" as const,
      author: "Steam reviewer",
      text: clip(`${r.voted_up ? "Recommended" : "Not recommended"} (${Math.round((r.author?.playtime_forever || 0) / 60)}h played): ${r.review}`),
      url: r.author?.steamid ? `https://steamcommunity.com/profiles/${r.author.steamid}/recommended/${appId}/` : `https://store.steampowered.com/app/${appId}/`,
    }));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True when the game's name appears as a whole word ("Mixtape" matches "Mixtape review", not "Mixtapes" or "MixtapeVinyl"). */
const mentions = (game: string, text: string) => new RegExp(`(^|[^a-z0-9])${escapeRe(game)}([^a-z0-9]|$)`, "i").test(text);

type Search = { query: string; domains: string[]; max: number; keep: (r: TavilyResult) => boolean };

/**
 * Searches Reddit, the web and (without a Steam link) Steam for recent feedback about a game.
 * Results that aren't clearly about this game are dropped, so a common name doesn't pull in other products.
 */
export async function fetchWebFeedback(gameName: string, opts: { subreddit?: string; skipSteam?: boolean } = {}) {
  const name = gameName.trim();
  if (!name || !process.env.TAVILY_API_KEY) return { items: [] as FeedbackItem[], dropped: 0 };
  const game = `"${name}"`;
  const sub = (opts.subreddit || "").trim().replace(/^\/?r\//i, "").replace(/[^A-Za-z0-9_]/g, "");
  const named = (r: TavilyResult) => mentions(name, `${r.title} ${r.url}`);

  const searches: Search[] = [
    sub
      ? { query: `r/${sub} ${name} bug feedback suggestion`, domains: ["reddit.com"], max: 20, keep: (r) => r.url.toLowerCase().includes(`/r/${sub.toLowerCase()}/`) }
      : { query: `${game} game bug feedback suggestion`, domains: ["reddit.com"], max: 20, keep: named },
    {
      query: `${game} video game player feedback bugs patch`,
      domains: [],
      max: 15,
      keep: (r) => named(r) && !/apps\.apple\.com|play\.google\.com|reddit\.com|steam(community|powered)\.com/.test(r.url),
    },
  ];
  if (!opts.skipSteam) {
    searches.push({
      query: `${game} review bug OR crash OR balance OR "please add"`,
      domains: ["steamcommunity.com", "store.steampowered.com"],
      max: 15,
      // Workshop items are mods and music packs for other games, never reviews.
      keep: (r) => named(r) && !/sharedfiles|workshop/i.test(r.url),
    });
  }

  await reserveBudget("search", searches.length);
  const batches = await Promise.allSettled(searches.map((s) => tavily(s.query, s.domains, s.max)));
  if (batches.every((b) => b.status === "rejected")) throw (batches[0] as PromiseRejectedResult).reason;

  const seen = new Set<string>();
  const items: FeedbackItem[] = [];
  let dropped = 0;
  batches.forEach((b, i) => {
    if (b.status !== "fulfilled") return;
    b.value.forEach((r) => {
      if (!r.content || seen.has(r.url)) return;
      seen.add(r.url);
      if (!searches[i].keep(r)) return void dropped++;
      const source = sourceFor(r.url);
      items.push({ id: `web-${urlId(r.url)}`, source, author: authorFor(r.url, source), text: clip(`${r.title}: ${r.content}`), url: r.url });
    });
  });
  return { items, dropped };
}
