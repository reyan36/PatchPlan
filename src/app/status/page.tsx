"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  SquaresFour,
  ArrowLeft,
  ArrowClockwise,
  CheckCircle,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import type { ServiceMonitor, IncidentItem } from "@/app/api/status/route";

type StatusPayload = {
  source: "uptimerobot" | "live-probe";
  overallStatus: "operational" | "degraded" | "outage";
  updatedAt: number;
  monitors: ServiceMonitor[];
  incidents: IncidentItem[];
};

export default function StatusPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<{
    monitorId: string;
    date: string;
    uptime: number;
    status: string;
  } | null>(null);

  const fetchStatus = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.warn("Could not fetch system status:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => fetchStatus(false), 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const currentYear = new Date().getFullYear();
  const overall = data?.overallStatus || "operational";

  return (
    <div className="min-h-screen bg-[#121212] text-[#FAFAFA] selection:bg-white/20 selection:text-white font-sans antialiased flex flex-col">
      {/* Top Navigation (matching Changelog design) */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#121212]/85 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center text-white group-hover:bg-white/[0.12] transition-colors">
              <SquaresFour size={15} weight="fill" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">
              patchplan
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-300 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  overall === "operational"
                    ? "bg-emerald-400"
                    : overall === "degraded"
                    ? "bg-amber-400"
                    : "bg-red-400"
                }`}
              />
              <span>
                {overall === "operational"
                  ? "Operational"
                  : overall === "degraded"
                  ? "Degraded"
                  : "Outage"}
              </span>
            </span>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={13} weight="bold" />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 pt-16 pb-24">
        {/* Page Header */}
        <div className="pb-10 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#FAFAFA]">
              System Status
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Live uptime and response metrics across PatchPlan services.
            </p>
          </div>

          {/* Overall Status Banner Pill */}
          <div className="flex items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium ${
                overall === "operational"
                  ? "bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-300"
                  : overall === "degraded"
                  ? "bg-amber-500/[0.08] border-amber-500/20 text-amber-300"
                  : "bg-red-500/[0.08] border-red-500/20 text-red-300"
              }`}
            >
              {overall === "operational" ? (
                <CheckCircle size={15} weight="fill" className="text-emerald-400" />
              ) : overall === "degraded" ? (
                <Warning size={15} weight="fill" className="text-amber-400" />
              ) : (
                <XCircle size={15} weight="fill" className="text-red-400" />
              )}
              <span>
                {overall === "operational"
                  ? "All systems operational"
                  : overall === "degraded"
                  ? "Partial system degradation"
                  : "Service outage detected"}
              </span>
            </div>

            <button
              onClick={() => fetchStatus(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh status"
            >
              <ArrowClockwise
                size={15}
                weight="bold"
                className={refreshing ? "animate-spin text-white" : ""}
              />
            </button>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="divide-y divide-white/[0.08]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="py-8 space-y-4 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-5 w-48 bg-white/[0.05] rounded" />
                  <div className="h-4 w-24 bg-white/[0.04] rounded" />
                </div>
                <div className="h-7 w-full bg-white/[0.03] rounded-md" />
              </div>
            ))}
          </div>
        )}

        {/* Services List */}
        {!loading && data && (
          <div className="divide-y divide-white/[0.08]">
            {data.monitors.map((monitor) => {
              const activeHover =
                hoveredBar && hoveredBar.monitorId === monitor.id ? hoveredBar : null;

              return (
                <section key={monitor.id} className="py-8 space-y-3.5">
                  {/* Top Row: Name + Metrics */}
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold tracking-tight text-[#FAFAFA]">
                        {monitor.name}
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {monitor.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-mono text-zinc-500">
                        {monitor.responseTimeMs} ms
                      </span>
                      <span className="font-mono text-zinc-400">
                        {monitor.uptimeRatio}%
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 font-medium ${
                          monitor.status === "operational"
                            ? "text-emerald-400"
                            : monitor.status === "degraded"
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            monitor.status === "operational"
                              ? "bg-emerald-400"
                              : monitor.status === "degraded"
                              ? "bg-amber-400"
                              : "bg-red-400"
                          }`}
                        />
                        <span>
                          {monitor.status === "operational"
                            ? "Operational"
                            : monitor.status === "degraded"
                            ? "Degraded"
                            : "Outage"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* 45-Day Uptime Bars */}
                  <div
                    className="grid gap-[3px] h-7 items-center"
                    style={{
                      gridTemplateColumns: `repeat(${monitor.dailyBars.length}, minmax(0, 1fr))`,
                    }}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {monitor.dailyBars.map((bar, idx) => {
                      let barColor = "bg-emerald-500/80 hover:bg-emerald-400";
                      if (bar.status === "degraded") {
                        barColor = "bg-amber-400/85 hover:bg-amber-300";
                      } else if (bar.status === "outage") {
                        barColor = "bg-red-500/85 hover:bg-red-400";
                      } else if (bar.status === "no-data") {
                        barColor = "bg-white/[0.08] hover:bg-white/[0.15]";
                      }

                      return (
                        <div
                          key={idx}
                          onMouseEnter={() =>
                            setHoveredBar({
                              monitorId: monitor.id,
                              date: bar.date,
                              uptime: bar.uptime,
                              status: bar.status,
                            })
                          }
                          className={`h-full rounded-[2px] transition-colors cursor-default ${barColor}`}
                        />
                      );
                    })}
                  </div>

                  {/* Bottom Timeline Legend / Active Hover Readout */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span>45 days ago</span>
                    {activeHover ? (
                      <span className="text-zinc-300">
                        {activeHover.date} ·{" "}
                        {activeHover.status === "no-data"
                          ? "No prior data"
                          : `${activeHover.uptime.toFixed(2)}% uptime`}
                      </span>
                    ) : (
                      <span>
                        {data.source === "uptimerobot"
                          ? "Monitored via UptimeRobot"
                          : "Live health telemetry"}
                      </span>
                    )}
                    <span>Today</span>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Recent Incidents Section */}
        {!loading && data && (
          <section className="mt-12 pt-10 border-t border-white/[0.08]">
            <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">
              Recent Incidents
            </h3>

            {data.incidents.length === 0 ? (
              <div className="py-8 px-6 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
                <span>No downtime incidents reported across services.</span>
                <span className="font-mono text-zinc-500">
                  Last checked{" "}
                  {new Date(data.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-white/[0.02] px-5">
                {data.incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          inc.type === "outage" ? "bg-red-400" : "bg-emerald-400"
                        }`}
                      />
                      <span className="font-medium text-[#FAFAFA]">
                        {inc.service}
                      </span>
                      <span className="text-zinc-400">— {inc.detail}</span>
                    </div>
                    <time className="font-mono text-[11px] text-zinc-500 shrink-0">
                      {new Date(inc.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer (matching Changelog design) */}
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
              Dashboard
            </Link>
            <span className="text-zinc-700">·</span>
            <span suppressHydrationWarning>
              &copy; {currentYear} PatchPlan. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
