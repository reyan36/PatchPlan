"use client";

import { useEffect, useState } from "react";
import { Megaphone, MagnifyingGlass, Hammer, Sparkle } from "@phosphor-icons/react";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { Login } from "@/components/auth/Login";
import { getAIStatus, type AIStatus } from "@/lib/ai/client";
import dynamic from "next/dynamic";

// Each tab is its own chunk, so opening one tab doesn't download the others.
const PlayerSignal = dynamic(() => import("@/features/ai/PlayerSignal").then((m) => m.PlayerSignal), { loading: () => <div className="h-64 rounded-xl border border-white/10 bg-white/[0.02] animate-pulse" /> });
const SearchEverything = dynamic(() => import("@/features/ai/SearchEverything").then((m) => m.SearchEverything), { loading: () => <div className="h-64 rounded-xl border border-white/10 bg-white/[0.02] animate-pulse" /> });
const BuildAnything = dynamic(() => import("@/features/ai/BuildAnything").then((m) => m.BuildAnything), { loading: () => <div className="h-64 rounded-xl border border-white/10 bg-white/[0.02] animate-pulse" /> });
import { PageLoader } from "@/components/ui/PageLoader";

const TABS = [
  { key: "signal", label: "Player Signal", icon: Megaphone },
  { key: "search", label: "Search", icon: MagnifyingGlass },
  { key: "build", label: "Build", icon: Hammer },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AIPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeFamily, loading: familyLoading } = useFamily();
  const [tab, setTab] = useState<TabKey>("signal");
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [initialQuery, setInitialQuery] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (TABS.some((x) => x.key === t)) setTab(t as TabKey);
    setInitialQuery(new URLSearchParams(window.location.search).get("q") || "");
    getAIStatus().then(setStatus);
  }, []);

  const select = (t: TabKey) => {
    setTab(t);
    window.history.replaceState(null, "", `/ai?tab=${t}`);
  };

  if (authLoading || familyLoading) return <PageLoader label="Loading PatchPlan AI" />;
  if (!user) return <Login />;

  const familyId = activeFamily ? activeFamily.id : null;
  const enabled = !!status?.nebius;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkle size={24} weight="duotone" className="text-[#c8ff00]" /> PatchPlan AI
            <span className="ml-1 self-center px-1.5 py-0.5 rounded bg-[#c8ff00] text-[#0a0a0a] text-[10px] font-bold tracking-[0.08em]">NEBIUS</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Powered by NVIDIA Nemotron on Nebius{status && !enabled ? " · not configured on this server" : ""}.
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg border border-white/10 bg-white/[0.02] self-start">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => select(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t.key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              <t.icon size={14} weight={tab === t.key ? "duotone" : "regular"} />
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {tab === "signal" && <PlayerSignal user={user} familyId={familyId} status={status} />}
      {tab === "search" && <SearchEverything key={initialQuery} user={user} familyId={familyId} enabled={enabled} initialQuery={initialQuery} />}
      {tab === "build" && <BuildAnything user={user} familyId={familyId} enabled={enabled} />}
    </div>
  );
}
