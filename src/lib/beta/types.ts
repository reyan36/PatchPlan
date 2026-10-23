// Shared by the tester portal (/p/beta), the owner page (/beta) and /api/beta.
// The limits here are also enforced by the Firestore rules in docs/BETA.md, so keep them in sync.

export type TesterStatus = "pending" | "approved" | "denied" | "removed";
export type ReportStatus = "new" | "in_progress" | "fixed" | "closed";
export type ReportCategory = "bug" | "crash" | "performance" | "visual" | "audio" | "gameplay" | "suggestion";
export type ReportSeverity = "low" | "medium" | "high" | "blocker";

export const PLATFORMS = ["PC", "Mac", "Linux", "Steam Deck", "PlayStation", "Xbox", "Switch", "iOS", "Android"] as const;

export const CATEGORIES: { key: ReportCategory; label: string }[] = [
  { key: "bug", label: "Bug" },
  { key: "crash", label: "Crash" },
  { key: "performance", label: "Performance" },
  { key: "visual", label: "Visual" },
  { key: "audio", label: "Audio" },
  { key: "gameplay", label: "Gameplay / balance" },
  { key: "suggestion", label: "Suggestion" },
];

export const SEVERITIES: { key: ReportSeverity; label: string; hint: string }[] = [
  { key: "low", label: "Low", hint: "Minor, easy to ignore" },
  { key: "medium", label: "Medium", hint: "Noticeable, has a workaround" },
  { key: "high", label: "High", hint: "Breaks a feature" },
  { key: "blocker", label: "Blocker", hint: "Can't keep playing" },
];

export const REPORT_STATUS: Record<ReportStatus, { label: string; tone: string }> = {
  new: { label: "New", tone: "bg-sky-500/10 text-sky-300 border-sky-500/20" },
  in_progress: { label: "In progress", tone: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  fixed: { label: "Fixed", tone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  closed: { label: "Closed", tone: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};

export const SEVERITY_TONE: Record<ReportSeverity, string> = {
  low: "bg-zinc-500",
  medium: "bg-amber-400",
  high: "bg-orange-500",
  blocker: "bg-red-500",
};

export const LIMITS = {
  name: 80,
  device: 160,
  note: 600,
  discord: 40,
  title: 140,
  description: 4000,
  steps: 4000,
  expected: 2000,
  logs: 20000,
  url: 500,
  reply: 1000,
  intro: 1200,
  instructions: 2000,
  build: 40,
  /** Screenshots per report. Each is compressed in the browser to fit one Firestore doc. */
  files: 4,
  /** Max length of one stored image data URL (Firestore docs cap at 1 MiB). */
  fileChars: 900_000,
};

export type Tester = {
  id: string; // `${scopeId}_${uid}`
  scopeId: string;
  uid: string;
  name: string;
  email: string;
  platforms: string[];
  device: string;
  note: string;
  discord: string;
  status: TesterStatus;
  createdAt?: number;
  decidedAt?: number;
  reports?: number;
};

export type ReportFile = { id: string; w: number; h: number; bytes: number };

export type Report = {
  id: string;
  scopeId: string;
  testerUid: string;
  testerName: string;
  title: string;
  category: ReportCategory;
  severity: ReportSeverity;
  description: string;
  steps: string;
  expected: string;
  platform: string;
  build: string;
  videoUrl: string;
  logs: string;
  files: ReportFile[];
  status: ReportStatus;
  reply: string;
  taskId: string | null;
  createdAt?: number;
  updatedAt?: number;
};

/** Private details only approved testers can read (download link, keys, what to test). */
export type BetaProgram = { instructions: string; build: string };

export const testerDocId = (scopeId: string, uid: string) => `${scopeId}_${uid}`;
