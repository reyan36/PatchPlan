"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowClockwise, BellRinging, ShieldCheck, ShieldWarning } from "@phosphor-icons/react";
import { useAuth } from "@/lib/AuthContext";
import { Login } from "@/components/auth/LazyLogin";
import { PageLoader } from "@/components/ui/PageLoader";
import { Button, ErrorNote, Panel } from "@/features/ai/ui";
import { postWithAuth } from "@/lib/api";
import { auth } from "@/lib/firebase-app";

type Severity = "info" | "warn" | "high";
type Event = { id: string; type: string; label: string; severity: Severity; detail: string; at: number; ip: string; country: string; path: string; uid: string; email: string; dropped: number };
type Usage = { llm: number; search: number; tokensIn: number; tokensOut: number };
type AIBudget = { today: Usage; month: Usage; limits: { llmDay: number; llmMonth: number; searchDay: number; searchMonth: number }; paused: boolean };
type Data = { events: Event[]; alerts: { email: boolean; webhook: boolean; recipients: number }; ai: AIBudget | null };

const DAY = 86400000;
const TONE: Record<Severity, string> = {
  high: "bg-red-500/10 text-red-300 border-red-500/25",
  warn: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  info: "bg-white/[0.04] text-zinc-400 border-white/10",
};
const fmt = (ms: number) => new Date(ms).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

