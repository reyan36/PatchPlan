"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowElbowDownLeft,
  ArrowsDownUp,
  Bell,
  Buildings,
  CheckSquare,
  ClockCounterClockwise,
  Compass,
  Copy,
  EnvelopeSimple,
  FileText,
  Flask,
  Gear,
  Kanban,
  Keyboard,
  Lightbulb,
  MagnifyingGlass,
  Newspaper,
  Play,
  Plus,
  Pulse,
  ShareNetwork,
  SignOut,
  Sparkle,
  SquaresFour,
  User,
  Users,
  ShieldCheck,
  Scroll,
  type Icon,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/AuthContext";
import { useDirty } from "@/lib/DirtyContext";
import { useFamily } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import { personalOnly, scopeIdeas, scopeTasks, useLiveQuery } from "@/lib/live";
import { PAGES, PAGE_EVENTS, isMac } from "./commands";
import type { PaletteMode } from "./CommandMenu";

type Item = { id: string; group: string; label: string; sub?: string; icon: Icon; keys?: string[]; keywords?: string; run: () => void };

const PAGE_ICONS: Record<string, Icon> = {
  home: SquaresFour, board: Kanban, inbox: Bell, ideas: Lightbulb, roadmap: Compass, news: Newspaper, beta: Flask, ai: Sparkle,
  email: EnvelopeSimple, network: ShareNetwork, teams: Users, settings: Gear, status: Pulse, changelog: ClockCounterClockwise, privacy: ShieldCheck, terms: Scroll,
};
const GROUP_ORDER = ["Jump to", "Actions", "Tasks", "Docs", "Workspaces"];
const studioNames = new Map<string, string>();

/** Higher is better; -1 = no match. Prefix > word start > anywhere > letters in order. */
function score(text: string, q: string) {
  const t = text.toLowerCase();
  if (!q) return 0;
  if (t.startsWith(q)) return 4;
  if (t.includes(` ${q}`) || t.includes(`/${q}`)) return 3;
  if (t.includes(q)) return 2;
  if (q.length < 3) return -1; // letters-in-order matching is too loose for very short queries
  let i = 0;
  for (const ch of t) if (ch === q[i]) i++;
  return i === q.length ? 1 : -1;
}

