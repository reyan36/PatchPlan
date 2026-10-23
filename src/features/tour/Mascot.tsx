"use client";

import { useEffect, useRef } from "react";

/**
 * The little helper that opens the feature guide: a round lime blob with a pixel antenna.
 * It bobs, blinks, and its eyes follow the pointer. All motion is CSS (see globals.css)
 * except the eye tracking, which only moves two small groups.
 */
export function Mascot({ size = 56, excited = false }: { size?: number; excited?: boolean }) {
  const eyes = useRef<SVGGElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const box = svg.current?.getBoundingClientRect();
        if (!box || !eyes.current) return;
        const dx = e.clientX - (box.left + box.width / 2);
        const dy = e.clientY - (box.top + box.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 240) * 2.2; // up to 2.2 units toward the pointer
        eyes.current.style.transform = `translate(${((dx / d) * k).toFixed(2)}px, ${((dy / d) * k).toFixed(2)}px)`;
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <svg ref={svg} viewBox="0 0 64 64" width={size} height={size} aria-hidden className={`pp-mascot overflow-visible ${excited ? "pp-mascot-excited" : ""}`}>
      {/* ground shadow */}
      <ellipse className="pp-mascot-shadow" cx="32" cy="60" rx="15" ry="2.6" fill="#000" opacity="0.35" />
      <g className="pp-mascot-body">
        {/* antenna with a pixel tip */}
        <path d="M32 13 C32 9 34 7 36 5" stroke="#a8d600" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <rect className="pp-mascot-tip" x="33.5" y="1.5" width="5.5" height="5.5" rx="1.4" fill="#c8ff00" />
        {/* body */}
        <rect x="9" y="12" width="46" height="44" rx="21" fill="#c8ff00" />
        <ellipse cx="22" cy="21" rx="8" ry="4.5" fill="#fff" opacity="0.35" transform="rotate(-20 22 21)" />
        {/* feet */}
        <rect x="18" y="52" width="9" height="6" rx="3" fill="#9fcc00" />
        <rect x="37" y="52" width="9" height="6" rx="3" fill="#9fcc00" />
        {/* cheeks */}
        <ellipse cx="17.5" cy="38" rx="4" ry="2.6" fill="#ff7aa8" opacity="0.55" />
        <ellipse cx="46.5" cy="38" rx="4" ry="2.6" fill="#ff7aa8" opacity="0.55" />
        {/* eyes (follow the pointer) */}
        <g ref={eyes} style={{ transition: "transform 120ms ease-out" }}>
          <g className="pp-mascot-blink">
            <ellipse cx="24" cy="31" rx="4.2" ry="5.2" fill="#0b0b0d" />
            <ellipse cx="40" cy="31" rx="4.2" ry="5.2" fill="#0b0b0d" />
            <circle cx="25.6" cy="29" r="1.5" fill="#fff" />
            <circle cx="41.6" cy="29" r="1.5" fill="#fff" />
          </g>
        </g>
        {/* smile */}
        <path d="M28 40 Q32 44 36 40" stroke="#0b0b0d" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* waving arm */}
        <path className="pp-mascot-arm" d="M53 36 q6 -2 7 -8" stroke="#a8d600" strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
