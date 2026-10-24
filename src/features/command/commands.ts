// Pages reachable from the command palette and with "G then <key>" shortcuts.
// Kept free of icons and React so the always-loaded shortcut listener stays tiny.

export type PageCommand = { id: string; label: string; href: string; key?: string; keywords?: string };

export const PAGES: PageCommand[] = [
  { id: "home", label: "Dashboard", href: "/", key: "h", keywords: "home overview" },
  { id: "board", label: "Board", href: "/board", key: "b", keywords: "tasks kanban sprint" },
  { id: "inbox", label: "Inbox", href: "/inbox", key: "i", keywords: "assigned my tasks notifications" },
  { id: "ideas", label: "Ideas & docs", href: "/ideas", key: "d", keywords: "gdd design documents whiteboard" },
  { id: "roadmap", label: "Roadmap", href: "/roadmap", key: "r", keywords: "plan public" },
  { id: "news", label: "News", href: "/news", key: "n", keywords: "devlog articles patch notes blog" },
  { id: "beta", label: "Beta testers", href: "/beta", key: "p", keywords: "playtest bug reports testers" },
  { id: "ai", label: "PatchPlan AI", href: "/ai", key: "a", keywords: "nebius player signal build" },
  { id: "email", label: "Email", href: "/email", key: "e", keywords: "newsletter subscribers campaigns" },
  { id: "network", label: "Network", href: "/marketing", key: "c", keywords: "contacts press creators outreach crm" },
  { id: "teams", label: "Teams & workspaces", href: "/teams", key: "t", keywords: "studio members invite join" },
  { id: "settings", label: "Settings", href: "/settings", key: "s", keywords: "account profile preferences export" },
  { id: "status", label: "System status", href: "/status", keywords: "uptime outage maintenance" },
  { id: "changelog", label: "Changelog", href: "/changelog", keywords: "updates releases what's new" },
  { id: "privacy", label: "Privacy Policy", href: "/privacy", keywords: "data gdpr cookies legal" },
  { id: "terms", label: "Terms of Service", href: "/terms", keywords: "legal rules agreement" },
];

export const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** True when the key press is going into a text field, so single-key shortcuts must stay out of the way. */
export function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/** Tells the page already open to act (open a task, start a new one) instead of navigating. */
export const PAGE_EVENTS = { openTask: "pp:open-task", newTask: "pp:new-task", newIdea: "pp:new-idea", openPalette: "pp:open-palette" } as const;
