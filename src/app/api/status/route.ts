// Public status data. History comes from UptimeRobot monitors; components without a monitor
// get a live reachability check. The response is cached at the edge for a minute, so the
// page's one-minute polling (and any number of visitors) costs about one run per minute.

import { NextResponse } from "next/server";
import { PROBES, probe } from "@/lib/status/probes";
import { loadMaintenance } from "@/lib/status/maintenance";
import { adminDb } from "@/lib/email/server";
import { COMPONENTS, HEALTH_RANK, type DayBar, type Health, type Incident, type StatusComponent, type StatusPayload } from "@/lib/status/types";

export const dynamic = "force-dynamic";

const DAYS = 45;
const CACHE = "public, s-maxage=60, stale-while-revalidate=300";

type Slot = { label: string; start: number; end: number };

/** UTC day slots for the last N days, oldest first. */
function daySlots(days: number): Slot[] {
  const now = new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  return Array.from({ length: days }, (_, k) => {
    const i = days - 1 - k;
    const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i) / 1000;
    const end = i === 0 ? Math.max(start + 60, nowSec) : start + 86399;
    const label = new Date(start * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    return { label, start, end };
  });
}

/** UptimeRobot reason codes → wording for players and studios. */
function friendlyReason(log: any) {
  const detail = String(log?.reason?.detail || "").toLowerCase();
  if (detail.includes("timeout")) return "Requests timed out";
  if (detail.includes("refused")) return "Connections were refused";
  if (detail.includes("ssl") || detail.includes("certificate")) return "Secure connection problem";
  if (detail.includes("dns") || detail.includes("resolve")) return "Address lookup failed";
  const code = Number(log?.reason?.code);
  if (code >= 500 && code < 600) return "Server errors";
  if (code === 429) return "Too many requests";
  return "Service unreachable";
}

/** Maps a monitor to a component: `?check=<id>` in its URL, otherwise the main web app. */
function componentFor(m: any, index: number): string {
  try {
    const id = new URL(m.url).searchParams.get("check");
    if (id && COMPONENTS[id]) return id;
  } catch {}
  return index === 0 ? "web" : `monitor-${m.id}`;
}

async function uptimeRobot(slots: Slot[]) {
  const key = process.env.UPTIMEROBOT_API_KEY?.trim();
  if (!key) return [];
  const now = Math.floor(Date.now() / 1000);
  const base = {
    api_key: key.split(",")[0].trim(),
    format: "json",
    logs: "1",
    logs_limit: "50",
    response_times: "1",
    response_times_average: "30",
    response_times_start_date: String(now - 86400),
    response_times_end_date: String(now),
    custom_uptime_ratios: "30",
  };
  // Free plans sometimes reject 45 custom ranges; retry without them.
  for (const params of [{ ...base, custom_uptime_ranges: slots.map((s) => `${s.start}_${s.end}`).join("-") }, base]) {
    try {
      const res = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params).toString(),
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.stat === "ok" && Array.isArray(data.monitors)) return data.monitors as any[];
    } catch (err) {
      console.warn("[status] UptimeRobot:", err instanceof Error ? err.message : err);
    }
  }
  return [];
}

function monitorHealth(m: any): Health {
  if (m.status === 9) return "outage";
  if (m.status === 8) return "degraded";
  if (m.status === 0) return "maintenance";
  return "operational";
}

function monitorBars(m: any, slots: Slot[]): DayBar[] {
  const ranges: string[] = typeof m.custom_uptime_ranges === "string" ? m.custom_uptime_ranges.split("-") : [];
  const created = Number(m.create_datetime || 0);
  const downLogs = (Array.isArray(m.logs) ? m.logs : []).filter((l: any) => l.type === 1);

  return slots.map((slot, i) => {
    if (created && slot.end < created) return { date: slot.label, uptime: null, downMinutes: 0, status: "no-data" };
    let downSec = 0;
    for (const l of downLogs) {
      const s = Number(l.datetime || 0);
      const e = s + Number(l.duration || 0);
      const overlap = Math.min(slot.end, e) - Math.max(slot.start, s);
      if (overlap > 0) downSec += overlap;
    }
    let uptime: number;
    const raw = parseFloat(ranges[i]);
    if (!Number.isNaN(raw) && !(raw === 0 && downSec === 0)) uptime = raw;
    else {
      const window = Math.max(60, slot.end - Math.max(slot.start, created));
      uptime = Math.max(0, Math.min(100, ((window - downSec) / window) * 100));
    }
    const status: DayBar["status"] = uptime >= 99.9 && downSec < 60 ? "operational" : uptime > 0 ? "degraded" : "outage";
    return { date: slot.label, uptime: Math.round(uptime * 100) / 100, downMinutes: Math.round(downSec / 60), status };
  });
}

