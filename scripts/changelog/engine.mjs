// Rule-based changelog engine: turns a git commit into a readable release entry.
// No AI. Deterministic, so the same commit always produces the same text.
//
// Commit message conventions it understands (all optional):
//   feat(board): add swimlanes, fix drag lag      ← conventional prefix, "!" marks breaking
//   Added X, Updated Y and Fixed Z                 ← each verb clause becomes a highlight
//   Body bullets ("- Something")                   ← extra highlights
//   Trailers in the body:
//     Title: Custom headline
//     Summary: Custom one-sentence summary
//     Type: feature | improvement | fix | performance
//     Version: v0.2.0
//     Changelog: skip                              ← leave this commit out

/** Verbs we recognise at the start of a clause, grouped by what they mean for players. */
const VERBS = [
  { kind: "added", type: "feature", past: "Added", re: /^(add(?:ed|s)?|create[ds]?|introduce[ds]?|launch(?:ed|es)?|new|implement(?:ed|s)?|ship(?:ped|s)?|enable[ds]?)\b/i },
  { kind: "fixed", type: "fix", past: "Fixed", re: /^(fix(?:ed|es)?|resolve[ds]?|patch(?:ed|es)?|correct(?:ed|s)?|repair(?:ed|s)?|prevent(?:ed|s)?|handle[ds]?)\b/i },
  { kind: "optimized", type: "performance", past: "Optimized", re: /^(optimi[sz](?:e|ed|es)|speed(?:\s+up|ed\s+up)?|sped\s+up|perf|reduce[ds]?|cache[ds]?|lazy[-\s]?load(?:ed|s)?|faster|accelerate[ds]?)\b/i },
  { kind: "removed", type: "improvement", past: "Removed", re: /^(remove[ds]?|delete[ds]?|drop(?:ped|s)?|deprecate[ds]?|retire[ds]?)\b/i },
  { kind: "improved", type: "improvement", past: "Improved", re: /^(update[ds]?|improve[ds]?|enhance[ds]?|refine[ds]?|redesign(?:ed|s)?|rework(?:ed|s)?|revamp(?:ed|s)?|polish(?:ed|es)?|clean(?:ed)?(?:\s+up)?|refactor(?:ed|s)?|restyle[ds]?|upgrade[ds]?|tweak(?:ed|s)?|adjust(?:ed|s)?|change[ds]?|rename[ds]?|move[ds]?|replace[ds]?|simplif(?:y|ied|ies)|streamline[ds]?|migrate[ds]?|convert(?:ed|s)?|tune[ds]?|modernize[ds]?)\b/i },
];

const CONVENTIONAL = /^(feat|fix|perf|refactor|style|chore|docs|test|ci|build|revert)(\([^)]*\))?(!)?:\s*/i;
const CONVENTIONAL_TYPE = { feat: "feature", fix: "fix", perf: "performance", refactor: "improvement", style: "improvement", revert: "fix" };

/** Commits that never belong in a player-facing changelog. */
const NOISE = [
  /^merge\b/i,
  /^revert\s+"/i,
  /^(wip|tmp|temp|test|testing)\b/i,
  /^(chore|docs|test|ci|build)(\([^)]*\))?!?:/i,
  /^(fix(ed)?\s+)?typos?\b/i,
  /^bump\b|^version bump\b|^release v?\d/i,
  /^(update|updated)\s+(readme|deps|dependencies|package(-lock)?(\.json)?|changelog)\b/i,
  /^\.+$/,
];

/** Words that keep their exact casing when we normalise Title Case commits. */
const PROPER = [
  "PatchPlan", "AI", "API", "UI", "UX", "GDD", "GDDs", "CSV", "PDF", "URL", "URLs", "SEO", "FAQ", "CMS", "CRM", "SSR", "HTML", "CSS", "JSON",
  "Firebase", "Firestore", "Discord", "Steam", "Reddit", "Nebius", "NVIDIA", "Nemotron", "Resend", "Vercel", "Google", "GitHub", "Tavily",
  "TypeScript", "JavaScript", "Next.js", "React", "Tiptap", "tldraw", "GSAP", "Phosphor", "UptimeRobot", "Kanban", "DNS", "iOS", "macOS",
];
const PROPER_MAP = new Map(PROPER.map((w) => [w.toLowerCase(), w]));

const TYPE_ORDER = ["added", "improved", "optimized", "fixed", "removed"];
const SUMMARY_VERB = { added: "Adds", improved: "Improves", optimized: "Speeds up", fixed: "Fixes", removed: "Removes" };
export const BADGES = { feature: "Feature", improvement: "Improvement", fix: "Fix", performance: "Performance" };

