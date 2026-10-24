// Shared by the Ideas library, the dashboard widget and the editor.

export type IdeaStatus = "idea" | "exploring" | "planned" | "production" | "shipped" | "parked";

export const IDEA_STATUS: { key: IdeaStatus; label: string; tone: string; dot: string }[] = [
  { key: "idea", label: "Idea", tone: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20", dot: "bg-zinc-400" },
  { key: "exploring", label: "Exploring", tone: "bg-sky-500/10 text-sky-300 border-sky-500/20", dot: "bg-sky-400" },
  { key: "planned", label: "Planned", tone: "bg-violet-500/10 text-violet-300 border-violet-500/20", dot: "bg-violet-400" },
  { key: "production", label: "In production", tone: "bg-amber-500/10 text-amber-300 border-amber-500/20", dot: "bg-amber-400" },
  { key: "shipped", label: "Shipped", tone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20", dot: "bg-emerald-400" },
  { key: "parked", label: "Parked", tone: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20", dot: "bg-zinc-600" },
];

export const statusOf = (s?: string) => IDEA_STATUS.find((x) => x.key === s) || IDEA_STATUS[0];

export type Idea = {
  id: string;
  title: string;
  content?: string;
  status?: IdeaStatus;
  upvotedBy?: string[];
  userId?: string;
  familyId?: string | null;
  taskId?: string | null;
  canvas?: string;
  /** Plain-text start of the doc, kept on the summary for lists and search (see ideaStore.ts). */
  preview?: string;
  hasCanvas?: boolean;
  template?: string;
  createdAt?: any;
  updatedAt?: any;
};

export const toMs = (t: any): number => (typeof t === "number" ? t : t?.toMillis?.() ?? (t?.seconds ? t.seconds * 1000 : 0));

/** Plain-text preview of a doc's HTML. */
export function excerpt(html?: string, max = 160) {
  const text = String(html || "")
    .replace(/<(h[1-6])[^>]*>.*?<\/\1>/gi, " ") // headings are template scaffolding, skip them
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export const TEMPLATES: { key: string; label: string; hint: string; content: string }[] = [
  { key: "blank", label: "Blank", hint: "Start from an empty page", content: "" },
  {
    key: "gdd",
    label: "Game design doc",
    hint: "Pitch, core loop, mechanics, progression",
    content:
      "<h2>Overview</h2><p><strong>Elevator pitch:</strong> </p><p><strong>Genre:</strong> </p><p><strong>Platforms:</strong> </p><p><strong>Target players:</strong> </p>" +
      "<h2>Core loop</h2><p>What does the player do minute to minute?</p>" +
      "<h2>Mechanics</h2><ul><li><p></p></li></ul>" +
      "<h2>Progression</h2><p>How does the player grow over a session and over the whole game?</p>" +
      "<h2>Art &amp; audio direction</h2><p></p>" +
      "<h2>Open questions</h2><ul data-type=\"taskList\"><li data-type=\"taskItem\" data-checked=\"false\"><p></p></li></ul>",
  },
  {
    key: "pitch",
    label: "Feature pitch",
    hint: "Problem, proposal, scope, risks",
    content:
      "<h2>Problem</h2><p>What's missing or frustrating for players today?</p>" +
      "<h2>Proposal</h2><p></p>" +
      "<h2>Player experience</h2><p>Walk through it from the player's point of view.</p>" +
      "<h2>Scope</h2><ul data-type=\"taskList\"><li data-type=\"taskItem\" data-checked=\"false\"><p>Design</p></li><li data-type=\"taskItem\" data-checked=\"false\"><p>Code</p></li><li data-type=\"taskItem\" data-checked=\"false\"><p>Art</p></li><li data-type=\"taskItem\" data-checked=\"false\"><p>Audio</p></li></ul>" +
      "<h2>Risks</h2><ul><li><p></p></li></ul>" +
      "<h2>How we'll know it worked</h2><p></p>",
  },
  {
    key: "level",
    label: "Level design",
    hint: "Goal, flow, encounters, secrets",
    content:
      "<h2>Goal</h2><p>What should the player learn or feel here?</p>" +
      "<h2>Layout &amp; flow</h2><p>Sketch the layout in the Whiteboard tab, then insert a snapshot here.</p>" +
      "<h2>Encounters</h2><ul><li><p></p></li></ul>" +
      "<h2>Secrets &amp; rewards</h2><ul><li><p></p></li></ul>" +
      "<h2>Pacing</h2><p></p>",
  },
  {
    key: "character",
    label: "Character & lore",
    hint: "Backstory, personality, abilities",
    content:
      "<h2>Summary</h2><p></p>" +
      "<h2>Backstory</h2><p></p>" +
      "<h2>Personality</h2><ul><li><p></p></li></ul>" +
      "<h2>Abilities</h2><ul><li><p></p></li></ul>" +
      "<h2>Relationships</h2><p></p>" +
      "<h2>Visual references</h2><p></p>",
  },
];
