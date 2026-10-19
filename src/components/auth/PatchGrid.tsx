"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SquaresFour } from "@phosphor-icons/react";

/**
 * Animated pixel grid for the auth panel.
 * Colour waves sweep across the grid, then pixel-art sprites assemble,
 * hold, and dissolve. The headline word changes with each sprite.
 * Hover leaves a light trail; click sends a ripple from that cell.
 */

const COLS = 15;
const ROWS = 19;
const BASE = "rgba(255,255,255,0.035)";
const WHITE = "#f5f5f4";
const GLYPH_ROW = 3;

type Sprite = { word: string; color: string; art: string[] };

const SPRITES: Sprite[] = [
  {
    word: "game",
    color: "#c8ff00",
    art: [
      ".#########.",
      "##w#####w##",
      "#www###w#w#",
      "##w#####w##",
      "####...####",
      "###.....###",
    ],
  },
  {
    word: "update",
    color: "#fb7185",
    art: [
      ".##...##.",
      "#w##.####",
      "#########",
      "#########",
      ".#######.",
      "..#####..",
      "...###...",
      "....#....",
    ],
  },
  {
    word: "sequel",
    color: "#fbbf24",
    art: [
      "....#....",
      "....#....",
      "...###...",
      "#########",
      ".#######.",
      "..#####..",
      "..##.##..",
      ".##...##.",
      "#.......#",
    ],
  },
  {
    word: "demo",
    color: "#a78bfa",
    art: [
      "...###...",
      "...www...",
      "...w.w...",
      "..w...w..",
      ".w#####w.",
      "w#######w",
      "w##w####w",
      ".w#####w.",
      "..wwwww..",
    ],
  },
  {
    word: "DLC",
    color: "#38bdf8",
    art: [
      ".....###.",
      "....###..",
      "...###...",
      "..######.",
      "....###..",
      "...###...",
      "..##.....",
      ".#.......",
    ],
  },
];

function withAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function spriteCells(s: Sprite) {
  const h = s.art.length;
  const w = s.art[0].length;
  const c0 = Math.floor((COLS - w) / 2);
  const r0 = GLYPH_ROW + Math.floor((9 - h) / 2);
  const out: { idx: number; fill: string }[] = [];
  s.art.forEach((line, r) =>
    line.split("").forEach((ch, c) => {
      if (ch === ".") return;
      out.push({ idx: (r0 + r) * COLS + (c0 + c), fill: ch === "w" ? WHITE : s.color });
    })
  );
  return out;
}