async function getEvents(): Promise<Data> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/admin/security", { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export default function SecurityAdminPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [denied, setDenied] = useState<string | null>(null);
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    getEvents()
      .then((d) => {
        setData(d);
        setDenied(null);
      })
      .catch((e) => setDenied(e instanceof Error ? e.message : "Not allowed."));
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const stats = useMemo(() => {
    const day = (data?.events || []).filter((e) => e.at > Date.now() - DAY);
    const count = (s: Severity) => day.filter((e) => e.severity === s).reduce((n, e) => n + 1 + e.dropped, 0);
    const ips = new Map<string, { n: number; country: string; types: Set<string> }>();
    for (const e of day) {
      if (e.severity === "info") continue;
      const row = ips.get(e.ip) || { n: 0, country: e.country, types: new Set<string>() };
      row.n += 1 + e.dropped;
      row.types.add(e.label);
      ips.set(e.ip, row);
    }
    return {
      high: count("high"),
      warn: count("warn"),
      info: count("info"),
      topIps: Array.from(ips.entries()).sort((a, b) => b[1].n - a[1].n).slice(0, 6),
    };
  }, [data]);

  if (loading) return <PageLoader label="Loading" />;
  if (!user) return <Login />;
  if (denied) {
    return (
      <Panel className="max-w-lg mx-auto mt-10 p-6 text-center space-y-2">
        <ShieldCheck size={26} weight="duotone" className="mx-auto text-zinc-500" />
        <p className="text-white font-medium">Security log</p>
        <p className="text-sm text-zinc-400">{denied}</p>
      </Panel>
    );
  }
  if (!data) return <PageLoader label="Loading security log" />;

  const events = data.events.filter((e) => filter === "all" || e.severity === filter);
  const calm = stats.high === 0 && stats.warn < 5;

  const testAlert = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { sent } = await postWithAuth<{ sent: string[] }>("/api/admin/security", { action: "test" });
      if (sent.length) setNotice(`Test alert sent by ${sent.join(" and ")}. Check your inbox${sent.includes("webhook") ? " and Discord" : ""}.`);
      else setError("The alert couldn't be delivered. Check RESEND_API_KEY, EMAIL_FROM_ADDRESS and ADMIN_EMAILS (or SECURITY_WEBHOOK_URL) on Vercel.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck size={26} weight="duotone" /> Security
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Suspicious requests, blocked attempts and admin actions from the last 7 days. Events older than 30 days are deleted.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={load}>
            <ArrowClockwise size={13} /> Refresh
          </Button>
          <Button onClick={testAlert} loading={busy}>
            <BellRinging size={13} /> Send test alert
          </Button>
        </div>
      </header>

      <ErrorNote message={error} />
      {notice && <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{notice}</div>}

      <Panel className={`p-5 flex items-start gap-3 ${calm ? "" : "border-amber-500/30"}`}>
        {calm ? <ShieldCheck size={22} weight="duotone" className="text-emerald-400 shrink-0" /> : <ShieldWarning size={22} weight="duotone" className="text-amber-400 shrink-0" />}
        <div className="text-sm space-y-1">
          <p className="text-white font-medium">{calm ? "All quiet in the last 24 hours" : "Unusual activity in the last 24 hours"}</p>
          <p className="text-zinc-400 text-xs">
            Alerts:{" "}
            <span className={data.alerts.email ? "text-emerald-300" : "text-red-300"}>
              email {data.alerts.email ? `on (${data.alerts.recipients} recipient${data.alerts.recipients === 1 ? "" : "s"})` : "off"}
            </span>
            {" · "}
            <span className={data.alerts.webhook ? "text-emerald-300" : "text-zinc-500"}>Discord {data.alerts.webhook ? "on" : "off"}</span>. High-severity events alert immediately; 20+ suspicious requests in 10 minutes alert as an attack.
          </p>
        </div>
      </Panel>

      {data.ai && <AIUsage ai={data.ai} />}

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ["high", "High", "Admin probes"],
            ["warn", "Suspicious", "Bad tokens, blocked access, rate limits"],
            ["info", "Audit", "Admin and owner actions"],
          ] as const
        ).map(([k, label, hint]) => (
          <button key={k} onClick={() => setFilter(filter === k ? "all" : k)} className={`text-left rounded-xl border p-4 transition-colors ${filter === k ? "border-white/30 bg-white/[0.05]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"}`}>
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label} · 24h</p>
            <p className={`text-2xl font-semibold mt-1 ${k === "high" && stats[k] ? "text-red-300" : k === "warn" && stats[k] ? "text-amber-300" : "text-white"}`}>{stats[k]}</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">{hint}</p>
          </button>
        ))}
      </div>

      {stats.topIps.length > 0 && (
        <Panel className="p-5">
          <p className="text-sm font-semibold text-white mb-3">Most active addresses · 24h</p>
          <ul className="divide-y divide-white/[0.06] text-xs">
            {stats.topIps.map(([ip, r]) => (
              <li key={ip} className="py-2 flex items-center gap-3">
                <code className="text-zinc-200 w-40 shrink-0 truncate">{ip}</code>
                <span className="text-zinc-500 w-8">{r.country}</span>
                <span className="text-zinc-400 flex-1 truncate">{Array.from(r.types).join(", ")}</span>
                <span className="text-white font-medium">{r.n}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-zinc-600 mt-3">To block an address: Vercel → your project → Firewall → add a rule that denies that IP.</p>
        </Panel>
      )}

      <Panel className="overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Events {filter !== "all" && <span className="text-zinc-500 font-normal">· {filter}</span>}</p>
          {filter !== "all" && (
            <button onClick={() => setFilter("all")} className="text-xs text-zinc-500 hover:text-white">
              Show all
            </button>
          )}
        </div>
        {events.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-500 text-center">Nothing logged{filter !== "all" ? " at this level" : ""} in the last 7 days.</p>
        ) : (
          <ol className="divide-y divide-white/[0.06]">
            {events.map((e) => (
              <li key={e.id} className="px-5 py-3 text-xs space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${TONE[e.severity]}`}>{e.severity}</span>
                  <span className="text-white font-medium">{e.label}</span>
                  {e.dropped > 0 && <span className="text-amber-300">+{e.dropped} more not logged</span>}
                  <span className="ml-auto text-zinc-500">{fmt(e.at)}</span>
                </div>
                <p className="text-zinc-300 break-words">{e.detail}</p>
                <p className="text-zinc-500 break-all">
                  {[e.email || e.uid, e.ip, e.country, e.path].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}

/** Shared AI spending caps (lib/ai/budget.ts): Nebius calls and Tavily searches, today and this month. */
function AIUsage({ ai }: { ai: AIBudget }) {
  const rows = [
    { label: "Nebius AI calls", today: ai.today.llm, dayMax: ai.limits.llmDay, month: ai.month.llm, monthMax: ai.limits.llmMonth },
    { label: "Tavily searches", today: ai.today.search, dayMax: ai.limits.searchDay, month: ai.month.search, monthMax: ai.limits.searchMonth },
  ];
  const k = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-white">AI usage</p>
        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ai.paused ? "border-amber-500/30 text-amber-300 bg-amber-500/10" : "border-emerald-500/25 text-emerald-300 bg-emerald-500/10"}`}>
          {ai.paused ? "Paused (AI_DISABLED)" : "On"}
        </span>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {rows.map((r) => {
          const pct = Math.min(100, Math.round((r.month / r.monthMax) * 100));
          return (
            <div key={r.label}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-zinc-300">{r.label}</span>
                <span className="text-zinc-500">
                  today {r.today}/{r.dayMax} · month {r.month}/{r.monthMax}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className={`h-full rounded-full ${pct >= 80 ? "bg-amber-400" : "bg-[#c8ff00]/80"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-zinc-600 mt-4">
        Tokens this month: {k(ai.month.tokensIn)} in · {k(ai.month.tokensOut)} out. Limits reset daily and monthly (UTC); change them with AI_GLOBAL_DAILY_LIMIT, AI_GLOBAL_MONTHLY_LIMIT, TAVILY_DAILY_LIMIT and TAVILY_MONTHLY_LIMIT on Vercel.
      </p>
    </Panel>
  );
}
