const fs = require('fs');
const path = require('path');
const cp = require('child_process');

// Helper to format relative time
function formatRelativeTime(timestampSec) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestampSec;

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / (86400 * 7))}w ago`;
  return `${Math.floor(diff / (86400 * 30))}mo ago`;
}

// Curated entries for historical commits
const CURATED_COMMITS = {
  "aa8372c": {
    title: "UI Icon Overhaul & Auto-Updating Copyright Engine",
    summary: "Refreshed studio workspace icons to modern vector assets, eliminated DOM hydration warnings, and automated dynamic copyright year calculations across public hubs.",
    type: "fix",
    badge: "Polish & Fix",
    highlights: [
      "Resolved nested button hydration mismatch in navigation header",
      "Replaced legacy icons across studio workspace with clean Phosphor vector iconography",
      "Automated annual copyright year in navigation and footers with zero manual upkeep",
      "Enhanced Firestore snapshot listeners with ad-blocker fallback handling"
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

function enhanceCommit(raw, indexFromOldest, isLatest) {
  const shortHash = raw.hash.slice(0, 7);
  const version = `v0.1.${indexFromOldest}`;
  const relativeTime = formatRelativeTime(raw.timestamp);

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

  const subject = raw.subject.trim();
  const lower = subject.toLowerCase();

  let type = "improvement";
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

  let cleanedTitle = subject
    .replace(/^(feat|fix|perf|refactor|style|chore|docs|test)(\([^)]+\))?:\s*/i, "")
    .trim();

  if (cleanedTitle === cleanedTitle.toLowerCase()) {
    cleanedTitle = cleanedTitle
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  const clauses = subject
    .replace(/^(feat|fix|perf|refactor|style|chore|docs|test)(\([^)]+\))?:\s*/i, "")
    .split(/[,;]|(?:\s+and\s+)/i)
    .map(c => c.trim())
    .filter(c => c.length > 2);

  const highlights = clauses.length > 0 
    ? clauses.map(c => c.charAt(0).toUpperCase() + c.slice(1))
    : [cleanedTitle];

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

function generateChangelog() {
  try {
    // Read raw git log using a distinct commit delimiter
    const cmd = 'git log --pretty=format:%h___%H___%s___%b___%an___%ad___%at===COMMIT_END=== --date=short';
    const output = cp.execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

    const rawBlocks = output.split('===COMMIT_END===').map(b => b.trim()).filter(Boolean);
    const rawCommits = rawBlocks.map(block => {
      const parts = block.split('___');
      return {
        hash: (parts[0] || '').trim(),
        fullHash: (parts[1] || '').trim(),
        subject: (parts[2] || '').trim(),
        body: (parts[3] || '').trim(),
        author: (parts[4] || '').trim(),
        date: (parts[5] || '').trim(),
        timestamp: parseInt((parts[6] || '0').trim(), 10)
      };
    });

    // Oldest first for version numbering
    const reversed = [...rawCommits].reverse();
    const total = reversed.length;

    const entries = reversed.map((raw, idx) => {
      const isLatest = idx === total - 1;
      return enhanceCommit(raw, idx, isLatest);
    });

    // Newest first for display
    const displayList = entries.reverse();

    const dataDir = path.join(__dirname, '..', 'src', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const targetFile = path.join(dataDir, 'changelog.json');
    fs.writeFileSync(targetFile, JSON.stringify(displayList, null, 2), 'utf8');

    const latest = displayList[0];
    console.log(`✓ Changelog generated: ${displayList.length} releases, current version: ${latest?.version || 'v0.1.0'} Beta (${latest?.hash || ''})`);
  } catch (err) {
    console.error('Error generating changelog:', err.message);
  }
}

generateChangelog();
