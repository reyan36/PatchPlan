"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/** Ambient pixel field behind the hero: soft colour waves ripple out from random cells. */
const COLS = 32;
const ROWS = 12;
const BASE = "rgba(255,255,255,0.025)";
const COLORS = ["#c8ff00", "#a78bfa", "#fbbf24", "#38bdf8", "#fb7185"];

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function HeroGrid() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cells = Array.from(el.children) as HTMLElement[];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      gsap.set(cells, { backgroundColor: BASE });
      if (reduce) return;

      gsap.from(cells, {
        opacity: 0,
        scale: 0.3,
        duration: 0.6,
        ease: "power2.out",
        stagger: { grid: [ROWS, COLS], from: "center", amount: 1.2 },
      });

      let i = 0;
      const wave = () => {
        const color = COLORS[i++ % COLORS.length];
        gsap.to(cells, {
          backgroundColor: rgba(color, 0.32),
          duration: 0.3,
          yoyo: true,
          repeat: 1,
          ease: "sine.inOut",
          stagger: { grid: [ROWS, COLS], from: Math.floor(Math.random() * cells.length), amount: 1.6 },
          onComplete: () => { gsap.delayedCall(1.2, wave); },
        });
      };
      gsap.delayedCall(1.4, wave);
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[640px] flex justify-center overflow-hidden"
      style={{
        maskImage: "radial-gradient(ellipse 60% 55% at 50% 45%, black 10%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 45%, black 10%, transparent 75%)",
      }}
    >
      <div
        ref={ref}
        className="grid gap-[6px] w-[1400px] shrink-0 pt-16"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, k) => (
          <div key={k} className="aspect-square rounded-[5px]" />
        ))}
      </div>
    </div>
  );
}
