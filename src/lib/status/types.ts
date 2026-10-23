// Shared by /api/status (server) and /status (page).

export type Health = "operational" | "degraded" | "outage" | "maintenance";

export type DayBar = {
  date: string;
  /** Percent, or null when there's no data for that day. */
  uptime: number | null;
  downMinutes: number;
  status: Health | "no-data";
};

export type StatusComponent = {
  id: string;
  name: string;
  description: string;
  group: "Core platform" | "Features & integrations";
  status: Health;
  /** 30-day uptime percent from monitoring, when the component has a monitor. */
  uptime: number | null;
  responseMs: number | null;
  /** Daily history; null for components that only have a live check. */
  bars: DayBar[] | null;
};

export type Incident = {
  id: string;
  component: string;
  start: number;
  end: number | null;
  durationSec: number;
  reason: string;
};

export type MaintenancePhase = "upcoming" | "in_progress" | "completed";

export type Maintenance = {
  id: string;
  title: string;
  description: string;
  /** Component ids from COMPONENTS; empty means the whole platform. */
  components: string[];
  start: number;
  end: number;
  phase: MaintenancePhase;
};

export type StatusPayload = {
  maintenance: { active: Maintenance[]; upcoming: Maintenance[]; recent: Maintenance[] };
  overall: Health;
  updatedAt: number;
  days: number;
  components: StatusComponent[];
  uptime30: number | null;
  avgResponseMs: number | null;
  /** Web app response times over the last 24 hours, oldest first. */
  responseSeries: { t: number; ms: number }[];
  incidents: Incident[];
};

/** Public names and descriptions. No hostnames or providers' internal URLs are ever shown. */
export const COMPONENTS: Record<string, Omit<StatusComponent, "status" | "uptime" | "responseMs" | "bars">> = {
  web: { id: "web", name: "Web app & API", description: "Dashboard, boards, docs, roadmaps and public studio pages", group: "Core platform" },
  db: { id: "db", name: "Database", description: "Tasks, docs, news and roadmap data", group: "Core platform" },
  auth: { id: "auth", name: "Sign-in", description: "Google and email sign-in for studios and testers", group: "Core platform" },
  ai: { id: "ai", name: "PatchPlan AI", description: "NVIDIA Nemotron models on Nebius Token Factory", group: "Features & integrations" },
  email: { id: "email", name: "Email delivery", description: "Newsletters, player updates and account emails", group: "Features & integrations" },
  discord: { id: "discord", name: "Discord notifications", description: "Task, patch note and devlog alerts", group: "Features & integrations" },
};

export const HEALTH_RANK: Record<Health, number> = { operational: 0, maintenance: 1, degraded: 2, outage: 3 };
