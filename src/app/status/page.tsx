"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, ArrowRight, CheckCircle, Lightning, Pulse, ShieldCheck, Warning, Wrench, XCircle, type Icon } from "@phosphor-icons/react";
import { Logo } from "@/components/ui/Logo";
import { COMPONENTS, type Health, type Incident, type Maintenance, type StatusComponent, type StatusPayload } from "@/lib/status/types";
import { ResponseChart } from "@/features/status/ResponseChart";
import { BAR_COLOR, UptimeBars } from "@/features/status/UptimeBars";

const HEALTH: Record<Health, { label: string; headline: string; icon: Icon; text: string; dot: string; glow: string; ring: string }> = {
  operational: { label: "Operational", headline: "All systems operational", icon: CheckCircle, text: "text-emerald-400", dot: "bg-emerald-400", glow: "from-emerald-500/[0.12]", ring: "border-emerald-500/20" },
  maintenance: { label: "Maintenance", headline: "Scheduled maintenance in progress", icon: Wrench, text: "text-sky-400", dot: "bg-sky-400", glow: "from-sky-500/[0.12]", ring: "border-sky-500/20" },
  degraded: { label: "Degraded", headline: "Some systems are degraded", icon: Warning, text: "text-amber-400", dot: "bg-amber-400", glow: "from-amber-500/[0.12]", ring: "border-amber-500/20" },
  outage: { label: "Outage", headline: "We're having an outage", icon: XCircle, text: "text-red-400", dot: "bg-red-400", glow: "from-red-500/[0.14]", ring: "border-red-500/25" },
};

