"use client";

import type { ReactNode } from "react";
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
} from "@phosphor-icons/react";

/** Pointer-follow 3D tilt + spotlight for a card. Smoothing comes from the CSS transform transition. */
function tiltHandlers() {
  return {
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
      el.style.transform = `perspective(1200px) rotateY(${((x - 0.5) * 4).toFixed(2)}deg) rotateX(${((0.5 - y) * 4).toFixed(2)}deg)`;
    },
    onPointerLeave: (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.style.transform = "";
    },
  };
}

type Feature = {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  span?: string;
  visual: ReactNode;
};

const FEATURES: Feature[] = [
  {
    id: "board",
    icon: <Kanban size={16} weight="duotone" />,
    title: "Sprint boards",
    description: "Art, Code, Audio and Bug tasks, organized by milestone.",
    span: "md:col-span-2",
    visual: <BoardVisual />,
  },
  {
    id: "gdd",
    icon: <FileText size={16} weight="duotone" />,
    title: "Living GDDs",
    description: "Design docs with an infinite canvas.",
    visual: <GddVisual />,
  },
  {
    id: "roadmap",
    icon: <MapTrifold size={16} weight="duotone" />,
    title: "Public roadmaps",
    description: "Share progress with players in one click.",
    visual: <RoadmapVisual />,
  },
  {
    id: "discord",
    icon: <DiscordLogo size={16} weight="duotone" />,
    title: "Discord sync",
    description: "Shipped work posts to your server.",
    visual: <DiscordVisual />,
  },
  {
    id: "network",
    icon: <UsersThree size={16} weight="duotone" />,
    title: "Creator network",
    description: "Track streamers and press by tier and niche.",
    visual: <NetworkVisual />,
  },
];

export function FeatureBento() {
  return (
    <section id="features" className="py-12 sm:py-16 px-4 max-w-5xl mx-auto">
      <div data-reveal className="text-center mb-10 sm:mb-12">
        <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-bold tracking-[-0.03em] text-white leading-[1.05]">
          Everything your studio ships. <span className="block text-neutral-500">In one place.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.id}
            data-reveal-item
            {...tiltHandlers()}
            style={{ transformStyle: "preserve-3d" }}
            className={`group relative rounded-2xl bg-[#0c0c0e] border border-white/[0.07] hover:border-white/[0.14] transition-colors overflow-hidden flex flex-col ${f.span ?? ""}`}
          >
            {/* Cursor spotlight */}
            <div
              className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.05), transparent 60%)" }}
            />

            {/* Visual */}
            <div
              className="relative h-[220px] overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:16px_16px]"
              style={{ maskImage: "linear-gradient(to bottom, black 70%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent)" }}
            >
              {f.visual}
            </div>

            {/* Text */}
            <div className="p-5 sm:p-6 pt-4 sm:pt-5">
              <div className="flex items-center gap-2 text-neutral-400 mb-1.5">
                {f.icon}
                <h3 className="text-[15px] font-semibold text-white tracking-tight">{f.title}</h3>
              </div>
              <p className="text-[13px] text-neutral-500 leading-relaxed">{f.description}</p>
            </div>
          </div>
        ))}
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
    <div className="absolute inset-x-5 top-5 sm:inset-x-6 sm:top-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white">Milestone · Vertical Slice</span>
          <span className="text-[10px] font-mono text-neutral-500">v0.4</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1 rounded-full bg-white/[0.08] overflow-hidden">
            <div className="h-full w-[62%] bg-[#c8ff00]/80 rounded-full" />
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
      {/* connectors */}
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
      <div className="absolute left-[60%] top-[14%] px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[10px] text-amber-300">
        Stamina
      </div>
      <div className="absolute left-[58%] top-[54%] px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/25 text-[10px] text-sky-300">
        Parry window
      </div>
      <div className="absolute left-[16%] top-[70%] px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/25 text-[10px] text-purple-300">
        Crit stagger
      </div>
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
    <div className="absolute inset-x-5 top-5 sm:inset-x-6 sm:top-6">
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
        <div className="mt-3.5 px-2.5 py-1.5 rounded-md bg-black/40 border border-white/[0.06] font-mono text-[10px] text-neutral-500 truncate">
          patchplan.net/p/roadmap/your-game
        </div>
      </div>
    </div>
  );
}

function DiscordVisual() {
  return (
    <div className="absolute inset-x-5 top-5 sm:inset-x-6 sm:top-6">
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
    <div className="absolute inset-x-5 top-5 sm:inset-x-6 sm:top-6">
      <div className={`${panel} divide-y divide-white/[0.05]`}>
        {creators.map((c) => (
          <div key={c.name} className="flex items-center gap-2.5 px-3 py-2.5">
            <div className={`w-6 h-6 shrink-0 rounded-full bg-gradient-to-br ${c.hue}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-white">
                {c.name}
                {c.platform === "yt" ? (
                  <YoutubeLogo size={11} weight="fill" className="text-red-400" />
                ) : (
                  <TwitchLogo size={11} weight="fill" className="text-purple-400" />
                )}
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
