"use client";

import { useMemo, useState } from "react";
import { Camera, Kanban, MagnifyingGlass } from "@phosphor-icons/react";
import { Panel, Pill } from "@/features/ai/ui";
import { timeAgo } from "@/lib/beta/client";
import { CATEGORIES, REPORT_STATUS, SEVERITIES, SEVERITY_TONE, type Report, type ReportStatus } from "@/lib/beta/types";
import { ReportDrawer } from "./ReportDrawer";

type Filter = "open" | ReportStatus | "all";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "new", label: "New" },
  { key: "in_progress", label: "In progress" },
  { key: "fixed", label: "Fixed" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
];
const SEVERITY_RANK = { blocker: 0, high: 1, medium: 2, low: 3 } as const;

type Props = {
  scopeId: string;
  reports: Report[];
  programOpen: boolean;
  hasTesters: boolean;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onPatch: (id: string, patch: Partial<Report> | null) => void;
  goTo: (tab: "testers" | "settings") => void;
};

export function ReportsPanel({ scopeId, reports, programOpen, hasTesters, openId, setOpenId, onPatch, goTo }: Props) {
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "severity">("newest");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = reports.filter(
      (r) =>
        (filter === "all" || (filter === "open" ? r.status === "new" || r.status === "in_progress" : r.status === filter)) &&
        (!q || r.title.toLowerCase().includes(q) || r.testerName?.toLowerCase().includes(q))
    );
    return sort === "severity" ? [...list].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || (b.createdAt || 0) - (a.createdAt || 0)) : list;
  }, [reports, filter, search, sort]);

  const row = reports.find((r) => r.id === openId) || null;

  if (!reports.length) {
    return (
      <Panel className="p-8 text-center space-y-2">
        <p className="text-white font-medium">No reports yet</p>
        <p className="text-sm text-zinc-500 max-w-md mx-auto">
          {hasTesters
            ? "Your approved testers haven't reported anything yet. Reports show up here with screenshots and steps to reproduce."
            : programOpen
              ? "Approve testers from the Testers tab. Once approved, they can report issues from the beta page."
              : "Set up your beta page first: write a short intro, turn on sign-ups and share the link."}
        </p>
        <button onClick={() => goTo(hasTesters || programOpen ? "testers" : "settings")} className="text-xs text-zinc-400 hover:text-white underline">
          {hasTesters || programOpen ? "Go to Testers" : "Set up the beta page"}
        </button>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {FILTERS.map((f) => {
            const n = f.key === "all" ? reports.length : reports.filter((r) => (f.key === "open" ? r.status === "new" || r.status === "in_progress" : r.status === f.key)).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${filter === f.key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"}`}
              >
                {f.label} <span className="text-zinc-500">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 md:ml-auto">
          <div className="relative flex-1 md:w-56">
            <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reports" className="w-full bg-black/30 border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/25" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "severity")} className="bg-black/30 border border-white/10 rounded-md px-2 py-1.5 text-xs text-zinc-300 focus:outline-none">
            <option value="newest">Newest</option>
            <option value="severity">Severity</option>
          </select>
        </div>
      </div>

      {shown.length ? (
        <Panel className="divide-y divide-white/5 overflow-hidden">
          {shown.map((r) => (
            <button key={r.id} onClick={() => setOpenId(r.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors">
              <span className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_TONE[r.severity]}`} title={SEVERITIES.find((s) => s.key === r.severity)?.label} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{r.title}</p>
                <p className="text-xs text-zinc-500 truncate">
                  {r.testerName} · {CATEGORIES.find((c) => c.key === r.category)?.label}
                  {r.platform ? ` · ${r.platform}` : ""}
                  {r.build ? ` · ${r.build}` : ""} · {timeAgo(r.createdAt)}
                </p>
              </div>
              {r.files?.length > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500 shrink-0">
                  <Camera size={13} /> {r.files.length}
                </span>
              )}
              {r.taskId && <Kanban size={14} className="text-zinc-500 shrink-0" aria-label="Linked to a board task" />}
              <Pill className={`shrink-0 ${REPORT_STATUS[r.status]?.tone}`}>{REPORT_STATUS[r.status]?.label}</Pill>
            </button>
          ))}
        </Panel>
      ) : (
        <p className="text-sm text-zinc-500 py-8 text-center">No reports match.</p>
      )}

      {openId && <ReportDrawer scopeId={scopeId} id={openId} row={row} onClose={() => setOpenId(null)} onPatch={onPatch} />}
    </div>
  );
}