export function Palette({ mode, onMode, onClose }: { mode: PaletteMode; onMode: (m: PaletteMode) => void; onClose: () => void }) {
  const { user, logout } = useAuth();
  const { activeFamily, userProfile, setActiveFamilyId } = useFamily();
  const { handleNavigation } = useDirty();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [studios, setStudios] = useState<{ id: string; name: string }[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const mod = isMac() ? "⌘" : "Ctrl";

  // Live tasks and docs of this workspace: shared with Board/Ideas, so usually already loaded.
  const familyId = activeFamily?.id ?? null;
  const taskSrc = user ? scopeTasks(user.uid, familyId) : null;
  const ideaSrc = user ? scopeIdeas(user.uid, familyId) : null;
  const tasks = useLiveQuery<{ title?: string; column?: string; familyId?: string | null }>(taskSrc?.key ?? null, (fs) => taskSrc!.build(fs));
  const ideas = useLiveQuery<{ title?: string; status?: string; familyId?: string | null }>(ideaSrc?.key ?? null, (fs) => ideaSrc!.build(fs));

  // Studio names for "Switch to …" (cached for the session).
  useEffect(() => {
    const ids = userProfile?.joinedFamilies || [];
    const missing = ids.filter((id) => !studioNames.has(id));
    Promise.all(missing.map((id) => getDoc(doc(db, "families", id)).catch(() => null))).then((snaps) => {
      snaps.forEach((s) => s?.exists() && studioNames.set(s.id, String(s.data().name || "Studio")));
      setStudios(ids.filter((id) => studioNames.has(id)).map((id) => ({ id, name: studioNames.get(id)! })));
    });
  }, [userProfile?.joinedFamilies]);

  const close = onClose;
  /** Navigates, or tells the page that's already open to act (so it doesn't need a reload). */
  const go = (href: string, event?: { name: string; detail?: string }) => {
    close();
    const target = new URL(href, window.location.origin);
    if (event && target.pathname === pathname) window.dispatchEvent(new CustomEvent(event.name, { detail: event.detail }));
    else handleNavigation(href);
  };

  const q = query.trim().toLowerCase();

  const items = useMemo(() => {
    const base: Item[] = [
      { id: "new-task", group: "Actions", label: "New task", icon: Plus, keywords: "create add card", run: () => go("/board?new=1", { name: PAGE_EVENTS.newTask }) },
      { id: "new-doc", group: "Actions", label: "New doc", icon: FileText, keywords: "create idea gdd design document", run: () => go("/ideas?new=1", { name: PAGE_EVENTS.newIdea }) },
      ...(activeFamily?.joinCode
        ? [{ id: "invite", group: "Actions", label: "Copy studio invite code", icon: Copy, keywords: "join teammate", run: () => (navigator.clipboard?.writeText(activeFamily.joinCode), close()) }]
        : []),
      { id: "tour", group: "Actions", label: "Start product tour", icon: Play, keywords: "help guide walkthrough", run: () => (pathname === "/" ? (close(), window.dispatchEvent(new Event("pp:start-tour"))) : go("/?tour=1")) },
      { id: "shortcuts", group: "Actions", label: "Keyboard shortcuts", icon: Keyboard, keys: ["?"], keywords: "keys help hotkeys", run: () => onMode("help") },
      { id: "signout", group: "Actions", label: "Sign out", icon: SignOut, keywords: "log out logout", run: () => (close(), logout()) },
      ...PAGES.map((p) => ({
        id: `page-${p.id}`,
        group: "Jump to",
        label: p.label,
        icon: PAGE_ICONS[p.id] ?? SquaresFour,
        keys: p.key ? ["G", p.key.toUpperCase()] : undefined,
        keywords: p.keywords,
        run: () => go(p.href),
      })),
      ...(activeFamily ? [{ id: "ws-personal", group: "Workspaces", label: "Switch to Personal", icon: User, keywords: "workspace mine", run: () => (close(), setActiveFamilyId(null)) }] : []),
      ...studios
        .filter((s) => s.id !== activeFamily?.id)
        .map((s) => ({ id: `ws-${s.id}`, group: "Workspaces", label: `Switch to ${s.name}`, icon: Buildings, keywords: "workspace studio team", run: () => (close(), setActiveFamilyId(s.id)) })),
    ];

    const found: (Item & { s: number })[] = [];
    if (q) {
      const top = <T extends { title?: string }>(list: T[] | undefined) =>
        personalOnly(list as (T & { familyId?: string | null; id: string })[] | undefined, familyId)
          .map((x) => ({ x, s: score(x.title || "", q) }))
          .filter((r) => r.s >= 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, 6);
      top(tasks.data).forEach(({ x: t, s }) =>
        found.push({ s, id: `task-${t.id}`, group: "Tasks", label: t.title || "Untitled task", sub: t.column, icon: CheckSquare, run: () => go(`/board?task=${t.id}`, { name: PAGE_EVENTS.openTask, detail: t.id }) }),
      );
      top(ideas.data).forEach(({ x: i, s }) => found.push({ s, id: `doc-${i.id}`, group: "Docs", label: i.title || "Untitled doc", sub: i.status, icon: FileText, run: () => go(`/ideas/${i.id}`) }));
    }

    if (!q) return GROUP_ORDER.flatMap((g) => base.filter((it) => it.group === g));
    const all = [
      ...base.map((it) => ({ ...it, s: Math.max(score(it.label, q), it.keywords ? score(it.keywords, q) - 1 : -1) })).filter((it) => it.s >= 0),
      ...found,
    ].sort((a, b) => b.s - a.s);
    // Groups in order of their best match, so the most likely result is always first.
    const groups = Array.from(new Set(all.map((it) => it.group)));
    return groups.flatMap((g) => all.filter((it) => it.group === g));
  }, [q, tasks.data, ideas.data, studios, activeFamily?.id, pathname]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (items.length ? (a + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (items.length ? (a - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.run();
    }
  };

  const Kbd = ({ k }: { k: string }) => <kbd className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded border border-white/10 bg-white/[0.04] text-[10.5px] font-medium text-zinc-400 font-sans">{k}</kbd>;

  return (
    <div data-palette className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh] bg-black/60 backdrop-blur-[2px] pp-fade" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      {mode === "help" ? (
        <div role="dialog" aria-label="Keyboard shortcuts" tabIndex={-1} onKeyDown={(e) => e.key === "Escape" && close()} ref={(el) => el?.focus()} className="w-full max-w-[560px] rounded-xl border border-white/10 bg-[#141418] shadow-2xl outline-none overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Keyboard size={16} /> Keyboard shortcuts
            </h2>
            <button onClick={() => onMode("search")} className="text-xs text-zinc-500 hover:text-white">
              Open command palette
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 px-5 py-4 text-sm">
            <p className="sm:col-span-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">General</p>
            {[
              ["Command palette", [mod, "K"]],
              ["Search", ["/"]],
              ["This list", ["?"]],
              ["Close", ["Esc"]],
            ].map(([label, keys]) => (
              <div key={label as string} className="flex items-center justify-between py-1.5 text-zinc-300">
                <span>{label}</span>
                <span className="flex gap-1">{(keys as string[]).map((k) => <Kbd key={k} k={k} />)}</span>
              </div>
            ))}
            <p className="sm:col-span-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mt-3 mb-1">Go to (press G, then the letter)</p>
            {PAGES.filter((p) => p.key).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1.5 text-zinc-300">
                <span>{p.label}</span>
                <span className="flex gap-1">
                  <Kbd k="G" />
                  <Kbd k={p.key!.toUpperCase()} />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div role="dialog" aria-label="Command palette" className="w-full max-w-[620px] rounded-xl border border-white/10 bg-[#141418] shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 border-b border-white/[0.06]">
            <MagnifyingGlass size={17} className="text-zinc-500 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search tasks, docs and pages, or type a command…"
              className="flex-1 h-12 bg-transparent text-[15px] text-white placeholder:text-zinc-600 outline-none"
              role="combobox"
              aria-expanded
              aria-controls="pp-palette-list"
              aria-activedescendant={items[active] ? `pp-cmd-${items[active].id}` : undefined}
            />
            <Kbd k="Esc" />
          </div>
          <div ref={listRef} id="pp-palette-list" role="listbox" className="max-h-[min(60vh,440px)] overflow-y-auto p-2">
            {items.length === 0 && <p className="px-3 py-8 text-center text-sm text-zinc-500">No matches for “{query}”.</p>}
            {items.map((it, i) => (
              <div key={it.id}>
                {(i === 0 || items[i - 1].group !== it.group) && <p className="px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{it.group}</p>}
                <button
                  id={`pp-cmd-${it.id}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => i !== active && setActive(i)}
                  onClick={it.run}
                  className={`w-full flex items-center gap-3 px-3 h-10 rounded-lg text-left text-sm transition-colors ${i === active ? "bg-white/[0.07] text-white" : "text-zinc-300"}`}
                >
                  <it.icon size={17} weight={i === active ? "duotone" : "regular"} className={i === active ? "text-[#c8ff00]" : "text-zinc-500"} />
                  <span className="truncate">{it.label}</span>
                  {it.sub && <span className="text-xs text-zinc-500 truncate">{it.sub}</span>}
                  <span className="ml-auto flex gap-1 shrink-0">{it.keys?.map((k) => <Kbd key={k} k={k} />)}</span>
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 px-4 h-9 border-t border-white/[0.06] text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <ArrowsDownUp size={12} /> Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowElbowDownLeft size={12} /> Open
            </span>
            <button onClick={() => onMode("help")} className="ml-auto hover:text-zinc-200">
              <Kbd k="?" /> Shortcuts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
