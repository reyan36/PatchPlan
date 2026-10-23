"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowClockwise, Bug, Flask, Gear, Users } from "@phosphor-icons/react";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { Login } from "@/components/auth/LazyLogin";
import { PageLoader } from "@/components/ui/PageLoader";
import { ErrorNote } from "@/features/ai/ui";
import { betaApi } from "@/lib/beta/client";
import type { Report, Tester } from "@/lib/beta/types";
import { ReportsPanel } from "@/features/beta/owner/ReportsPanel";
import { TestersPanel } from "@/features/beta/owner/TestersPanel";
import { BetaSettingsPanel, type BetaSettings } from "@/features/beta/owner/BetaSettingsPanel";

const TABS = [
  { key: "reports", label: "Reports", icon: Bug },
  { key: "testers", label: "Testers", icon: Users },
  { key: "settings", label: "Settings", icon: Gear },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export type Dashboard = { testers: Tester[]; reports: Report[]; settings: BetaSettings };

export default function BetaPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeFamily, loading: familyLoading } = useFamily();
  const scopeId = activeFamily?.id || user?.uid || "";
  const [tab, setTab] = useState<TabKey>("reports");
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openReport, setOpenReport] = useState<string | null>(null);

  // Deep links: /beta?tab=testers, /beta?report=<id> (from board tasks).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("tab") as TabKey | null;
    if (t && TABS.some((x) => x.key === t)) setTab(t);
    if (p.get("report")) setOpenReport(p.get("report"));
  }, []);

  // One request loads the page; actions update it locally instead of refetching.
  const load = useCallback(async () => {
    if (!scopeId) return;
    setRefreshing(true);
    setError(null);
    try {
      setData(await betaApi<Dashboard>("GET", { scopeId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the beta program.");
    } finally {
      setRefreshing(false);
    }
  }, [scopeId]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      reports: data?.reports.filter((r) => r.status === "new").length || 0,
      testers: data?.testers.filter((t) => t.status === "pending").length || 0,
    }),
    [data]
  );

  if (authLoading || familyLoading) return <PageLoader label="Loading beta" />;
  if (!user) return <Login />;

  const select = (t: TabKey) => {
    setTab(t);
    window.history.replaceState(null, "", `/beta?tab=${t}`);
  };

  const patchReport = (id: string, patch: Partial<Report> | null) =>
    setData((d) => d && { ...d, reports: patch ? d.reports.map((r) => (r.id === id ? { ...r, ...patch } : r)) : d.reports.filter((r) => r.id !== id) });
  const patchTester = (uid: string, patch: Partial<Tester>) => setData((d) => d && { ...d, testers: d.testers.map((t) => (t.uid === uid ? { ...t, ...patch } : t)) });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Flask size={26} weight="duotone" /> Beta
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Approve beta testers, then review the issues they report and turn them into board tasks.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button onClick={load} disabled={refreshing} title="Refresh" className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-40 transition-colors">
            <ArrowClockwise size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
          <div className="flex gap-1 p-1 rounded-lg border border-white/10 bg-white/[0.02] overflow-x-auto max-w-full">
            {TABS.map((t) => {
              const n = t.key === "reports" ? counts.reports : t.key === "testers" ? counts.testers : 0;
              return (
                <button
                  key={t.key}
                  onClick={() => select(t.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${tab === t.key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"}`}
                >
                  <t.icon size={14} weight={tab === t.key ? "duotone" : "regular"} />
                  {t.label}
                  {n > 0 && <span className="ml-0.5 min-w-[18px] px-1 rounded-full bg-[#c8ff00] text-black text-[10px] font-bold leading-[16px] text-center">{n}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <ErrorNote message={error} />

      {!data ? (
        error ? null : <PageLoader label="Loading beta program" />
      ) : tab === "reports" ? (
        <ReportsPanel
          scopeId={scopeId}
          reports={data.reports}
          programOpen={data.settings.open}
          hasTesters={data.testers.some((t) => t.status === "approved")}
          openId={openReport}
          setOpenId={setOpenReport}
          onPatch={patchReport}
          goTo={select}
        />
      ) : tab === "testers" ? (
        <TestersPanel
          scopeId={scopeId}
          slug={data.settings.slug}
          testers={data.testers}
          onPatch={patchTester}
          onPurged={(uid) => setData((d) => d && { ...d, testers: d.testers.filter((t) => t.uid !== uid), reports: d.reports.filter((r) => r.testerUid !== uid) })}
          goTo={select}
        />
      ) : (
        <BetaSettingsPanel scopeId={scopeId} settings={data.settings} onSaved={(s) => setData((d) => d && { ...d, settings: s })} />
      )}
    </div>
  );
}
