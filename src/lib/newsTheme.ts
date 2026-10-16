// Shared configuration for the public News hub + article reader.
// Theme keys are kept backward-compatible with previously saved configs
// ("dark" | "midnight" | "cyberpunk" | "minimal").

import type { CSSProperties } from "react";

export type NewsTheme = "dark" | "midnight" | "cyberpunk" | "minimal";
export type NewsTemplate = "standard" | "gaming" | "editorial";
export type NewsLayout = "grid" | "list" | "featured";

export type ThemeTokens = {
  label: string;
  bg: string;
  surface: string;
  fg: string;
  muted: string;
  border: string;
  isLight: boolean;
  defaultAccent: string;
};

export const NEWS_THEMES: Record<NewsTheme, ThemeTokens> = {
  dark: {
    label: "Dark",
    bg: "#121212",
    surface: "#1a1a1a",
    fg: "#FAFAFA",
    muted: "#a1a1aa",
    border: "rgba(255,255,255,0.08)",
    isLight: false,
    defaultAccent: "#0066FF",
  },
  midnight: {
    label: "Midnight",
    bg: "#0a0f1c",
    surface: "#111827",
    fg: "#e5e7eb",
    muted: "#94a3b8",
    border: "rgba(148,163,184,0.12)",
    isLight: false,
    defaultAccent: "#60a5fa",
  },
  cyberpunk: {
    label: "Neon",
    bg: "#050505",
    surface: "#111111",
    fg: "#FAFAFA",
    muted: "#a3a3a3",
    border: "rgba(250,204,21,0.15)",
    isLight: false,
    defaultAccent: "#facc15",
  },
  minimal: {
    label: "Light",
    bg: "#fafafa",
    surface: "#ffffff",
    fg: "#0a0a0a",
    muted: "#52525b",
    border: "rgba(0,0,0,0.08)",
    isLight: true,
    defaultAccent: "#0066FF",
  },
};

export const NEWS_TEMPLATES: Record<NewsTemplate, { label: string; description: string }> = {
  standard: { label: "Modern", description: "Clean sans-serif, balanced spacing" },
  gaming: { label: "Gaming", description: "Bold uppercase titles, accent-heavy" },
  editorial: { label: "Editorial", description: "Serif headlines, reading-first" },
};

export const NEWS_LAYOUTS: Record<NewsLayout, { label: string; description: string }> = {
  grid: { label: "Grid", description: "Three-column card grid" },
  list: { label: "List", description: "Compact rows with thumbnails" },
  featured: { label: "Featured", description: "Hero story + grid below" },
};

export const ACCENT_PRESETS = ["#0066FF", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#facc15", "#22c55e", "#FAFAFA"];

export const ARTICLE_CATEGORIES = ["Devlog", "Patch Notes", "Announcement", "Event", "Community"] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export function resolveTheme(theme?: string): ThemeTokens {
  return NEWS_THEMES[(theme as NewsTheme) in NEWS_THEMES ? (theme as NewsTheme) : "dark"];
}

/** CSS variables applied on the public page root so every element can use var(--pp-*). */
export function themeVars(theme?: string, accent?: string): CSSProperties {
  const t = resolveTheme(theme);
  return {
    ["--pp-bg" as any]: t.bg,
    ["--pp-surface" as any]: t.surface,
    ["--pp-fg" as any]: t.fg,
    ["--pp-muted" as any]: t.muted,
    ["--pp-border" as any]: t.border,
    ["--pp-accent" as any]: accent || t.defaultAccent,
  };
}

export function normalizeUrl(url?: string): string {
  if (!url) return "";
  return url.startsWith("http") ? url : `https://${url}`;
}

/** Strip HTML and estimate reading time at ~220 wpm. */
export function readingStats(html?: string) {
  const text = (html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
  const words = text ? text.split(/\s+/).length : 0;
  return { words, minutes: Math.max(1, Math.round(words / 220)) };
}

export function formatDate(ms?: number) {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