export function PatchGrid() {
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const state = useRef({ color: SPRITES[0].color, active: new Set<number>(), lastHover: -1 });

  useEffect(() => {
    const grid = gridRef.current;
    const word = wordRef.current;
    if (!grid || !word) return;
    const cells = Array.from(grid.children) as HTMLElement[];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      gsap.set(cells, { backgroundColor: BASE });

      if (reduce) {
        spriteCells(SPRITES[0]).forEach(({ idx, fill }) => gsap.set(cells[idx], { backgroundColor: fill }));
        return;
      }

      // Intro: grid blooms from the centre.
      gsap.from(cells, {
        scale: 0,
        opacity: 0,
        duration: 0.5,
        ease: "back.out(2)",
        stagger: { grid: [ROWS, COLS], from: "center", amount: 0.7 },
      });

      const swapWord = (s: Sprite) => {
        gsap
          .timeline()
          .to(word, { yPercent: -110, opacity: 0, duration: 0.25, ease: "power2.in" })
          .add(() => {
            word.textContent = s.word;
            word.style.color = s.color;
          })
          .fromTo(word, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: "power3.out" });
      };

      let i = 0;
      const cycle = () => {
        const s = SPRITES[i % SPRITES.length];
        const cellsOn = spriteCells(s);
        const targets = cellsOn.map((c) => cells[c.idx]);
        state.current.color = s.color;
        const origin = Math.floor(Math.random() * cells.length);

        const tl = gsap.timeline({ onComplete: () => { i++; cycle(); } });

        // 1. colour wave
        tl.to(cells, {
          backgroundColor: withAlpha(s.color, 0.45),
          duration: 0.22,
          yoyo: true,
          repeat: 1,
          ease: "power1.out",
          stagger: { grid: [ROWS, COLS], from: origin, amount: 0.9 },
        });

        // 2. sprite assembles
        tl.add(() => {
          state.current.active = new Set(cellsOn.map((c) => c.idx));
          if (i > 0) swapWord(s);
        }, 0.55);
        tl.fromTo(
          targets,
          { scale: 0.2 },
          {
            scale: 1,
            backgroundColor: (k: number) => cellsOn[k].fill,
            duration: 0.45,
            ease: "back.out(3)",
            stagger: { amount: 0.5, from: "random" },
          },
          0.6
        );

        // 3. hold, then 4. dissolve
        tl.to(
          targets,
          {
            backgroundColor: BASE,
            scale: 0.5,
            duration: 0.35,
            ease: "power2.in",
            stagger: { amount: 0.45, from: "random" },
          },
          "+=1.9"
        );
        tl.set(targets, { scale: 1 });
        tl.add(() => state.current.active.clear());
      };
      cycle();
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const cellAt = (e: React.PointerEvent) => {
    const grid = gridRef.current!;
    const r = grid.getBoundingClientRect();
    const c = Math.floor(((e.clientX - r.left) / r.width) * COLS);
    const row = Math.floor(((e.clientY - r.top) / r.height) * ROWS);
    if (c < 0 || c >= COLS || row < 0 || row >= ROWS) return -1;
    return row * COLS + c;
  };

  const onMove = (e: React.PointerEvent) => {
    const idx = cellAt(e);
    const st = state.current;
    if (idx < 0 || idx === st.lastHover || st.active.has(idx)) return;
    st.lastHover = idx;
    const cell = gridRef.current!.children[idx] as HTMLElement;
    gsap.fromTo(
      cell,
      { backgroundColor: withAlpha(st.color, 0.85) },
      { backgroundColor: BASE, duration: 0.9, ease: "power2.out" }
    );
  };

  const onClick = (e: React.PointerEvent) => {
    const idx = cellAt(e);
    if (idx < 0) return;
    const st = state.current;
    const cells = (Array.from(gridRef.current!.children) as HTMLElement[]).filter((_, k) => !st.active.has(k));
    gsap.fromTo(
      cells,
      { scale: 1 },
      {
        scale: 0.55,
        duration: 0.18,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
        stagger: { grid: [ROWS, COLS], from: idx, amount: 0.6 },
      }
    );
  };

  return (
    <div
      ref={rootRef}
      className="relative hidden md:flex flex-col justify-between overflow-hidden p-10 bg-[#0b0b0d] border-r border-white/[0.06] select-none"
    >
      {/* Grid */}
      <div
        className="absolute inset-0 flex items-center justify-center cursor-crosshair"
        onPointerMove={onMove}
        onPointerDown={onClick}
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 14%, black 62%, transparent 92%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 14%, black 62%, transparent 92%)",
        }}
      >
        <div
          ref={gridRef}
          className="grid gap-[5px] w-[115%] shrink-0"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: COLS * ROWS }).map((_, k) => (
            <div key={k} className="aspect-square rounded-[4px] will-change-transform" />
          ))}
        </div>
      </div>

      {/* soft vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_40%,#0b0b0d_95%)]" />

      <div className="relative flex items-center gap-2.5 pointer-events-none">
        <div className="w-7 h-7 rounded-lg bg-white/[0.08] backdrop-blur flex items-center justify-center text-white">
          <SquaresFour size={15} weight="fill" />
        </div>
        <span className="font-semibold text-[13px] tracking-tight text-white">patchplan</span>
      </div>

      <h3 className="relative pointer-events-none text-[28px] font-semibold tracking-[-0.02em] text-white leading-[1.1]">
        Plan the patch.
        <br />
        Ship the{" "}
        <span className="inline-block overflow-hidden align-bottom pb-1 -mb-1">
          <span ref={wordRef} className="inline-block" style={{ color: SPRITES[0].color }}>
            {SPRITES[0].word}
          </span>
        </span>
        .
      </h3>
    </div>
  );
}