/** Returns the word with known product/acronym casing, or null if it isn't a known word. */
function properWord(w) {
  const bare = w.replace(/[^\w.-]/g, "");
  const proper = PROPER_MAP.get(bare.toLowerCase());
  return proper ? w.replace(bare, proper) : null;
}

/** True when most words start with a capital, e.g. "Updated Landing Page". */
function isTitleCased(text) {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length > 1 && words.filter((w) => /^[A-Z]/.test(w)).length / words.length > 0.6;
}

/**
 * "Added New Ai Feature" → "Added new AI feature". Lowercases words only when the author wrote in
 * Title Case (`titleCased`), so intentional casing like "Network tab" is kept.
 * `capitalFirst` = false is for phrases placed mid-sentence.
 */
function sentenceCase(text, titleCased, capitalFirst = true) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      const proper = properWord(w);
      if (proper) return proper;
      if (i === 0 && capitalFirst) return w.charAt(0).toUpperCase() + w.slice(1);
      return (titleCased || i === 0) && !/^[A-Z0-9]{2,}$/.test(w) ? w.toLowerCase() : w;
    })
    .join(" ");
}

function titleCase(text) {
  const small = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with", "vs"]);
  return text
    .split(/\s+/)
    .map((w, i) => {
      const proper = properWord(w);
      if (proper) return proper;
      if (i > 0 && small.has(w.toLowerCase())) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function joinList(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Splits a subject into clauses: on commas/semicolons, and on "and"/"&" only when a new verb follows. */
function clauses(subject) {
  const andVerb = /\s+(?:and|&)\s+(?=(?:add(?:ed|s)?|creat(?:e|ed|es)|fix(?:ed|es)?|resolv(?:e|ed|es)|updat(?:e|ed|es)|improv(?:e|ed|es)|remov(?:e|ed|es)|optimi[sz](?:e|ed|es)|refactor(?:ed|s)?|redesign(?:ed|s)?|introduc(?:e|ed|es)|enhanc(?:e|ed|es)|polish(?:ed|es)?)\b)/i;
  return subject
    .split(/\s*[,;]\s*|\s+\+\s+/)
    .flatMap((part) => part.split(andVerb))
    .map((c) => c.replace(/^(?:and|&)\s+/i, "").replace(/[.!]+$/, "").trim())
    .filter((c) => c.length > 2);
}

/** Works out the verb of a clause; clauses without one inherit the previous clause's verb. */
const FROM_CONVENTIONAL = {
  feature: { kind: "added", type: "feature", past: "Added" },
  fix: { kind: "fixed", type: "fix", past: "Fixed" },
  performance: { kind: "optimized", type: "performance", past: "Optimized" },
  improvement: { kind: "improved", type: "improvement", past: "Improved" },
};

function analyse(clause, previous) {
  for (const v of VERBS) {
    const m = clause.match(v.re);
    if (m) {
      const object = clause.slice(m[0].length).replace(/^(?:the|a|an)\s+/i, "").trim();
      return { kind: v.kind, type: v.type, past: v.past, object: object || clause, hadVerb: true };
    }
  }
  const p = previous || { kind: "improved", type: "improvement", past: "Improved" };
  // Inherited from the prefix or the previous clause: write the verb out ("fix: navbar" → "Fixed navbar").
  return { kind: p.kind, type: p.type, past: p.past, object: clause, hadVerb: !!p.fromPrefix || !!p.hadVerb };
}

const SPEED = /\b(load(?:ing)?\s+times?|load\s+speed|performance|latency|lag|bundle\s+size|startup|faster|slow(?:ness)?)\b/i;

/** "Improved loading times" is really performance work. */
function refine(a) {
  return a.kind === "improved" && SPEED.test(a.object) ? { ...a, kind: "optimized", type: "performance", past: a.past } : a;
}

function parseTrailers(body) {
  const trailers = {};
  const rest = [];
  for (const line of String(body || "").split(/\r?\n/)) {
    const m = line.match(/^\s*(Title|Summary|Type|Version|Changelog)\s*:\s*(.+?)\s*$/i);
    if (m) trailers[m[1].toLowerCase()] = m[2];
    else rest.push(line);
  }
  return { trailers, rest };
}

/**
 * @param {{hash:string, fullHash:string, subject:string, body?:string, author:string, date:string, timestamp:number}} raw
 * @returns {null | {title:string, summary:string, type:string, badge:string, highlights:string[], breaking:boolean, versionOverride?:string}}
 *   null when the commit should be left out of the changelog.
 */
export function describeCommit(raw) {
  const subjectRaw = String(raw.subject || "").trim();
  const { trailers, rest } = parseTrailers(raw.body);

  if (/^(skip|no|false|none)$/i.test((trailers.changelog || "").trim())) return null;
  // Noise is skipped unless the author explicitly gave it changelog text.
  if (!trailers.title && NOISE.some((re) => re.test(subjectRaw))) return null;

  if (/^(initial|first)\s+(commit|release|version)\b/i.test(subjectRaw) && !trailers.title) {
    return {
      title: trailers.title || "Initial Release",
      summary: trailers.summary || "The first public version of PatchPlan.",
      type: "feature",
      badge: "Initial Release",
      highlights: ["First public version"],
      breaking: false,
    };
  }

  const conv = subjectRaw.match(CONVENTIONAL);
  const breaking = !!conv?.[3] || /BREAKING CHANGE/i.test(raw.body || "");
  const subject = subjectRaw.replace(CONVENTIONAL, "").trim();

  // Highlights: one per verb clause in the subject, then body bullets.
  const parts = [];
  const convType = conv && CONVENTIONAL_TYPE[conv[1].toLowerCase()];
  let prev = convType ? { ...FROM_CONVENTIONAL[convType], fromPrefix: true } : null;
  for (const c of clauses(subject)) {
    const a = refine(analyse(c, prev));
    parts.push(a);
    prev = { ...a, fromPrefix: false };
  }
  if (!parts.length) parts.push(analyse(subject || "Maintenance update", null));

  const titleCased = isTitleCased(subject);
  const bullets = rest.filter((l) => /^\s*(?:[-*•]|\d+[.)])\s+\S/.test(l));
  // A release with its own Title and bullet list: the bullets are the highlights, not the subject line.
  const highlights = trailers.title && bullets.length ? [] : parts.map((p) => sentenceCase(p.hadVerb ? `${p.past} ${p.object}` : p.object, titleCased));
  rest
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length > 3 && !/^(co-authored-by|signed-off-by|reviewed-by):/i.test(l))
    .forEach((l) => {
      const h = sentenceCase(l.replace(/[.]+$/, ""), isTitleCased(l));
      if (!highlights.some((x) => x.toLowerCase() === h.toLowerCase())) highlights.push(h);
    });

  // Type: explicit trailer > conventional prefix > what the clauses say.
  const kinds = new Set(parts.map((p) => p.kind));
  let type =
    (trailers.type && BADGES[trailers.type.toLowerCase()] && trailers.type.toLowerCase()) ||
    (conv && CONVENTIONAL_TYPE[conv[1].toLowerCase()]) ||
    (kinds.has("added") ? "feature" : [...kinds].every((k) => k === "fixed") ? "fix" : [...kinds].every((k) => k === "optimized") ? "performance" : "improvement");

  // Title: one clause keeps its wording; several become "A, B & C".
  let title = trailers.title;
  if (!title) {
    if (parts.length === 1) {
      title = titleCase(highlights[0]);
    } else {
      const objects = parts.map((p) => titleCase(p.object));
      const shown = objects.slice(0, 3);
      title = shown.length === 2 ? `${shown[0]} & ${shown[1]}` : `${shown.slice(0, -1).join(", ")} & ${shown[shown.length - 1]}`;
      if (objects.length > 3) title += " & More";
    }
  }

  // Summary: one sentence per kind of change, e.g. "Adds a status page. Improves the network tab."
  let summary = trailers.summary;
  if (!summary) {
    const groups = TYPE_ORDER.map((k) => ({ k, objects: parts.filter((p) => p.kind === k).map((p) => sentenceCase(p.object, titleCased, false)) })).filter((g) => g.objects.length);
    summary = groups.map((g) => `${SUMMARY_VERB[g.k]} ${joinList(g.objects)}.`).join(" ");
    if (breaking) summary += " Includes a breaking change.";
  }

  return {
    title,
    summary,
    type,
    badge: breaking ? "Breaking" : BADGES[type],
    highlights: highlights.slice(0, 15),
    breaking,
    ...(trailers.version ? { versionOverride: trailers.version.startsWith("v") ? trailers.version : `v${trailers.version}` } : {}),
  };
}

/** Next version after `previous` (patch bump), unless the commit asks for a specific one. */
export function nextVersion(previous, override) {
  if (override) return override;
  const m = String(previous || "").match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!m) return "v0.1.0";
  return `v${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}
