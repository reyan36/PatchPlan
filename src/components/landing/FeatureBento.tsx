"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Kanban,
  FileText,
  MapTrifold,
  DiscordLogo,
  UsersThree,
  CheckCircle,
  Circle,
  CircleHalf,
  YoutubeLogo,
  TwitchLogo,
  Flask,
  EnvelopeSimple,
  Bug,
  Image as ImageIcon,
} from "@phosphor-icons/react";

/**
 * Feature showcase styled as a game's level select: pick a level on the left, its live preview plays
 * on the stage. It auto-advances with a progress bar (CSS animation; the next level starts when it
 * ends), and pauses on hover, keyboard focus, off-screen and in background tabs.
 */

type Level = {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  accent: string;
  visual: ReactNode;
};

const LEVELS: Level[] = [
  { id: "board", icon: <Kanban size={16} weight="duotone" />, title: "Sprint boards", description: "Art, Code, Audio and Bug tasks, organized by milestone. Drag a card to Done and the whole team sees it.", accent: "#c8ff00", visual: <BoardVisual /> },
  { id: "gdd", icon: <FileText size={16} weight="duotone" />, title: "Living GDDs", description: "Design docs with an infinite whiteboard for level layouts, combat loops and lore.", accent: "#38bdf8", visual: <GddVisual /> },
  { id: "roadmap", icon: <MapTrifold size={16} weight="duotone" />, title: "Public roadmaps", description: "Share where the game is heading with players and publishers, in one click.", accent: "#34d399", visual: <RoadmapVisual /> },
  { id: "beta", icon: <Flask size={16} weight="duotone" />, title: "Beta testers", description: "Approve testers, collect bug reports with screenshots, and turn them into tasks.", accent: "#fbbf24", visual: <BetaVisual /> },
  { id: "email", icon: <EnvelopeSimple size={16} weight="duotone" />, title: "Player emails", description: "Grow a mailing list from your news page and send patch notes to every subscriber.", accent: "#a78bfa", visual: <EmailVisual /> },
  { id: "discord", icon: <DiscordLogo size={16} weight="duotone" />, title: "Discord sync", description: "Shipped tasks, new ideas and devlogs post to your server automatically.", accent: "#818cf8", visual: <DiscordVisual /> },
  { id: "network", icon: <UsersThree size={16} weight="duotone" />, title: "Creator network", description: "Track streamers, press and partners by tier and niche, from first email to coverage.", accent: "#fb7185", visual: <NetworkVisual /> },
];

const LEVEL_MS = 6000;
const pad = (n: number) => String(n).padStart(2, "0");

