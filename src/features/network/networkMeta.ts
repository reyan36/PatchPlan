import { Buildings, GameController, Newspaper, Palette, SpeakerHigh, TiktokLogo, TwitchLogo, Users, YoutubeLogo, type Icon } from "@phosphor-icons/react";

export type Contact = {
  id: string;
  name: string;
  role: string; // platform or role
  tier?: string;
  niche?: string;
  contact: string; // email, handle or link
  status: string;
  notes: string;
  scopeId?: string;
  createdAt?: any;
  updatedAt?: any;
};

export const PLATFORMS: Record<string, { label: string; icon: Icon; color: string; badge: string }> = {
  YouTube: { label: "YouTube", icon: YoutubeLogo, color: "#ef4444", badge: "bg-red-500/10 text-red-300 border-red-500/20" },
  Twitch: { label: "Twitch", icon: TwitchLogo, color: "#a855f7", badge: "bg-purple-500/10 text-purple-300 border-purple-500/20" },
  TikTok: { label: "TikTok", icon: TiktokLogo, color: "#22d3ee", badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" },
  Press: { label: "Press", icon: Newspaper, color: "#f59e0b", badge: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  "Freelance Artist": { label: "Artist", icon: Palette, color: "#ec4899", badge: "bg-pink-500/10 text-pink-300 border-pink-500/20" },
  Publisher: { label: "Publisher", icon: Buildings, color: "#3b82f6", badge: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  Developer: { label: "Developer", icon: GameController, color: "#10b981", badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  "Sound Designer": { label: "Sound", icon: SpeakerHigh, color: "#6366f1", badge: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" },
  Other: { label: "Other", icon: Users, color: "#71717a", badge: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20" },
};
export const PLATFORM_KEYS = Object.keys(PLATFORMS);
export const platformOf = (role: string) => PLATFORMS[role] || PLATFORMS.Other;

export const TIERS = ["<10K", "10K–50K", "50K–100K", "100K–500K", "500K+", "N/A"];

/** Outreach pipeline, in order. */
export const STAGES: { key: string; label: string; dot: string; tone: string }[] = [
  { key: "New", label: "New", dot: "bg-zinc-400", tone: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20" },
  { key: "Contacted", label: "Contacted", dot: "bg-sky-400", tone: "bg-sky-500/10 text-sky-300 border-sky-500/20" },
  { key: "In Talks", label: "In talks", dot: "bg-amber-400", tone: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  { key: "Hired", label: "Hired", dot: "bg-emerald-400", tone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  { key: "Completed", label: "Completed", dot: "bg-violet-400", tone: "bg-violet-500/10 text-violet-300 border-violet-500/20" },
  { key: "Rejected", label: "Passed", dot: "bg-rose-400", tone: "bg-rose-500/10 text-rose-300 border-rose-500/20" },
];
export const stageOf = (s: string) => STAGES.find((x) => x.key === s) || STAGES[0];

export const NICHES = ["Roguelike", "Co-op", "Speedrunner", "Horror", "RPG", "Strategy", "Action", "Retro / Pixel", "Cozy / Sim", "Card Battler", "Platformer", "Indie Showcase"];

/** Older contacts used different role names. */
export function normalizeRole(role?: string) {
  if (!role) return "YouTube";
  if (role === "YouTuber") return "YouTube";
  if (role === "Twitch Streamer") return "Twitch";
  if (role === "Animator" || role === "Logo Designer") return "Freelance Artist";
  return role;
}

/** mailto: for emails, the URL for links, null otherwise. */
export function contactHref(val: string) {
  const v = (val || "").trim();
  if (!v) return null;
  if (v.includes("@") && !v.startsWith("http") && !v.startsWith("@")) return `mailto:${v}`;
  if (/^https?:\/\//i.test(v)) return v;
  if (/(twitch\.tv|youtube\.com|youtu\.be|twitter\.com|x\.com|tiktok\.com|bsky\.app)/i.test(v)) return `https://${v}`;
  return null;
}

export const initials = (name: string) =>
  (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";
