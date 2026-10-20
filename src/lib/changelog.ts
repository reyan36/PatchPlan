// Changelog entries are stored in Firestore (`changelog` collection) and written by
// scripts/changelog/sync.mjs, which uses the rule-based engine in scripts/changelog/engine.mjs.

export interface ChangelogEntry {
  version: string;
  isLatest: boolean;
  hash: string;
  fullHash: string;
  date: string;
  relativeTime: string;
  timestamp: number;
  rawCommit: string;
  rawBody?: string;
  author: string;
  title: string;
  summary: string;
  type: "feature" | "improvement" | "fix" | "performance";
  badge: string;
  highlights: string[];
}

// Format relative time (e.g. "2h ago", "3d ago")
export function formatRelativeTime(timestampSec: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestampSec;

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / (86400 * 7))}w ago`;
  return `${Math.floor(diff / (86400 * 30))}mo ago`;
}
