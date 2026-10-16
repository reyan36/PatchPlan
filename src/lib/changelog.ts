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

// Format relative time (e.g. "2 hours ago", "yesterday", "3 days ago")
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

// Calculate semantic version based on commit index starting from beta 0.1
export function calculateVersion(indexFromOldest: number, customTag?: string): string {
  if (customTag) return customTag;
  
  // Starting at v0.1.0 in beta
  // 0 -> v0.1.0
  // 1 -> v0.1.1
  // 2 -> v0.1.2
  // etc.
  const patch = indexFromOldest;
  return `v0.1.${patch}`;
}

// Known curated enhancements for historical commits
const CURATED_COMMITS: Record<string, Partial<ChangelogEntry>> = {
  "61f5b50": {
    title: "Redesigned News CMS, System Status Page & Network CRM",
    summary: "Rebuilt the studio article editor and public news hub, added a real-time system status page, and expanded the Network tab with platform badges and CSV import/export.",
    type: "feature",
    badge: "Release",
    highlights: [
      "Rebuilt News management and distraction-free article editor with autosave and slide-over page settings",
      "Added real-time System Status page (/status) with 45-day uptime bars and UptimeRobot integration",
      "Upgraded Studio Network with platform icons, audience tiers, niche tags, and CSV import/export",
      "Redesigned Landing Page with Bento feature showcase and Nebius × NVIDIA AI preview"
    ]
  },
  "e5c9349": {
    title: "Changelog, Typography & Landing Refresh",
    summary: "Introduced the public changelog page, switched typography to Instrument Sans across the app, and refined the landing and network pages.",
    type: "feature",
    badge: "Release",
    highlights: [
      "Added dedicated Changelog page with automatic version tracking",
      "Updated typography to Instrument Sans across landing page and workspace",
      "Cleaned up dashboard footer and removed default sample data on Network page",
      "Refined dark palette and surface contrast across pages"
    ]
  },
  "aa8372c": {
    title: "Icon Refresh & Footer Cleanup",
    summary: "Replaced legacy workspace icons with Phosphor icons, fixed header hydration issues, and added automatic copyright year updates.",
    type: "fix",
    badge: "Fixes",
    highlights: [
      "Fixed nested button hydration warning in navigation header",
      "Updated workspace icons to Phosphor vector icons",
      "Added automatic copyright year across footers",
      "Improved Firestore listener error handling when offline or blocked"
    ]
  },
  "60fe69b": {
    title: "Performance Tuning & Load Time Optimization",
    summary: "Substantial performance improvements targeting Firestore listener latency, Next.js chunk caching, and bundle size reduction.",
    type: "performance",
    badge: "Performance",
    highlights: [
      "Optimized Firestore real-time snapshot listeners to reduce redundant component re-renders",
      "Refactored Next.js dev server cache rules to speed up hot module reloading",
      "Reduced initial page load latency across team sprint boards and roadmaps",
      "Streamlined client bundle size for faster time-to-interactive (TTI)"
    ]
  },
  "31880d1": {
    title: "PatchPlan Studio Genesis — Initial Beta Launch",
    summary: "Initial open beta release of the PatchPlan game development project manager and public roadmapping suite.",
    type: "feature",
    badge: "Initial Release",
    highlights: [
      "Core studio dashboard with team Family workspace creation and join codes",
      "Game-native Kanban sprint boards with Art, Code, Audio, Design, and Bug pipelines",
      "Living Game Design Docs (GDD) with Tiptap rich text and Tldraw whiteboard canvas",
      "Public milestone roadmaps with custom branding and shareable links"
    ]
  }
};

// Automatic semantic text enhancer for any new commit
export function enhanceCommit(
  raw: {
    hash: string;
    fullHash: string;
    subject: string;
    body?: string;
    author: string;
    date: string;
    timestamp: number;
  },
  indexFromOldest: number,
  isLatest: boolean
): ChangelogEntry {
  const shortHash = raw.hash.slice(0, 7);
  const version = calculateVersion(indexFromOldest);
  const relativeTime = formatRelativeTime(raw.timestamp);

  // Check if we have a curated entry for this hash
  if (CURATED_COMMITS[shortHash]) {
    const curated = CURATED_COMMITS[shortHash];
    return {
      version,
      isLatest,
      hash: shortHash,
      fullHash: raw.fullHash,
      date: raw.date,
      relativeTime,
      timestamp: raw.timestamp,
      rawCommit: raw.subject,
      rawBody: raw.body || "",
      author: raw.author,
      title: curated.title || raw.subject,
      summary: curated.summary || raw.subject,
      type: curated.type || "improvement",
      badge: curated.badge || "Update",
      highlights: curated.highlights || [raw.subject]
    };
  }

  // Auto-generate enhanced text for new commits
  const subject = raw.subject.trim();
  const lower = subject.toLowerCase();

  // Detect type
  let type: ChangelogEntry["type"] = "improvement";
  let badge = "Improvement";

  if (lower.startsWith("feat") || lower.includes("add ") || lower.includes("added ") || lower.includes("create ") || lower.includes("new ")) {
    type = "feature";
    badge = "Feature";
  } else if (lower.startsWith("fix") || lower.includes("bug") || lower.includes("error") || lower.includes("patch") || lower.includes("resolve")) {
    type = "fix";
    badge = "Fix";
  } else if (lower.startsWith("perf") || lower.includes("optimize") || lower.includes("speed") || lower.includes("cache") || lower.includes("faster")) {
    type = "performance";
    badge = "Performance";
  } else if (lower.includes("clean") || lower.includes("refactor") || lower.includes("style") || lower.includes("polish")) {
    type = "improvement";
    badge = "Polish";
  }

  // Clean title: remove conventional commit prefixes like "feat:", "fix:", etc.
  let cleanedTitle = subject
    .replace(/^(feat|fix|perf|refactor|style|chore|docs|test)(\([^)]+\))?:\s*/i, "")
    .trim();

  // Capitalize first letter of each major word if all lowercase
  if (cleanedTitle === cleanedTitle.toLowerCase()) {
    cleanedTitle = cleanedTitle
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Generate bullet highlights from subject (split by comma, semicolon, or "and")
  const clauses = subject
    .replace(/^(feat|fix|perf|refactor|style|chore|docs|test)(\([^)]+\))?:\s*/i, "")
    .split(/[,;]|(?:\s+and\s+)/i)
    .map(c => c.trim())
    .filter(c => c.length > 2);

  const highlights = clauses.length > 0 
    ? clauses.map(c => c.charAt(0).toUpperCase() + c.slice(1))
    : [cleanedTitle];

  // If there is a commit body, add lines as highlights
  if (raw.body && raw.body.trim().length > 0) {
    const bodyLines = raw.body
      .split("\n")
      .map(l => l.replace(/^[-*•]\s*/, "").trim())
      .filter(l => l.length > 3);
    
    bodyLines.forEach(bl => {
      if (!highlights.includes(bl)) {
        highlights.push(bl);
      }
    });
  }

  const summary = highlights.length > 1
    ? `${highlights[0]} along with ${highlights.slice(1).join(", ").toLowerCase()}.`
    : `${cleanedTitle} implemented in the studio workspace.`;

  return {
    version,
    isLatest,
    hash: shortHash,
    fullHash: raw.fullHash,
    date: raw.date,
    relativeTime,
    timestamp: raw.timestamp,
    rawCommit: raw.subject,
    rawBody: raw.body || "",
    author: raw.author,
    title: cleanedTitle,
    summary,
    type,
    badge,
    highlights
  };
}