// Per-instance memo so local dev and cold edges don't hammer UptimeRobot (10 req/min on free).
let memo: { at: number; body: StatusPayload } | null = null;

async function build(): Promise<StatusPayload> {
  const slots = daySlots(DAYS);
  const monitors = await uptimeRobot(slots);

  const components = new Map<string, StatusComponent>();
  const incidents: Incident[] = [];
  let responseSeries: StatusPayload["responseSeries"] = [];
  let avgResponseMs: number | null = null;

  monitors.forEach((m, index) => {
    const id = componentFor(m, index);
    const meta = COMPONENTS[id] || { id, name: String(m.friendly_name || "Service"), description: "Monitored service", group: "Core platform" as const };
    const status = monitorHealth(m);
    const response = m.average_response_time ? Math.round(parseFloat(m.average_response_time)) : null;
    components.set(id, {
      ...meta,
      status,
      uptime: m.custom_uptime_ratio ? Math.round(parseFloat(m.custom_uptime_ratio) * 100) / 100 : null,
      responseMs: response,
      bars: monitorBars(m, slots),
    });

    if (id === "web") {
      avgResponseMs = response;
      responseSeries = (Array.isArray(m.response_times) ? m.response_times : [])
        .map((r: any) => ({ t: Number(r.datetime) * 1000, ms: Math.round(Number(r.value)) }))
        .filter((r: { t: number; ms: number }) => r.t && r.ms > 0)
        .sort((a: { t: number }, b: { t: number }) => a.t - b.t);
    }

    const downLogs = (Array.isArray(m.logs) ? m.logs : []).filter((l: any) => l.type === 1 && Number(l.datetime) * 1000 > Date.now() - DAYS * 86400000);
    downLogs.forEach((l: any, i: number) => {
      const start = Number(l.datetime) * 1000;
      const ongoing = i === 0 && status === "outage";
      incidents.push({
        id: `${m.id}-${l.datetime}`,
        component: meta.name,
        start,
        end: ongoing ? null : start + Number(l.duration || 0) * 1000,
        durationSec: Number(l.duration || 0),
        reason: friendlyReason(l),
      });
    });
  });

  // The web app is serving this response, so it's up even without a monitor.
  if (!components.has("web")) components.set("web", { ...COMPONENTS.web, status: "operational", uptime: null, responseMs: null, bars: null });

  // Live checks for anything without a monitor.
  const live = Object.keys(PROBES).filter((id) => !components.has(id) && PROBES[id].enabled());
  const results = await Promise.all(live.map((id) => probe(PROBES[id].url())));
  live.forEach((id, i) => {
    const r = results[i];
    components.set(id, {
      ...COMPONENTS[id],
      // One failed check from one region isn't proof of an outage, so it reads as degraded.
      status: r.ok ? (r.ms > 3000 ? "degraded" : "operational") : "degraded",
      uptime: null,
      responseMs: r.ms,
      bars: null,
    });
  });

  const order = Object.keys(COMPONENTS);
  const list = Array.from(components.values()).sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  const withUptime = list.filter((c) => c.uptime !== null);

  // Scheduled maintenance: services in an active window show "Maintenance" unless they are actually down.
  const maintenance = await loadMaintenance(adminDb()).catch((err) => {
    console.warn("[status] maintenance:", err instanceof Error ? err.message : err);
    return { active: [], upcoming: [], recent: [] };
  });
  for (const m of maintenance.active) {
    const affected = m.components.length ? m.components : list.map((c) => c.id);
    list.forEach((c) => {
      if (affected.includes(c.id) && c.status === "operational") c.status = "maintenance";
    });
  }

  return {
    overall: list.reduce<Health>((worst, c) => (HEALTH_RANK[c.status] > HEALTH_RANK[worst] ? c.status : worst), "operational"),
    updatedAt: Date.now(),
    days: DAYS,
    components: list,
    uptime30: withUptime.length ? Math.round((withUptime.reduce((s, c) => s + (c.uptime || 0), 0) / withUptime.length) * 100) / 100 : null,
    avgResponseMs,
    responseSeries,
    incidents: incidents.sort((a, b) => b.start - a.start).slice(0, 20),
    maintenance: { ...maintenance, recent: maintenance.recent.slice(0, 10) },
  };
}

export async function GET() {
  if (!memo || Date.now() - memo.at > 55_000) memo = { at: Date.now(), body: await build() };
  return NextResponse.json(memo.body, { headers: { "Cache-Control": CACHE } });
}
