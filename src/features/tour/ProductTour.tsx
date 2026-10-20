"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import {
  Question, X, Kanban, Lightbulb, Compass, Newspaper, Sparkle, EnvelopeSimple, ShareNetwork, Users, Gear, ArrowRight, ArrowLeft, Play, CheckCircle,
} from "@phosphor-icons/react";

export const TOUR_SEEN_KEY = "pp-tour-seen";
const EXPLORED_KEY = "pp-tour-explored";

type Step = { target?: string; title: string; body: string };

export const FEATURES = [
  { key: "board", href: "/board", icon: Kanban, title: "Production board", body: "Art, Code, Audio, Design and Bug tasks moving through your pipeline. Drag cards between columns; moving to Done pings Discord." },
  { key: "ideas", href: "/ideas", icon: Lightbulb, title: "Ideas & design docs", body: "Living GDDs with rich text and an infinite drawing canvas for level layouts and mechanics." },
  { key: "roadmap", href: "/roadmap", icon: Compass, title: "Public roadmap", body: "Plan what's next and share a public roadmap link with players, backers and publishers." },
  { key: "news", href: "/news", icon: Newspaper, title: "News & patch notes", body: "Write devlogs and patch notes, then publish them to your public news page." },
  { key: "ai", href: "/ai", icon: Sparkle, title: "PatchPlan AI", body: "Turn player feedback into tasks, search your whole workspace, and build custom tools by describing them." },
  { key: "email", href: "/email", icon: EnvelopeSimple, title: "Email", body: "Collect player emails and send newsletters, patch notes and automatic weekly or daily updates." },
  { key: "network", href: "/marketing", icon: ShareNetwork, title: "Creator network", body: "Track streamers, YouTubers and press by platform, tier and niche." },
  { key: "teams", href: "/teams", icon: Users, title: "Teams", body: "Your current workspace. Click it to switch, create a studio, or invite teammates with a join code." },
  { key: "settings", href: "/settings", icon: Gear, title: "Settings", body: "Your account menu: Settings for Discord alerts, email sender details and AI status, plus the tour and sign out." },
] as const;

const STEPS: Step[] = [
  { title: "Welcome to PatchPlan", body: "A quick look at where everything lives. It takes about a minute, and you can reopen it anytime from the Guide button." },
  ...FEATURES.map((f) => ({ target: `[data-tour="nav-${f.key}"]`, title: f.title, body: f.body })),
  { target: '[data-tour="guide-button"]', title: "Come back anytime", body: "The Guide button on your dashboard lists every feature and restarts this tour." },
];

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // Private mode: the tour just shows again next time.
  }
};

