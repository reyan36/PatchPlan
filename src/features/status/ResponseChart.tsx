"use client";

import { useMemo, useRef, useState } from "react";

type Point = { t: number; ms: number };

const W = 600;
const H = 140;
const ACCENT = "#c8ff00";

const timeLabel = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Single-series area chart: web app response time over 24h, with a crosshair tooltip. */
export function ResponseChart({ data }: { data: Point[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { max, xs, ys, line, area, ticks } = useMemo(() => {
    const peak = Math.max(...data.map((d) => d.ms), 1);
    const step = peak > 1000 ? 500 : peak > 400 ? 200 : 100;
    const max = Math.ceil((peak * 1.15) / step) * step;
    const t0 = data[0]?.t ?? 0;
    const span = Math.max(1, (data[data.length - 1]?.t ?? 1) - t0);
    const xs = data.map((d) => ((d.t - t0) / span) * W);
    const ys = data.map((d) => H - (d.ms / max) * H);
    const line = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join("");
    return { max, xs, ys, line, area: `${line}L${W},${H}L0,${H}Z`, ticks: [max, max / 2, 0] };
  }, [data]);

  if (data.length < 2) return null;

  const onMove = (e: React.PointerEvent) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    xs.forEach((v, i) => Math.abs(v - x) < Math.abs(xs[best] - x) && (best = i));
    setHover(best);
  };

  const h = hover ?? null;
  const pct = (i: number) => ({ left: `${(xs[i] / W) * 100}%`, top: `${(ys[i] / H) * 100}%` });

  return (
    <figure>
      <div className="flex gap-3">
        {/* Y axis (HTML so text never stretches with the SVG) */}
        <div className="relative w-10 shrink-0 text-[10px] tabular-nums text-zinc-500" style={{ height: H }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>
              {t}ms
            </span>
          ))}
        </div>

        <div
          ref={ref}
          className="relative flex-1 touch-none"
          style={{ height: H }}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            {ticks.map((t) => (
              <line key={t} x1="0" x2={W} y1={H - (t / max) * H} y2={H - (t / max) * H} stroke="rgba(255,255,255,0.06)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            <path d={area} fill={ACCENT} fillOpacity="0.1" />
            <path d={line} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* End dot marks "now" */}
          <span className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[#151517]" style={{ ...pct(xs.length - 1), background: ACCENT }} />

          {h !== null && (
            <>
              <span className="absolute top-0 bottom-0 w-px bg-white/25 pointer-events-none" style={{ left: pct(h).left }} />
              <span className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[#151517] pointer-events-none" style={{ ...pct(h), background: ACCENT }} />
              <div
                className="absolute -top-2 z-10 -translate-y-full rounded-lg border border-white/10 bg-[#1c1c20] px-2.5 py-1.5 text-[11px] shadow-xl pointer-events-none whitespace-nowrap"
                style={{ left: `clamp(0px, calc(${pct(h).left} - 48px), calc(100% - 96px))` }}
              >
                <div className="text-zinc-400">{timeLabel(data[h].t)}</div>
                <div className="tabular-nums text-zinc-100">{data[h].ms} ms</div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 ml-[52px] flex justify-between text-[10px] tabular-nums text-zinc-500" aria-hidden>
        <span>24h ago</span>
        <span>12h ago</span>
        <span>Now</span>
      </div>

      {/* Same numbers for screen readers */}
      <table className="sr-only">
        <caption>Web app response time, last 24 hours</caption>
        <thead>
          <tr>
            <th>Time</th>
            <th>Response (ms)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.t}>
              <td>{timeLabel(d.t)}</td>
              <td>{d.ms}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
