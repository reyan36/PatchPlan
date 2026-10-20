// Shared email shapes. Safe to import from client and server.

export type EmailList = "weekly" | "daily" | "announcements";

export const EMAIL_LISTS: { key: EmailList; label: string; hint: string }[] = [
  { key: "weekly", label: "Weekly update", hint: "A roundup of the week's news and shipped work" },
  { key: "daily", label: "Daily digest", hint: "Short daily note when something ships" },
  { key: "announcements", label: "Announcements", hint: "Launches, events and big patches" },
];

export type Subscriber = {
  id: string;
  scopeId: string;
  email: string;
  name?: string;
  status: "active" | "unsubscribed";
  lists: EmailList[];
  source: string;
  createdAt?: any;
};

export type EmailBlock =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; url: string; alt: string; href?: string }
  | { id: string; type: "button"; label: string; url: string }
  | { id: string; type: "divider" }
  | { id: string; type: "spacer"; size: number }
  | { id: string; type: "articles"; items: { title: string; excerpt: string; url: string; image?: string }[] }
  | { id: string; type: "changelog"; title: string; items: string[] }
  | { id: string; type: "social"; website?: string; discord?: string; x?: string; steam?: string };

export type EmailBlockType = EmailBlock["type"];

export type EmailTheme = {
  accent: string;
  mode: "light" | "dark";
  font: "sans" | "serif";
  logoUrl?: string;
};

export type Audience = "all" | EmailList;

export type Campaign = {
  id: string;
  subject: string;
  preheader: string;
  blocks: EmailBlock[];
  theme: EmailTheme;
  audience: Audience;
  kind: "campaign" | "weekly" | "daily";
  status: "draft" | "sending" | "sent" | "failed";
  recipients?: number;
  error?: string;
  sentAt?: any;
  createdAt?: any;
  updatedAt?: any;
  userId: string;
  familyId: string | null;
};

export type EmailSettings = {
  fromName: string;
  replyTo: string;
  /** Postal address in the footer (required by CAN-SPAM for marketing email). */
  address: string;
  theme: EmailTheme;
  weekly: { enabled: boolean; day: number };
  daily: { enabled: boolean };
  /** Let the AI write a short intro for automatic digests. */
  aiIntro: boolean;
};

export const DEFAULT_THEME: EmailTheme = { accent: "#c8ff00", mode: "dark", font: "sans" };

export const DEFAULT_SETTINGS: EmailSettings = {
  fromName: "",
  replyTo: "",
  address: "",
  theme: DEFAULT_THEME,
  weekly: { enabled: false, day: 5 },
  daily: { enabled: false },
  aiIntro: true,
};

export const newBlockId = () => Math.random().toString(36).slice(2, 10);
