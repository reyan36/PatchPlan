"use client";

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  SquaresFour,
  Lightbulb,
  Compass,
  Newspaper,
  Kanban,
  Users,
  ShareNetwork,
  Bell,
  Gear,
  SignOut,
  Buildings,
  User as UserIcon,
  Sparkle,
  EnvelopeSimple,
  CaretDown,
  Play,
  Flask,
} from '@phosphor-icons/react';
import { useAuth } from '@/lib/AuthContext';
import { useDirty } from '@/lib/DirtyContext';
import { useFamily } from '@/lib/FamilyContext';
import { Logo } from "@/components/ui/Logo";
import { assignedTasks, useLiveQuery } from "@/lib/live";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { handleNavigation } = useDirty();
  const { activeFamily } = useFamily();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Same listener as the Inbox page (shared), and Firestore loads only once someone is signed in.
  const assigned = user ? assignedTasks(user.uid) : null;
  const myTasks = useLiveQuery<{ column?: string }>(assigned?.key ?? null, (fs) => assigned!.build(fs));
  const pendingTasksCount = (myTasks.data ?? []).filter((t) => t.column !== "Done").length;

  // Close the account menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (pathname?.startsWith('/p/')) return null;

  // Teams lives in the workspace pill; Settings and Sign out live in the account menu.
  const navItems = [
    { name: 'Dashboard', href: '/', icon: SquaresFour, active: pathname === '/' },
    { name: 'Ideas', href: '/ideas', icon: Lightbulb, active: pathname?.startsWith('/ideas') },
    { name: 'Roadmap', href: '/roadmap', icon: Compass, active: pathname?.startsWith('/roadmap') },
    { name: 'News', href: '/news', icon: Newspaper, active: pathname?.startsWith('/news') },
    { name: 'Board', href: '/board', icon: Kanban, active: pathname?.startsWith('/board') },
    { name: 'Beta', href: '/beta', icon: Flask, active: pathname?.startsWith('/beta') },
    { name: 'AI', href: '/ai', icon: Sparkle, active: pathname?.startsWith('/ai') || pathname?.startsWith('/modules') },
    { name: 'Email', href: '/email', icon: EnvelopeSimple, active: pathname?.startsWith('/email') },
    { name: 'Network', href: '/marketing', icon: ShareNetwork, active: pathname?.startsWith('/marketing') },
  ];

  const go = (href: string) => {
    setMenuOpen(false);
    handleNavigation(href);
  };

  const initial = (user?.displayName || user?.email || "?").trim()[0]?.toUpperCase();
  const inboxActive = pathname?.startsWith('/inbox');

  return (
    <nav className="border-b border-border/60 bg-background/95 backdrop-blur-md sticky top-0 z-30">
      <div className="container mx-auto px-4 h-14 flex items-center gap-3">
        {/* Logo + workspace */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleNavigation("/")}
            aria-label="PatchPlan home"
            title="PatchPlan"
            className="w-8 h-8 rounded-lg bg-white/[0.08] border border-white/10 inline-flex items-center justify-center overflow-hidden hover:scale-105 transition-transform"
          >
            <Logo size={18} />
          </button>

          <button
            data-tour="nav-teams"
            onClick={() => handleNavigation("/teams")}
            title={activeFamily ? `${activeFamily.name} · switch workspace` : "Personal workspace · switch workspace"}
            className={`hidden md:flex items-center gap-1.5 max-w-[160px] px-2 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider border transition-colors ${
              pathname?.startsWith('/teams')
                ? 'bg-white/[0.08] text-foreground border-white/15'
                : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted'
            }`}
          >
            {activeFamily ? <Buildings size={13} weight="duotone" className="shrink-0" /> : <UserIcon size={13} weight="duotone" className="shrink-0" />}
            <span className="truncate">{activeFamily ? activeFamily.name : "Personal"}</span>
          </button>
        </div>

        {user && (
          <>
            {/* Main nav */}
            <div className="flex-1 min-w-0 flex items-center justify-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
              {navItems.map(item => item.name === 'AI' ? (
                // Featured tab: PatchPlan AI runs on Nebius, so it gets its own accent and tag.
                <button
                  key={item.name}
                  data-tour="nav-ai"
                  title="PatchPlan AI · powered by Nebius"
                  onClick={() => handleNavigation(item.href)}
                  className={`shrink-0 flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 mx-1 rounded-md text-sm font-semibold border transition-all ${
                    item.active
                      ? 'border-[#c8ff00]/50 bg-[#c8ff00]/[0.12] text-[#c8ff00] shadow-[0_0_18px_rgba(200,255,0,0.15)]'
                      : 'border-[#c8ff00]/25 bg-[#c8ff00]/[0.05] text-[#d9ff4d] hover:border-[#c8ff00]/45 hover:bg-[#c8ff00]/[0.09]'
                  }`}
                >
                  <item.icon size={16} weight="fill" />
                  <span>AI</span>
                  <span className="ml-0.5 px-1 py-px rounded-[3px] bg-[#c8ff00] text-[#0a0a0a] text-[8.5px] font-bold tracking-[0.08em] leading-[12px]">
                    NEBIUS
                  </span>
                </button>
              ) : (
                <button
                  key={item.name}
                  data-tour={`nav-${item.name.toLowerCase()}`}
                  title={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                    item.active
                      ? 'bg-white/[0.08] text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <item.icon size={17} weight={item.active ? "duotone" : "regular"} />
                  <span className={item.active ? "hidden lg:inline" : "hidden xl:inline"}>{item.name}</span>
                </button>
              ))}
            </div>

            {/* Inbox + account */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleNavigation("/inbox")}
                title="Inbox"
                aria-label={`Inbox${pendingTasksCount ? `, ${pendingTasksCount} pending` : ""}`}
                className={`relative w-9 h-9 inline-flex items-center justify-center rounded-md transition-colors ${
                  inboxActive ? 'bg-white/[0.08] text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Bell size={18} weight={inboxActive ? "duotone" : "regular"} />
                {pendingTasksCount > 0 && (
                  <span className="absolute top-1 right-0.5 bg-amber-500 text-amber-950 text-[9px] font-bold px-1 rounded-full inline-flex items-center justify-center min-w-[15px] h-[15px]">
                    {pendingTasksCount > 99 ? '99+' : pendingTasksCount}
                  </span>
                )}
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  data-tour="nav-settings"
                  onClick={() => setMenuOpen(v => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  title="Account & settings"
                  className={`flex items-center gap-1 pl-1 pr-1.5 h-9 rounded-md transition-colors ${menuOpen || pathname?.startsWith('/settings') ? 'bg-white/[0.08]' : 'hover:bg-muted/50'}`}
                >
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full border border-white/10" />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/10 inline-flex items-center justify-center text-xs font-semibold text-foreground">{initial}</span>
                  )}
                  <CaretDown size={11} className="text-muted-foreground" />
                </button>

                {menuOpen && (
                  <div role="menu" className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-white/10 bg-[#141418] shadow-2xl p-1.5 pp-fade">
                    <div className="px-2.5 py-2 border-b border-white/[0.06] mb-1">
                      <div className="text-sm text-foreground truncate">{user.displayName || "Your account"}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>
                    <MenuItem icon={Gear} label="Settings" onClick={() => go("/settings")} />
                    <MenuItem icon={Users} label="Teams & workspaces" onClick={() => go("/teams")} />
                    <MenuItem icon={Play} label="Product tour" onClick={() => {
                      // Already on the dashboard: start it in place.
                      if (pathname === "/") { setMenuOpen(false); window.dispatchEvent(new Event("pp:start-tour")); }
                      else go("/?tour=1");
                    }} />
                    <div className="h-px bg-white/[0.06] my-1" />
                    <MenuItem icon={SignOut} label="Sign out" onClick={() => { setMenuOpen(false); logout(); }} danger />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Gear; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-left transition-colors ${
        danger ? 'text-muted-foreground hover:text-red-300 hover:bg-red-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.05]'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
