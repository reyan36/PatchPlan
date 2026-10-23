"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wrench, X } from "@phosphor-icons/react";
import type { Maintenance, StatusPayload } from "@/lib/status/types";

const DISMISS_KEY = "pp-maintenance-dismissed";
const SOON = 24 * 60 * 60 * 1000;

/**
 * Heads-up inside the app: maintenance in progress, or starting within 24 hours.
 * Uses the edge-cached status API (one request per page load) and can be dismissed per window.
 */
export function MaintenanceBanner() {
  const [w, setW] = useState<Maintenance | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: StatusPayload | null) => {
        if (!live || !d?.maintenance) return;
        const next = d.maintenance.active[0] || d.maintenance.upcoming.find((u) => u.start - Date.now() < SOON);
        let dismissed: string[] = [];
        try {
          dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]");
        } catch {}
        if (next && !dismissed.includes(`${next.id}:${next.phase}`)) setW(next);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!w) return null;
  const live = w.phase === "in_progress";
  const time = (t: number) => new Date(t).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });

  const dismiss = () => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]");
      // Dismissing "upcoming" still shows it again once it starts.
      localStorage.setItem(DISMISS_KEY, JSON.stringify([...list.slice(-20), `${w.id}:${w.phase}`]));
    } catch {}
    setW(null);
  };

  return (
    <div className="border-b border-sky-500/20 bg-sky-500/[0.08] text-sky-100">
      <div className="container mx-auto px-4 py-2 flex items-center gap-3 text-xs">
        <Wrench size={14} weight="duotone" className="text-sky-300 shrink-0" />
        <p className="flex-1 min-w-0 truncate">
          <span className="font-medium">{live ? "Maintenance in progress" : "Scheduled maintenance"}:</span> {w.title} · {live ? `until ${time(w.end)}` : `${time(w.start)} – ${time(w.end)}`}
        </p>
        <Link href="/status?tab=maintenance" className="shrink-0 underline underline-offset-2 hover:text-white">
          Details
        </Link>
        <button onClick={dismiss} className="shrink-0 p-1 rounded hover:bg-white/10" aria-label="Dismiss">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