function ago(ms: number, now: number) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)} min ago`;
}

function duration(sec: number) {
  if (sec < 60) return `${Math.max(1, Math.round(sec))} sec`;
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

const when = (t: number) => new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function StatusPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<"overview" | "maintenance">("overview");

  // /status?tab=maintenance opens the Maintenance tab.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "maintenance") setTab("maintenance");
  }, []);
  const pickTab = (t: "overview" | "maintenance") => {
    setTab(t);
    window.history.replaceState(null, "", t === "maintenance" ? "/status?tab=maintenance" : "/status");
  };

  // The API is edge-cached for a minute, so polling every minute is cheap.
  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error();
      setData(await res.json());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(() => document.visibilityState === "visible" && load(), 60_000);
    const tick = setInterval(() => setNow(Date.now()), 5_000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, StatusComponent[]>();
    data?.components.forEach((c) => map.set(c.group, [...(map.get(c.group) || []), c]));
    return Array.from(map.entries());
  }, [data]);

  const overall = HEALTH[data?.overall || "operational"];
  const affected = data?.components.filter((c) => c.status !== "operational").length || 0;
  const hasHistory = data?.components.some((c) => c.bars);

  return (
    <div className="min-h-screen bg-[#121212] text-[#FAFAFA] selection:bg-white/20 font-sans antialiased flex flex-col">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#121212]/85 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center group-hover:bg-white/[0.12] transition-colors">
              <Logo size={15} />
            </div>
            <span className="font-semibold text-sm tracking-tight">patchplan</span>
            <span className="text-zinc-600">/</span>
            <span className="text-sm text-zinc-400">Status</span>
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/changelog" className="hidden sm:inline text-zinc-400 hover:text-white transition-colors">
              Changelog
            </Link>
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg bg-white text-black font-semibold px-3 py-1.5 hover:bg-zinc-200 transition-colors">
              Open PatchPlan <ArrowRight size={12} weight="bold" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-5 sm:px-6 pt-10 sm:pt-14 pb-24 space-y-10">
        {/* Overall */}
        <section className={`relative overflow-hidden rounded-2xl border ${data ? overall.ring : "border-white/[0.08]"} bg-[#151517]`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${data ? overall.glow : "from-white/[0.03]"} to-transparent pointer-events-none`} />
          <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            {data ? (
              <div className="flex items-center gap-4">
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] shrink-0">
                  {data.overall === "operational" && <span className={`absolute inset-0 rounded-full ${overall.dot} opacity-20 animate-ping [animation-duration:2.5s]`} />}
                  <overall.icon size={26} weight="fill" className={overall.text} />
                </span>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{overall.headline}</h1>
                  <p className="mt-1 text-sm text-zinc-400">
                    {affected ? `${affected} of ${data.components.length} services affected · ` : ""}
                    Updated {ago(data.updatedAt, now)} · checks every minute
                  </p>
                </div>
              </div>
            ) : failed ? (
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Status unavailable</h1>
                <p className="mt-1 text-sm text-zinc-400">We couldn&apos;t load live status. Try again in a moment.</p>
              </div>
            ) : (
              <div className="flex items-center gap-4 animate-pulse">
                <div className="h-12 w-12 rounded-full bg-white/[0.06]" />
                <div className="space-y-2">
                  <div className="h-7 w-64 rounded bg-white/[0.06]" />
                  <div className="h-4 w-48 rounded bg-white/[0.04]" />
                </div>
              </div>
            )}
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="self-start sm:self-center inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.07] disabled:opacity-50 transition-colors"
            >
              <ArrowClockwise size={13} weight="bold" className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </section>

        {data && (
          <div className="flex gap-1 p-1 rounded-lg border border-white/[0.08] bg-[#151517] w-fit">
            {(["overview", "maintenance"] as const).map((t) => {
              const n = t === "maintenance" ? data.maintenance.active.length + data.maintenance.upcoming.length : 0;
              return (
                <button
                  key={t}
                  onClick={() => pickTab(t)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"}`}
                >
                  {t === "overview" ? "Overview" : "Maintenance"}
                  {n > 0 && <span className="min-w-[18px] px-1 rounded-full bg-sky-400 text-black text-[10px] font-bold leading-[16px] text-center">{n}</span>}
                </button>
              );
            })}
          </div>
        )}

        {data && tab === "maintenance" && <MaintenanceTab m={data.maintenance} now={now} />}

        {data && tab === "overview" && (
          <>
            <MaintenanceNotice m={data.maintenance} now={now} onOpen={() => pickTab("maintenance")} />

            {/* Headline numbers */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat icon={ShieldCheck} label="Uptime · 30 days" value={data.uptime30 !== null ? `${data.uptime30.toFixed(2)}%` : "—"} />
              <Stat icon={Lightning} label="Avg response · 24h" value={data.avgResponseMs ? `${data.avgResponseMs} ms` : "—"} />
              <Stat icon={Pulse} label={`Incidents · ${data.days} days`} value={String(data.incidents.length)} />
              <Stat icon={CheckCircle} label="Services" value={`${data.components.length - affected}/${data.components.length}`} hint="operational" />
            </section>

            {/* Response time */}
            {data.responseSeries.length > 1 && (
              <section className="rounded-2xl border border-white/[0.08] bg-[#151517] p-5 sm:p-6">
                <div className="flex items-baseline justify-between gap-3 mb-6">
                  <h2 className="text-sm font-semibold">Web app response time</h2>
                  <span className="text-xs text-zinc-500">Last 24 hours · 30-minute averages</span>
                </div>
                <ResponseChart data={data.responseSeries} />
              </section>
            )}

            {/* Components */}
            <section className="space-y-8">
              {groups.map(([group, items]) => (
                <div key={group}>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{group}</h2>
                  <div className="rounded-2xl border border-white/[0.08] bg-[#151517] divide-y divide-white/[0.06]">
                    {items.map((c) => (
                      <ComponentRow key={c.id} c={c} days={data.days} />
                    ))}
                  </div>
                </div>
              ))}
              {hasHistory && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-zinc-500">
                  {(["operational", "degraded", "outage", "no-data"] as const).map((s) => (
                    <span key={s} className="inline-flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-[3px] ${BAR_COLOR[s]}`} />
                      {s === "operational" ? "No downtime" : s === "degraded" ? "Partial downtime" : s === "outage" ? "Outage" : "No data"}
                    </span>
                  ))}
                  <span className="sm:ml-auto">Uptime checked every 5 minutes</span>
                </div>
              )}
            </section>

            {/* Incidents */}
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Incident history</h2>
              {data.incidents.length ? (
                <ol className="rounded-2xl border border-white/[0.08] bg-[#151517] divide-y divide-white/[0.06]">
                  {data.incidents.map((i) => (
                    <IncidentRow key={i.id} i={i} />
                  ))}
                </ol>
              ) : (
                <div className="rounded-2xl border border-white/[0.08] bg-[#151517] px-6 py-8 flex items-center gap-3 text-sm text-zinc-400">
                  <CheckCircle size={18} weight="fill" className="text-emerald-400 shrink-0" />
                  No incidents in the last {data.days} days.
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-white/[0.08] py-6 px-6 text-xs text-zinc-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-semibold text-[#FAFAFA] tracking-tight">
            Patch<span className="text-zinc-500">plan</span>
          </span>
          <div className="flex items-center gap-4">
            <Link href="/changelog" className="hover:text-white transition-colors">
              Changelog
            </Link>
            <span className="text-zinc-700">·</span>
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span className="text-zinc-700">·</span>
            <span suppressHydrationWarning>&copy; {new Date().getFullYear()} PatchPlan</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ icon: I, label, value, hint }: { icon: Icon; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#151517] p-4">
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        <I size={13} /> {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
        {hint && <span className="ml-1.5 text-xs font-normal text-zinc-500">{hint}</span>}
      </div>
    </div>
  );
}

function ComponentRow({ c, days }: { c: StatusComponent; days: number }) {
  const h = HEALTH[c.status];
  // Days before monitoring began are drawn as faint markers; the label says when it started.
  const firstData = c.bars ? Math.max(0, c.bars.findIndex((b) => b.status !== "no-data")) : 0;
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold">{c.name}</h3>
            {!c.bars && <span className="whitespace-nowrap rounded-full border border-white/[0.08] px-1.5 py-px text-[10px] text-zinc-500">Live check</span>}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{c.description}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-xs">
          {c.uptime !== null ? (
            <span className="hidden sm:inline tabular-nums text-zinc-400">{c.uptime.toFixed(2)}%</span>
          ) : c.responseMs ? (
            <span className="hidden sm:inline tabular-nums text-zinc-500">{c.responseMs} ms</span>
          ) : null}
          <span className={`inline-flex items-center gap-1.5 font-medium ${h.text}`}>
            <h.icon size={15} weight="fill" />
            {h.label}
          </span>
        </div>
      </div>
      {c.bars && (
        <>
          <UptimeBars bars={c.bars} />
          <div className="flex justify-between text-[10px] tabular-nums text-zinc-600">
            {firstData > 0 ? (
              <span>Monitoring since {c.bars[firstData].date.replace(/, \d{4}$/, "")}</span>
            ) : (
              <span>
                <span className="sm:hidden">30</span>
                <span className="hidden sm:inline">{days}</span> days ago
              </span>
            )}
            {c.uptime !== null && <span className="sm:hidden text-zinc-500">{c.uptime.toFixed(2)}% uptime</span>}
            <span>Today</span>
          </div>
        </>
      )}
    </div>
  );
}

function IncidentRow({ i }: { i: Incident }) {
  const ongoing = i.end === null;
  return (
    <li className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
      <div className="flex items-start gap-3 min-w-0">
        <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${ongoing ? "bg-red-400" : "bg-emerald-400"}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {i.component} {ongoing ? "is unavailable" : "was unavailable"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {i.reason} · {ongoing ? "Investigating" : `Resolved after ${duration(i.durationSec)}`}
          </p>
        </div>
      </div>
      <time className="pl-5 sm:pl-0 text-xs tabular-nums text-zinc-500 shrink-0">{when(i.start)}</time>
    </li>
  );
}

const DAY = 86400000;
const range = (m: Maintenance) => {
  const sameDay = new Date(m.start).toDateString() === new Date(m.end).toDateString();
  const day = (t: number) => new Date(t).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const time = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `${day(m.start)}, ${time(m.start)} – ${time(m.end)}` : `${day(m.start)} ${time(m.start)} – ${day(m.end)} ${time(m.end)}`;
};
const affectsLabel = (m: Maintenance) => (m.components.length ? m.components.map((c) => COMPONENTS[c]?.name || c).join(", ") : "All services");
const zoneLabel = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

function until(ms: number, now: number) {
  const m = Math.max(0, Math.round((ms - now) / 60000));
  if (m < 60) return `in ${m} min`;
  if (m < 60 * 24) return `in ${Math.round(m / 60)} h`;
  const d = Math.round(m / 1440);
  return `in ${d} day${d === 1 ? "" : "s"}`;
}

/** Overview banner: maintenance happening now, or starting within a week. */
function MaintenanceNotice({ m, now, onOpen }: { m: StatusPayload["maintenance"]; now: number; onOpen: () => void }) {
  const next = m.active[0] || m.upcoming.find((u) => u.start - now < 7 * DAY);
  if (!next) return null;
  const live = next.phase === "in_progress";
  return (
    <button onClick={onOpen} className="w-full text-left rounded-2xl border border-sky-500/25 bg-sky-500/[0.06] px-5 py-4 flex items-start gap-3 hover:bg-sky-500/[0.09] transition-colors">
      <Wrench size={18} weight="duotone" className="text-sky-300 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">
          {live ? "Maintenance in progress" : "Scheduled maintenance"}: {next.title}
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">
          {range(next)} · {affectsLabel(next)} · {live ? `ends ${until(next.end, now)}` : `starts ${until(next.start, now)}`}
        </p>
      </div>
      <ArrowRight size={14} className="text-zinc-500 shrink-0 mt-1" />
    </button>
  );
}

function MaintenanceTab({ m, now }: { m: StatusPayload["maintenance"]; now: number }) {
  const sections: { title: string; items: Maintenance[]; empty: string }[] = [
    { title: "In progress", items: m.active, empty: "" },
    { title: "Upcoming", items: m.upcoming, empty: "No maintenance scheduled." },
    { title: "Completed · last 30 days", items: m.recent, empty: "No maintenance in the last 30 days." },
  ];
  return (
    <div className="space-y-8">
      <p className="text-xs text-zinc-500">Times are shown in your time zone ({zoneLabel()}). We schedule maintenance for quiet hours and keep it short.</p>
      {sections.map((sec) =>
        !sec.items.length && !sec.empty ? null : (
          <section key={sec.title}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{sec.title}</h2>
            {sec.items.length ? (
              <ol className="rounded-2xl border border-white/[0.08] bg-[#151517] divide-y divide-white/[0.06]">
                {sec.items.map((w) => (
                  <MaintenanceRow key={w.id} w={w} now={now} />
                ))}
              </ol>
            ) : (
              <div className="rounded-2xl border border-white/[0.08] bg-[#151517] px-6 py-6 text-sm text-zinc-400">{sec.empty}</div>
            )}
          </section>
        )
      )}
    </div>
  );
}

function MaintenanceRow({ w, now }: { w: Maintenance; now: number }) {
  const tone =
    w.phase === "in_progress"
      ? { label: "In progress", cls: "bg-sky-500/10 text-sky-300 border-sky-500/25", dot: "bg-sky-400 animate-pulse" }
      : w.phase === "upcoming"
        ? { label: "Scheduled", cls: "bg-violet-500/10 text-violet-300 border-violet-500/25", dot: "bg-violet-400" }
        : { label: "Completed", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25", dot: "bg-emerald-400" };
  const progress = w.phase === "in_progress" ? Math.min(100, Math.max(0, ((now - w.start) / (w.end - w.start)) * 100)) : null;
  return (
    <li className="p-5 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium">{w.title}</p>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${tone.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} /> {tone.label}
        </span>
      </div>
      <p className="text-xs text-zinc-400">
        {range(w)} · {duration((w.end - w.start) / 1000)} · {affectsLabel(w)}
        {w.phase === "upcoming" && <span className="text-zinc-500"> · starts {until(w.start, now)}</span>}
      </p>
      {w.description && <p className="text-sm text-zinc-300 whitespace-pre-line">{w.description}</p>}
      {progress !== null && (
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden" aria-label={`${Math.round(progress)}% complete`}>
          <div className="h-full bg-sky-400/80" style={{ width: `${progress}%` }} />
        </div>
      )}
    </li>
  );
}
