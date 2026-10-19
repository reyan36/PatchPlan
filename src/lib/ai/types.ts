// Shared shapes for the AI layer. Safe to import from client and server.

export type FeedbackSource = "discord" | "steam" | "reddit" | "web" | "manual";

/** One raw piece of player feedback, as collected. */
export type FeedbackItem = {
  id: string;
  source: FeedbackSource;
  author: string;
  text: string;
  url?: string;
};

export type SignalCategory = "bug" | "balance" | "feature" | "praise";

export type TaskTag = "Art" | "Code" | "Audio" | "Design" | "Bug" | "Marketing" | "Other";

/** A group of duplicate reports, triaged and matched against the board. */
export type SignalCluster = {
  category: SignalCategory;
  summary: string;
  severity: "low" | "medium" | "high";
  reports: FeedbackItem[];
  /** Existing board task this matches, if any. */
  matchTaskId: string | null;
  matchReason?: string;
  /** Draft task to create when nothing matches (absent for praise). */
  draft: { title: string; tag: TaskTag; description: string } | null;
};

/** Minimal task context sent to the AI for matching. */
export type TaskBrief = { id: string; title: string; tags: string[]; column: string };

export type ShippedTask = {
  id: string;
  title: string;
  tags: string[];
  description?: string;
  /** Player names that reported the issue this task fixed. */
  reporters: string[];
  category?: SignalCategory;
};

export type PatchNotesDraft = {
  title: string;
  excerpt: string;
  /** HTML ready for the article editor. */
  content: string;
  /** One-line summary for the Discord embed. */
  discordSummary: string;
};

export type SearchDocType = "task" | "doc" | "devlog" | "roadmap" | "contact" | "signal";

export type SearchDoc = {
  type: SearchDocType;
  id: string;
  title: string;
  text: string;
  href: string;
};

export type SearchHit = { type: SearchDocType; id: string; title: string; href: string; reason: string };

export type SearchResult = { answer: string; hits: SearchHit[] };

export type FieldType = "text" | "longtext" | "number" | "select" | "checkbox" | "date" | "progress" | "url";

export type ModuleField = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
};

export type ModuleView = "table" | "board" | "cards";

export type ModuleSchema = {
  name: string;
  description: string;
  icon: string;
  view: ModuleView;
  /** Field key used for board columns; must be a select field. */
  groupBy?: string;
  fields: ModuleField[];
  sampleRows: Record<string, unknown>[];
};
