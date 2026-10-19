"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlass, Sparkle, Plus, Command, ArrowElbowDownLeft } from "@phosphor-icons/react";

const SCENES = [
  { key: "search", label: "Search", query: "boss phase 2" },
  { key: "build", label: "Build", query: "Make a localization tracker for 6 languages" },
] as const;

const RESULTS = [
  { title: "Combat Overhaul GDD · Boss Phase 2", tag: "Doc", dot: "bg-amber-400" },
  { title: "Boss Phase 2 Rig", tag: "Art", dot: "bg-purple-400" },
  { title: "Cathedral boss stems", tag: "Audio", dot: "bg-sky-400" },
];

const LANGS = [
  { code: "EN", pct: 100 },
  { code: "JP", pct: 82 },
  { code: "DE", pct: 64 },
  { code: "FR", pct: 71 },
  { code: "ES", pct: 48 },
  { code: "ZH", pct: 35 },
];

type Phase = "typing" | "thinking" | "done";

export function AISection() {
  const [scene, setScene] = useState(0);
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");

  const go = (i: number) => {
    setScene(i);
    setTyped(0);
    setPhase("typing");
  };

  useEffect(() => {
    const q = SCENES[scene].query;
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      t = typed < q.length
        ? setTimeout(() => setTyped((n) => n + 1), 42)
        : setTimeout(() => setPhase(scene === 1 ? "thinking" : "done"), 350);
    } else if (phase === "thinking") {
      t = setTimeout(() => setPhase("done"), 1100);
    } else {
      t = setTimeout(() => go((scene + 1) % SCENES.length), 4200);
    }
    return () => clearTimeout(t);
  }, [scene, typed, phase]);

  const isBuild = SCENES[scene].key === "build";
  const query = SCENES[scene].query.slice(0, typed);

  return (
    <section className="relative py-20 sm:py-28 px-4 max-w-5xl mx-auto">
      <div data-reveal className="text-center mb-10 sm:mb-12">
        <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-bold tracking-[-0.03em] text-white leading-[1.05]">
          Search it. <span className="text-neutral-500">Or build it.</span>
        </h2>
        <p className="mt-4 text-[15px] text-neutral-400">
          One prompt for your whole studio.
        </p>
      </div>

      <div data-reveal className="relative max-w-2xl mx-auto">
        {/* glow */}
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-10 h-40 w-[80%] rounded-full bg-[#c8ff00]/[0.08] blur-3xl" />

        {/* mode pills */}
        <div className="relative flex justify-center gap-1.5 mb-4">
          {SCENES.map((s, i) => (
            <button
              key={s.key}
              onClick={() => go(i)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                scene === i
                  ? "bg-white/[0.08] border-white/[0.14] text-white"
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {s.key === "search" ? <MagnifyingGlass size={12} weight="bold" /> : <Sparkle size={12} weight="fill" />}
              {s.label}
            </button>
          ))}
        </div>

        {/* palette */}
        <div className="relative rounded-2xl bg-[#111114]/95 border border-white/[0.09] shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden backdrop-blur">
          <div className="px-4 sm:px-5 h-14 border-b border-white/[0.07] flex items-center gap-3">
            {isBuild ? (
              <Sparkle size={16} weight="fill" className="text-[#c8ff00] shrink-0" />
            ) : (
              <MagnifyingGlass size={16} weight="bold" className="text-neutral-400 shrink-0" />
            )}
            <span className="flex-1 min-w-0 truncate text-[14px] sm:text-[15px] text-white">
              {query}
              {phase === "typing" && <span className="pp-caret ml-px inline-block w-[2px] h-[1.05em] align-[-2px] bg-white/80" />}
            </span>
            <span className="hidden sm:inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-white/[0.05] text-neutral-500 border border-white/[0.07]">
              <Command size={11} /> K
            </span>
          </div>

          <div className="p-3 sm:p-4 h-[248px]">
            {!isBuild && phase === "done" && (
              <div className="space-y-1.5">
                {RESULTS.map((r, i) => (
                  <div
                    key={r.title}
                    style={{ animationDelay: `${i * 80}ms` }}
                    className={`pp-rise flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-[13px] ${
                      i === 0 ? "bg-white/[0.06] border border-white/[0.08]" : "border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.dot}`} />
                      <span className="text-neutral-100 truncate">{r.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-neutral-500">{r.tag}</span>
                      {i === 0 && <ArrowElbowDownLeft size={12} className="text-neutral-500" />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isBuild && phase === "thinking" && (
              <div className="h-full flex flex-col justify-center gap-3 px-2">
                <div className="flex items-center gap-2 text-[12px] text-[#d4ff33]">
                  <Sparkle size={12} weight="fill" className="animate-pulse" />
                  Building module…
                </div>
                {[90, 70, 80].map((w, i) => (
                  <div key={i} className="pp-shimmer h-3 rounded-full" style={{ width: `${w}%` }} />
                ))}
              </div>
            )}

            {isBuild && phase === "done" && (
              <div className="pp-rise h-full rounded-xl border border-[#c8ff00]/20 bg-gradient-to-br from-[#c8ff00]/[0.06] to-transparent p-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-white">Localization Matrix</span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#c8ff00] text-black font-semibold text-[11px]">
                    <Plus size={11} weight="bold" /> Add
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3.5 flex-1 content-center">
                  {LANGS.map((l, i) => (
                    <div key={l.code} className="flex items-center gap-3">
                      <span className="w-6 text-[11px] font-mono text-neutral-400">{l.code}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="pp-grow h-full rounded-full bg-[#c8ff00]/80"
                          style={{ width: `${l.pct}%`, animationDelay: `${150 + i * 60}ms` }}
                        />
                      </div>
                      <span className="w-8 text-right text-[11px] font-mono text-neutral-500">{l.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