/** Spotlight walkthrough over the navbar. */
function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = STEPS[i];

  const measure = useCallback(() => {
    const el = step.target ? (document.querySelector(step.target) as HTMLElement | null) : null;
    const r = el?.getBoundingClientRect();
    // Hidden targets (e.g. collapsed nav on small screens) fall back to a centred card.
    setRect(r && r.width > 0 && r.height > 0 ? r : null);
  }, [step.target]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, STEPS.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const last = i === STEPS.length - 1;
  const pad = 6;
  const cardW = 320;
  let cardStyle: React.CSSProperties = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  if (rect) {
    const below = rect.bottom + 14 + 200 < window.innerHeight;
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - cardW / 2), window.innerWidth - cardW - 12);
    cardStyle = below ? { left, top: rect.bottom + 14 } : { left, bottom: window.innerHeight - rect.top + 14 };
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Product tour">
      {rect ? (
        <div
          className="fixed rounded-lg pointer-events-none transition-all duration-300 ring-2 ring-[#c8ff00]/70"
          style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)" }}
        />
      ) : (
        <div className="fixed inset-0" style={{ background: "rgba(0,0,0,0.72)" }} />
      )}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="fixed rounded-xl border border-white/10 bg-[#141418] shadow-2xl p-4 transition-all duration-300" style={{ width: cardW, maxWidth: "calc(100vw - 24px)", ...cardStyle }}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">{step.title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white -mt-0.5" aria-label="Close tour"><X size={14} /></button>
        </div>
        <p className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed">{step.body}</p>
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1">
            {STEPS.map((_, n) => <span key={n} className={`h-1 rounded-full transition-all ${n === i ? "w-4 bg-[#c8ff00]" : "w-1 bg-white/15"}`} />)}
          </div>
          <div className="flex gap-1.5">
            {i > 0 && (
              <button onClick={() => setI(i - 1)} className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06]" aria-label="Back"><ArrowLeft size={13} /></button>
            )}
            <button
              onClick={() => (last ? onClose() : setI(i + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#FAFAFA] text-black text-xs font-semibold hover:bg-zinc-200"
            >
              {last ? "Done" : i === 0 ? "Start" : "Next"} {!last && <ArrowRight size={12} weight="bold" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard helper: welcome prompt on first visit, the spotlight tour,
 * and a sticky Guide button listing every feature.
 */
export function DashboardGuide() {
  const [touring, setTouring] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [open, setOpen] = useState(false);
  const [explored, setExplored] = useState<string[]>([]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("tour") === "1") {
      window.history.replaceState(null, "", window.location.pathname);
      setTouring(true);
    } else if (!read(TOUR_SEEN_KEY)) {
      setWelcome(true);
    }
    const startNow = () => { setOpen(false); setWelcome(false); setTouring(true); };
    window.addEventListener("pp:start-tour", startNow);
    try {
      setExplored(JSON.parse(read(EXPLORED_KEY) || "[]"));
    } catch {
      setExplored([]);
    }
    return () => window.removeEventListener("pp:start-tour", startNow);
  }, []);

  const finish = useCallback(() => {
    write(TOUR_SEEN_KEY, "1");
    setTouring(false);
    setWelcome(false);
  }, []);

  const start = () => {
    setOpen(false);
    setWelcome(false);
    setTouring(true);
  };

  const markExplored = (key: string) => {
    const next = Array.from(new Set([...explored, key]));
    setExplored(next);
    write(EXPLORED_KEY, JSON.stringify(next));
  };

  return (
    <>
      {welcome && !touring && (
        <div className="fixed bottom-24 right-5 z-40 w-[320px] max-w-[calc(100vw-40px)] rounded-xl border border-white/10 bg-[#141418] shadow-2xl p-4 pp-fade">
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-[#c8ff00]/15 text-[#c8ff00] flex items-center justify-center shrink-0"><Play size={14} weight="fill" /></span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">New here? Take the tour</h3>
              <p className="text-xs text-zinc-400 mt-1">A one-minute walkthrough of boards, roadmaps, AI, email and more.</p>
              <div className="flex gap-2 mt-3">
                <button onClick={start} className="px-3 py-1.5 rounded-md bg-[#FAFAFA] text-black text-xs font-semibold hover:bg-zinc-200">Start tour</button>
                <button onClick={finish} className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-white">Maybe later</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed bottom-20 right-5 z-40 w-[360px] max-w-[calc(100vw-40px)] max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-[#141418] shadow-2xl pp-fade">
          <div className="sticky top-0 bg-[#141418] px-4 pt-4 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Feature guide</h3>
              <span className="text-[11px] text-zinc-500">{explored.length}/{FEATURES.length} explored</span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.06] mt-2 overflow-hidden">
              <div className="h-full bg-[#c8ff00]/80 transition-all" style={{ width: `${(explored.length / FEATURES.length) * 100}%` }} />
            </div>
            <button onClick={start} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#FAFAFA] text-black text-xs font-semibold hover:bg-zinc-200">
              <Play size={12} weight="fill" /> Take the tour
            </button>
          </div>
          <ul className="p-2">
            {FEATURES.map((f) => (
              <li key={f.key}>
                <Link href={f.href} onClick={() => markExplored(f.key)} className="flex gap-3 rounded-lg p-2.5 hover:bg-white/[0.04] group">
                  <f.icon size={18} weight="duotone" className="text-zinc-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-zinc-100 flex items-center gap-1.5">
                      {f.title}
                      {explored.includes(f.key) && <CheckCircle size={12} weight="fill" className="text-emerald-400" />}
                    </div>
                    <div className="text-xs text-zinc-500 leading-relaxed">{f.body}</div>
                  </div>
                  <ArrowRight size={13} className="text-zinc-600 group-hover:text-zinc-300 mt-1 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        data-tour="guide-button"
        onClick={() => {
          setOpen((v) => !v);
          setWelcome(false);
        }}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full border border-white/10 bg-[#1a1a1e]/95 backdrop-blur text-sm font-medium text-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:border-white/25"
        aria-expanded={open}
      >
        {open ? <X size={16} /> : <Question size={16} weight="duotone" className="text-[#c8ff00]" />}
        Guide
      </button>

      {touring && <Tour onClose={finish} />}
    </>
  );
}
