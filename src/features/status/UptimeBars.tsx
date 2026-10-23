"use client";

import { useState } from "react";
import type { DayBar } from "@/lib/status/types";

export const BAR_COLOR: Record<DayBar["status"], string> = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  outage: "bg-red-500",
  maintenance: "bg-sky-500",
  "no-data": "bg-white/[0.08]",
};

const LABEL: Record<DayBar["status"], string> = {
  operational: "No downtime",
  degraded: "Partial downtime",
  outage: "Outage",
  maintenance: "Maintenance",
  "no-data": "No data",
};

/** One bar per day. Phones show the last 30 days, wider screens all of them. */
export function UptimeBars({ bars }: { bars: DayBar[] }) {
  const [active, setActive] = useState<{ i: number; x: number } | null>(null);
  // Position from the real bar, so it stays right when early bars are hidden on phones.
  const show = (i: number, el: HTMLElement) => setActive({ i, x: el.offsetLeft + el.offsetWidth / 2 });
  const hideBelowSm = Math.max(0, bars.length - 30);

  return (
    <div className="relative" onMouseLeave={() => setActive(null)}>
      <div className="flex h-8 gap-[2px]">
        {bars.map((b, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${b.date}: ${LABEL[b.status]}${b.uptime !== null ? `, ${b.uptime}% uptime` : ""}`}
            onMouseEnter={(e) => show(i, e.currentTarget)}
            onFocus={(e) => show(i, e.currentTarget)}
            onBlur={() => setActive(null)}
            className={`${i < hideBelowSm ? "hidden sm:block" : ""} flex-1 rounded-[3px] ${BAR_COLOR[b.status]} ${b.status === "no-data" ? "h-1.5 self-center" : ""} transition-[filter,transform] hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 ${active?.i === i ? "brightness-125 scale-y-110" : ""}`}
          />
        ))}
      </div>

      {active !== null && (
        <Tooltip bar={bars[active.i]} x={active.x} />
      )}
    </div>
  );
}

function Tooltip({ bar, x }: { bar: DayBar; x: number }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute bottom-full z-20 mb-2 w-48 -translate-x-1/2 rounded-lg border border-white/10 bg-[#1c1c20] px-3 py-2 text-[11px] shadow-xl"
      style={{ left: `clamp(96px, ${x}px, calc(100% - 96px))` }}
    >
      <div className="text-zinc-400">{bar.date}</div>
      <div className="mt-1 flex items-center gap-1.5 text-zinc-100">
        <span className={`h-2 w-2 rounded-full ${BAR_COLOR[bar.status]}`} />
        {LABEL[bar.status]}
      </div>
      {bar.uptime !== null && (
        <div className="mt-0.5 tabular-nums text-zinc-400">
          {bar.uptime}% uptime{bar.downMinutes > 0 ? ` · down ${bar.downMinutes} min` : ""}
        </div>
      )}
    </div>
  );
}
