"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowSquareOut, CalendarPlus, PencilSimple, Play, Stop, Trash, Wrench } from "@phosphor-icons/react";
import { useAuth } from "@/lib/AuthContext";
import { Login } from "@/components/auth/LazyLogin";
import { PageLoader } from "@/components/ui/PageLoader";
import { Button, ErrorNote, Panel, inputClass } from "@/features/ai/ui";
import { postWithAuth } from "@/lib/api";
import { auth } from "@/lib/firebase-app";
import type { Maintenance } from "@/lib/status/types";

type Data = { windows: Maintenance[]; components: { id: string; name: string }[] };
type Form = { id?: string; title: string; description: string; components: string[]; start: string; end: string };

const DURATIONS = [
  { label: "30 min", min: 30 },
  { label: "1 hour", min: 60 },
  { label: "2 hours", min: 120 },
  { label: "4 hours", min: 240 },
];

/** ms → value for <input type="datetime-local"> in the viewer's time zone. */
const toLocalInput = (ms: number) => {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).getTime() : NaN);
const fmt = (ms: number) => new Date(ms).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const span = (ms: number) => {
  const m = Math.round(ms / 60000);
  return m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`;
};
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function blankForm(): Form {
  // Default: tomorrow 02:00 local time, one hour.
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(2, 0, 0, 0);
  return { title: "Scheduled maintenance", description: "", components: [], start: toLocalInput(d.getTime()), end: toLocalInput(d.getTime() + 3600000) };
}

async function getWindows(): Promise<Data> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/admin/maintenance", { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export default function MaintenanceAdminPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [denied, setDenied] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(blankForm);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    getWindows()
      .then((d) => {
        setData(d);
        setDenied(null);
      })
      .catch((e) => setDenied(e instanceof Error ? e.message : "Not allowed."));
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const groups = useMemo(() => {
    const w = data?.windows || [];
    return {
      in_progress: w.filter((x) => x.phase === "in_progress"),
      upcoming: w.filter((x) => x.phase === "upcoming").sort((a, b) => a.start - b.start),
      completed: w.filter((x) => x.phase === "completed"),
    };
  }, [data]);

  if (loading) return <PageLoader label="Loading" />;
  if (!user) return <Login />;

  if (denied) {
    return (
      <Panel className="max-w-lg mx-auto mt-10 p-6 text-center space-y-2">
        <Wrench size={26} weight="duotone" className="mx-auto text-zinc-500" />
        <p className="text-white font-medium">Maintenance controls</p>
        <p className="text-sm text-zinc-400">{denied}</p>
      </Panel>
    );
  }
  if (!data) return <PageLoader label="Loading maintenance" />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const startMs = fromLocalInput(form.start);
  const endMs = fromLocalInput(form.end);
  const valid = form.title.trim() && Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;

  const act = async (key: string, body: Record<string, unknown>, done: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await postWithAuth("/api/admin/maintenance", body);
      setNotice(`${done} The status page updates within a minute.`);
      load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const ok = await act(
      "save",
      { action: form.id ? "update" : "create", id: form.id, title: form.title, description: form.description, components: form.components, start: startMs, end: endMs },
      form.id ? "Maintenance updated." : "Maintenance scheduled."
    );
    if (ok) setForm(blankForm());
  };

  const edit = (w: Maintenance) => {
    setForm({ id: w.id, title: w.title, description: w.description, components: w.components, start: toLocalInput(w.start), end: toLocalInput(w.end) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const names = (ids: string[]) => (ids.length ? ids.map((id) => data.components.find((c) => c.id === id)?.name || id).join(", ") : "Whole platform");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Wrench size={26} weight="duotone" /> Maintenance
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Schedule maintenance windows. They show on the public status page and as a banner inside the app.</p>
        </div>
        <Link href="/status?tab=maintenance" target="_blank" className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-white/10 text-zinc-300 hover:text-white">
          <ArrowSquareOut size={13} /> View status page
        </Link>
      </header>

      <ErrorNote message={error} />
      {notice && <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{notice}</div>}

      <Panel className="p-5">
        <form onSubmit={submit} className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <CalendarPlus size={16} /> {form.id ? "Edit window" : "Schedule a window"}
            </p>
            {form.id && (
              <button type="button" onClick={() => setForm(blankForm())} className="text-xs text-zinc-500 hover:text-white">
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Title</label>
              <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={120} placeholder="Database upgrade" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Affects</label>
              <div className="flex flex-wrap gap-1.5">
                {data.components.map((c) => {
                  const on = form.components.includes(c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => set("components", on ? form.components.filter((x) => x !== c.id) : [...form.components, c.id])}
                      className={`px-2.5 py-1 rounded-md border text-xs ${on ? "border-sky-500/40 bg-sky-500/10 text-sky-200" : "border-white/10 text-zinc-400 hover:text-zinc-200"}`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-zinc-600 mt-1">Pick none for the whole platform.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">What players and studios should know (optional)</label>
            <textarea className={`${inputClass} min-h-[70px]`} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} placeholder="We're upgrading the database. Boards may be read-only for a few minutes." />
          </div>

          <div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Starts</label>
              <input type="datetime-local" className={inputClass} value={form.start} onChange={(e) => set("start", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Ends</label>
              <input type="datetime-local" className={inputClass} value={form.end} onChange={(e) => set("end", e.target.value)} />
            </div>
            <div className="flex gap-1">
              {DURATIONS.map((d) => (
                <button
                  type="button"
                  key={d.min}
                  onClick={() => Number.isFinite(startMs) && set("end", toLocalInput(startMs + d.min * 60000))}
                  className="px-2 py-2 rounded-md border border-white/10 text-[11px] text-zinc-400 hover:text-white whitespace-nowrap"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              {valid ? (
                <>
                  {fmt(startMs)} → {fmt(endMs)} · {span(endMs - startMs)} · <span className="text-zinc-400">your time ({zone})</span>
                </>
              ) : (
                "Pick a start and an end after it."
              )}
            </p>
            <Button type="submit" loading={busy === "save"} disabled={!valid || !!busy}>
              {form.id ? "Save changes" : "Schedule"}
            </Button>
          </div>
        </form>
      </Panel>

      {(["in_progress", "upcoming", "completed"] as const).map((key) => {
        const list = groups[key];
        if (!list.length) return null;
        return (
          <section key={key} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{key === "in_progress" ? "In progress" : key === "upcoming" ? "Upcoming" : "Past"}</h2>
            <Panel className="divide-y divide-white/[0.06]">
              {list.map((w) => (
                <div key={w.id} className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white flex items-center gap-2">
                      {key === "in_progress" && <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />}
                      {w.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {fmt(w.start)} → {fmt(w.end)} · {span(w.end - w.start)} · {names(w.components)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {key === "upcoming" && (
                      <Button variant="ghost" onClick={() => act(`start-${w.id}`, { action: "end-now", which: "start", id: w.id }, "Maintenance started.")} loading={busy === `start-${w.id}`} disabled={!!busy}>
                        <Play size={12} /> Start now
                      </Button>
                    )}
                    {key === "in_progress" && (
                      <Button variant="ghost" onClick={() => act(`end-${w.id}`, { action: "end-now", id: w.id }, "Maintenance ended.")} loading={busy === `end-${w.id}`} disabled={!!busy}>
                        <Stop size={12} /> End now
                      </Button>
                    )}
                    {key !== "completed" && (
                      <Button variant="ghost" onClick={() => edit(w)} disabled={!!busy}>
                        <PencilSimple size={12} /> Edit
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      onClick={() => window.confirm(`Delete "${w.title}"?`) && act(`del-${w.id}`, { action: "delete", id: w.id }, "Deleted.")}
                      loading={busy === `del-${w.id}`}
                      disabled={!!busy}
                    >
                      <Trash size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </Panel>
          </section>
        );
      })}

      {!data.windows.length && <p className="text-sm text-zinc-500">Nothing scheduled yet.</p>}
    </div>
  );
}