export function FeatureBento() {
  const [active, setActive] = useState(0);
  const [cycle, setCycle] = useState(0); // restarts the progress bar
  const [hover, setHover] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [reduce, setReduce] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const level = LEVELS[active];

  // Phones show the levels as a sideways-scrolling row: keep the playing one in view (row only, never the page).
  useEffect(() => {
    const row = listRef.current;
    const tab = row?.children[active] as HTMLElement | undefined;
    if (!row || !tab || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  }, [active, reduce]);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pick = (i: number) => {
    setActive(i);
    setCycle((c) => c + 1);
  };
  const next = () => pick((active + 1) % LEVELS.length);
  const paused = hover || keyboardFocus || !onScreen;

  return (
    <section
      ref={ref}
      id="features"
      className="py-20 sm:py-28 px-4 max-w-6xl mx-auto"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      // Keyboard users can stop the autoplay by tabbing into the list (a mouse click doesn't pause it).
      onFocusCapture={(e) => (e.target as HTMLElement).matches(":focus-visible") && setKeyboardFocus(true)}
      onBlurCapture={() => setKeyboardFocus(false)}
    >
      <div data-reveal className="text-center mb-12 sm:mb-16">
        <p className="font-mono text-[11px] tracking-[0.3em] text-neutral-500 mb-4">SELECT A LEVEL</p>
        <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-bold tracking-[-0.03em] text-white leading-[1.05]">
          Everything your studio ships. <span className="block text-neutral-500">In one place.</span>
        </h2>
      </div>

      <div data-reveal className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4 md:gap-8 items-stretch">
        {/* Level list: a scrollable row on phones, a column on larger screens */}
        <div ref={listRef} role="tablist" aria-label="Features" className="relative flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 pb-1 md:pb-0 [scrollbar-width:none]">
          {LEVELS.map((l, i) => {
            const on = i === active;
            return (
              <button
                key={l.id}
                role="tab"
                id={`level-tab-${l.id}`}
                aria-selected={on}
                aria-controls="level-stage"
                onClick={() => pick(i)}
                className={`group relative shrink-0 md:shrink text-left rounded-xl border transition-colors px-3.5 py-2.5 md:px-4 md:py-3.5 ${
                  on ? "bg-white/[0.04] border-white/[0.1]" : "border-transparent hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-[11px] tabular-nums transition-colors ${on ? "" : "text-neutral-600"}`} style={on ? { color: l.accent } : undefined}>
                    {pad(i + 1)}
                  </span>
                  <span className={`transition-colors ${on ? "text-white" : "text-neutral-500 group-hover:text-neutral-300"}`}>{l.icon}</span>
                  <span className={`text-[14px] md:text-[15px] font-semibold tracking-tight whitespace-nowrap transition-colors ${on ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"}`}>
                    {l.title}
                  </span>
                </div>
                {on && <p className="hidden md:block mt-2 pl-[52px] text-[13px] leading-relaxed text-neutral-400 pp-rise">{l.description}</p>}
                {/* Auto-advance timer, like a loading bar */}
                {on && !reduce && (
                  <span className="absolute left-3.5 right-3.5 md:left-4 md:right-4 bottom-0 h-[2px] rounded-full bg-white/[0.06] overflow-hidden">
                    <span
                      key={cycle}
                      className="pp-level-bar block h-full rounded-full"
                      style={{ background: l.accent, animationDuration: `${LEVEL_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
                      onAnimationEnd={next}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Stage */}
        <div
          id="level-stage"
          role="tabpanel"
          aria-labelledby={`level-tab-${level.id}`}
          className="relative min-h-[320px] sm:min-h-[400px] md:min-h-[460px] rounded-3xl border border-white/[0.08] bg-[#0b0b0d] overflow-hidden flex flex-col"
        >
          <div key={`glow-${level.id}`} className="pp-fade pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse 70% 55% at 50% 0%, ${level.accent}1f, transparent 70%)` }} />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]" />

          {/* HUD */}
          <div className="relative flex items-center justify-between px-5 pt-4 font-mono text-[10px] tracking-[0.2em] text-neutral-500">
            <span>
              LVL <span style={{ color: level.accent }}>{pad(active + 1)}</span> / {pad(LEVELS.length)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: level.accent }} /> LIVE PREVIEW
            </span>
          </div>

          <div className="relative flex-1 flex items-center justify-center px-4 py-6">
            <div key={level.id} className="pp-swap-in relative w-[440px] max-w-full h-[230px] sm:scale-[1.12] md:scale-100 lg:scale-[1.15] xl:scale-[1.28]">
              {level.visual}
            </div>
          </div>

          <p className="md:hidden relative px-5 pb-5 text-[13px] leading-relaxed text-neutral-400">{level.description}</p>
        </div>
      </div>
    </section>
  );
}

/* ─── Visuals ─── */

const panel = "rounded-xl bg-[#16161a] border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.45)]";

const TAG: Record<string, string> = {
  Code: "bg-amber-500/15 text-amber-300",
  Art: "bg-purple-500/15 text-purple-300",
  Audio: "bg-sky-500/15 text-sky-300",
  Bug: "bg-red-500/15 text-red-300",
  Design: "bg-emerald-500/15 text-emerald-300",
};

function TaskCard({ tag, title, done }: { tag: string; title: string; done?: boolean }) {
  return (
    <div className="rounded-lg bg-[#1c1c21] border border-white/[0.06] p-2.5 space-y-2">
      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${TAG[tag]}`}>{tag}</span>
      <div className={`text-[11px] font-medium leading-snug ${done ? "text-neutral-500 line-through" : "text-neutral-200"}`}>{title}</div>
    </div>
  );
}

function BoardVisual() {
  const cols = [
    { name: "To do", icon: <Circle size={11} />, tasks: [["Bug", "Softlock on ladder exit"], ["Design", "Parry window tuning"]] },
    { name: "In progress", icon: <CircleHalf size={11} weight="fill" className="text-amber-400" />, tasks: [["Code", "Melee hitbox & roll"], ["Audio", "Cathedral stems"]] },
    { name: "Done", icon: <CheckCircle size={11} weight="fill" className="text-emerald-400" />, tasks: [["Art", "Boss phase 2 rig"], ["Code", "Save system v2"]] },
  ];
  return (
    <div className="absolute inset-x-2 top-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white">Milestone · Vertical Slice</span>
          <span className="text-[10px] font-mono text-neutral-500">v0.4</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1 rounded-full bg-white/[0.08] overflow-hidden">
            <div className="pp-grow h-full w-[62%] bg-[#c8ff00]/80 rounded-full" />
          </div>
          <span className="text-[10px] font-mono text-neutral-400">62%</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {cols.map((c, i) => (
          <div key={c.name} className={`rounded-xl bg-white/[0.02] border border-white/[0.05] p-2 space-y-2 ${i === 2 ? "hidden sm:block" : ""}`}>
            <div className="flex items-center gap-1.5 px-0.5 text-[10px] font-medium text-neutral-400">
              {c.icon}
              {c.name}
              <span className="ml-auto text-neutral-600">{c.tasks.length}</span>
            </div>
            {c.tasks.map(([tag, title]) => (
              <TaskCard key={title} tag={tag} title={title} done={c.name === "Done"} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function GddVisual() {
  return (
    <div className="absolute inset-0">
      <svg className="absolute inset-0 w-full h-full" aria-hidden>
        <line x1="50%" y1="40%" x2="60%" y2="60%" stroke="rgba(255,255,255,0.15)" />
        <line x1="34%" y1="45%" x2="34%" y2="72%" stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
        <line x1="40%" y1="34%" x2="64%" y2="22%" stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
      </svg>
      <div className={`${panel} absolute left-[8%] top-[22%] w-[42%] p-2.5 space-y-1.5`}>
        <div className="text-[10px] font-semibold text-white">Combat Loop</div>
        <div className="h-1 w-full rounded bg-white/[0.08]" />
        <div className="h-1 w-4/5 rounded bg-white/[0.08]" />
        <div className="h-1 w-3/5 rounded bg-white/[0.08]" />
      </div>
      <div className="pp-float-a absolute left-[60%] top-[14%] px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[10px] text-amber-300">Stamina</div>
      <div className="pp-float-b absolute left-[58%] top-[54%] px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/25 text-[10px] text-sky-300">Parry window</div>
      <div className="pp-float-c absolute left-[16%] top-[70%] px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/25 text-[10px] text-purple-300">Crit stagger</div>
    </div>
  );
}

function RoadmapVisual() {
  const items = [
    { label: "Closed alpha", date: "Mar", state: "done" },
    { label: "Steam Next Fest demo", date: "Jun", state: "now" },
    { label: "Early access", date: "Q4", state: "next" },
  ];
  return (
    <div className="absolute inset-x-6 top-2">
      <div className={`${panel} p-3.5`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-white">Your Game · Roadmap</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
          </span>
        </div>
        <div className="relative pl-4 space-y-3">
          <div className="absolute left-[3px] top-1 bottom-1 w-px bg-white/[0.1]" />
          {items.map((it) => (
            <div key={it.label} className="relative flex items-center justify-between">
              <span
                className={`absolute -left-4 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full ${
                  it.state === "done" ? "bg-emerald-400" : it.state === "now" ? "bg-[#c8ff00] ring-4 ring-[#c8ff00]/15" : "bg-neutral-600"
                }`}
              />
              <span className={`text-[11px] ${it.state === "next" ? "text-neutral-500" : "text-neutral-200"}`}>{it.label}</span>
              <span className="text-[10px] font-mono text-neutral-500">{it.date}</span>
            </div>
          ))}
        </div>
        <div className="mt-3.5 px-2.5 py-1.5 rounded-md bg-black/40 border border-white/[0.06] font-mono text-[10px] text-neutral-500 truncate">patchplan.net/p/roadmap/your-game</div>
      </div>
    </div>
  );
}

function BetaVisual() {
  return (
    <div className="absolute inset-x-4 top-1 grid grid-cols-[1fr_auto] gap-3">
      <div className={`${panel} p-3 space-y-2.5`}>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white">
            <Bug size={12} weight="fill" className="text-red-400" /> Falls through floor in Act 2
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-500/15 text-red-300">High</span>
        </div>
        <div className="grid grid-cols-[72px_1fr] gap-2.5">
          <div className="h-[52px] rounded-md bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-amber-400/20 border border-white/[0.08] grid place-items-center">
            <ImageIcon size={14} className="text-white/50" />
          </div>
          <div className="space-y-1.5 pt-0.5">
            <div className="h-1 w-full rounded bg-white/[0.08]" />
            <div className="h-1 w-5/6 rounded bg-white/[0.08]" />
            <div className="h-1 w-2/3 rounded bg-white/[0.08]" />
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-neutral-500">
          <span>Mika · Steam Deck · build 0.4.2</span>
          <span className="px-2 py-0.5 rounded-full bg-[#c8ff00] text-black font-semibold">→ Task</span>
        </div>
      </div>
      <div className="w-[118px] space-y-2">
        {[
          ["Mika", "Approved", "text-emerald-300 bg-emerald-500/10"],
          ["Jun", "Approved", "text-emerald-300 bg-emerald-500/10"],
          ["Sam", "Pending", "text-amber-300 bg-amber-500/10"],
        ].map(([name, state, cls]) => (
          <div key={name} className="rounded-lg bg-[#1c1c21] border border-white/[0.06] px-2.5 py-2 flex items-center justify-between">
            <span className="text-[10px] text-neutral-200">{name}</span>
            <span className={`text-[8.5px] px-1.5 py-px rounded-full font-semibold ${cls}`}>{state}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailVisual() {
  return (
    <div className="absolute inset-x-8 top-0">
      <div className={`${panel} overflow-hidden`}>
        <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2 text-[10px] text-neutral-500">
          <span className="w-5 h-5 rounded-md bg-violet-500/20 text-violet-300 grid place-items-center">
            <EnvelopeSimple size={11} weight="fill" />
          </span>
          <span className="text-neutral-200 font-medium">Your Studio</span>
          <span className="ml-auto">to 2,481 players</span>
        </div>
        <div className="p-3.5 space-y-2">
          <div className="text-[12px] font-semibold text-white">Patch 0.5 is live: the cathedral opens</div>
          <div className="h-[46px] rounded-md bg-gradient-to-r from-violet-500/25 via-fuchsia-500/15 to-amber-400/20 border border-white/[0.06]" />
          <div className="space-y-1.5">
            <div className="h-1 w-full rounded bg-white/[0.08]" />
            <div className="h-1 w-4/5 rounded bg-white/[0.08]" />
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="px-2.5 py-1 rounded-md bg-white text-black text-[9.5px] font-semibold">Read the patch notes</span>
            <span className="text-[9px] text-neutral-600">Unsubscribe</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscordVisual() {
  return (
    <div className="absolute inset-x-6 top-2">
      <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mb-2.5">
        <span className="text-neutral-600">#</span>dev-updates
      </div>
      <div className="flex gap-2.5">
        <div className="w-7 h-7 shrink-0 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300">
          <DiscordLogo size={14} weight="fill" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[11px] font-semibold text-white">PatchPlan</span>
            <span className="text-[8px] px-1 py-px rounded bg-indigo-500 text-white font-semibold">APP</span>
            <span className="text-[10px] text-neutral-600">Today at 4:20 PM</span>
          </div>
          <div className="rounded-md bg-[#1c1c21] border-l-[3px] border-emerald-400 p-2.5 space-y-1.5">
            <div className="text-[11px] font-semibold text-white">Update 2.2.1 published</div>
            <div className="text-[10px] text-neutral-400 leading-relaxed">New boss phase, parry tuning and 14 bug fixes are live.</div>
            <div className="flex gap-1 pt-0.5">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${TAG.Art}`}>Art</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${TAG.Code}`}>Code</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${TAG.Bug}`}>Bug</span>
            </div>
          </div>
          <div className="flex gap-1 mt-1.5">
            <span className="px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.06] text-[10px] text-neutral-400">🔥 24</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.06] text-[10px] text-neutral-400">🎉 11</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NetworkVisual() {
  const creators = [
    { name: "Roguelike Channel", platform: "yt", tier: "100K–500K", niche: "Roguelike", hue: "from-orange-400 to-rose-500" },
    { name: "RPG Streamer", platform: "tw", tier: "500K+", niche: "RPG", hue: "from-violet-400 to-indigo-500" },
    { name: "Sim Reviewer", platform: "yt", tier: "100K–500K", niche: "Sim", hue: "from-emerald-400 to-teal-500" },
  ];
  return (
    <div className="absolute inset-x-8 top-2">
      <div className={`${panel} divide-y divide-white/[0.05]`}>
        {creators.map((c) => (
          <div key={c.name} className="flex items-center gap-2.5 px-3 py-2.5">
            <div className={`w-6 h-6 shrink-0 rounded-full bg-gradient-to-br ${c.hue}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-white">
                {c.name}
                {c.platform === "yt" ? <YoutubeLogo size={11} weight="fill" className="text-red-400" /> : <TwitchLogo size={11} weight="fill" className="text-purple-400" />}
              </div>
              <div className="text-[10px] text-neutral-500">#{c.niche}</div>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-neutral-300">{c.tier}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
