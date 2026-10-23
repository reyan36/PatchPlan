"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient pixel field behind the hero: soft colour waves ripple out from random cells.
 * Drawn on one canvas (instead of 384 animated divs), only while a wave is moving, and paused
 * when off-screen or in a background tab, so it costs almost nothing on phones.
 */
const COLS = 32;
const ROWS = 12;
const WIDTH = 1400;
const GAP = 6;
const TOP = 64;
const CELL = (WIDTH - GAP * (COLS - 1)) / COLS;
const HEIGHT = Math.ceil(TOP + ROWS * CELL + (ROWS - 1) * GAP);
const RADIUS = 5;
const BASE: [number, number, number, number] = [255, 255, 255, 0.025];
const COLORS = ["#c8ff00", "#a78bfa", "#fbbf24", "#38bdf8", "#fb7185"];

// Same timing as the previous GSAP version.
const INTRO_CELL = 0.6;
const INTRO_SPREAD = 1.2;
const WAVE_HALF = 0.3;
const WAVE_SPREAD = 1.6;
const WAVE_GAP = 1.2;
const FIRST_WAVE = 1.4;

const hexRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
const easeOut2 = (p: number) => 1 - (1 - p) * (1 - p);
const sineInOut = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;

/** Per-cell delays for a ripple from one cell, scaled so the farthest cell starts at `spread`. */
function delaysFrom(origin: number, spread: number) {
  const oc = origin % COLS;
  const or = Math.floor(origin / COLS);
  const d = Array.from({ length: COLS * ROWS }, (_, k) => Math.hypot((k % COLS) - oc, Math.floor(k / COLS) - or));
  const max = Math.max(...d) || 1;
  return d.map((v) => (v / max) * spread);
}

export function HeroGrid() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const centre = Math.floor(ROWS / 2) * COLS + Math.floor(COLS / 2);
    const introDelay = delaysFrom(centre, INTRO_SPREAD);

    const start = performance.now();
    let wave: { at: number; rgb: readonly [number, number, number]; delay: number[] } | null = null;
    let waveIndex = 0;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = true;
    let waitingForVisible = false;

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      let busy = !reduce && t < INTRO_SPREAD + INTRO_CELL;
      const wt = wave ? (now - wave.at) / 1000 : -1;
      if (wave && wt <= WAVE_SPREAD + WAVE_HALF * 2) busy = true;

      for (let k = 0; k < COLS * ROWS; k++) {
        const intro = reduce ? 1 : easeOut2(Math.min(1, Math.max(0, (t - introDelay[k]) / INTRO_CELL)));
        if (intro <= 0) continue;

        let r = BASE[0], g = BASE[1], b = BASE[2], a = BASE[3];
        if (wave) {
          const local = wt - wave.delay[k];
          if (local > 0 && local < WAVE_HALF * 2) {
            const m = sineInOut(local < WAVE_HALF ? local / WAVE_HALF : 1 - (local - WAVE_HALF) / WAVE_HALF);
            r += (wave.rgb[0] - r) * m;
            g += (wave.rgb[1] - g) * m;
            b += (wave.rgb[2] - b) * m;
            a += (0.32 - a) * m;
          }
        }

        const size = CELL * (0.3 + 0.7 * intro);
        const x = (k % COLS) * (CELL + GAP) + (CELL - size) / 2;
        const y = TOP + Math.floor(k / COLS) * (CELL + GAP) + (CELL - size) / 2;
        ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${(a * intro).toFixed(3)})`;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, size, size, RADIUS * (size / CELL));
        else ctx.rect(x, y, size, size);
        ctx.fill();
      }
      return busy;
    };

    const frame = (now: number) => {
      raf = 0;
      if (draw(now) && visible) raf = requestAnimationFrame(frame);
      else if (wave && (now - wave.at) / 1000 > WAVE_SPREAD + WAVE_HALF * 2) {
        wave = null;
        schedule(WAVE_GAP);
      }
    };
    const run = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };

    const startWave = () => {
      timer = undefined;
      if (!visible) {
        waitingForVisible = true; // resumes when the hero is back on screen
        return;
      }
      waitingForVisible = false;
      wave = {
        at: performance.now(),
        rgb: hexRgb(COLORS[waveIndex++ % COLORS.length]),
        delay: delaysFrom(Math.floor(Math.random() * COLS * ROWS), WAVE_SPREAD),
      };
      run();
    };
    const schedule = (seconds: number) => {
      clearTimeout(timer);
      timer = setTimeout(startWave, seconds * 1000);
    };

    if (reduce) {
      draw(performance.now());
      return;
    }

    run();
    schedule(FIRST_WAVE);

    // Pause off-screen and in background tabs.
    let onScreen = true;
    const update = () => {
      visible = onScreen && document.visibilityState === "visible";
      if (!visible) return;
      if (waitingForVisible) startWave();
      run();
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      update();
    });
    io.observe(canvas);
    const onVis = () => update();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
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
      <canvas ref={ref} className="shrink-0" style={{ width: WIDTH, height: HEIGHT }} />
    </div>
  );
}
