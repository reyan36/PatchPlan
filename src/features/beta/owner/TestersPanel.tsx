"use client";

import { useState } from "react";
import { Check, DiscordLogo, X } from "@phosphor-icons/react";
import { Button, ErrorNote, Panel, Pill } from "@/features/ai/ui";
import { betaApi, timeAgo } from "@/lib/beta/client";
import type { Tester, TesterStatus } from "@/lib/beta/types";
import { CopyLink } from "./BetaSettingsPanel";

type Props = {
  scopeId: string;
  slug: string;
  testers: Tester[];
  onPatch: (uid: string, patch: Partial<Tester>) => void;
  onPurged: (uid: string) => void;
  goTo: (tab: "settings") => void;
};

export function TestersPanel({ scopeId, slug, testers, onPatch, onPurged, goTo }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const decide = async (t: Tester, status: TesterStatus) => {
    setBusy(`${t.uid}:${status}`);
    setError(null);
    setNotice(null);
    try {
      const res = await betaApi<{ emailed: boolean }>("POST", { action: "tester", scopeId, uid: t.uid, status, slug });
      onPatch(t.uid, { status, decidedAt: Date.now() });
      if (status === "approved") setNotice(res.emailed ? `${t.name} is in. We emailed them the beta link.` : `${t.name} is in. Send them the beta link so they can start reporting.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the tester.");
    } finally {
      setBusy(null);
    }
  };

  // Frees storage: deletes a denied/removed tester's record, reports and screenshots.
  const purge = async (t: Tester) => {
    if (!window.confirm(`Delete ${t.name} and all of their reports and screenshots? This can't be undone.`)) return;
    setBusy(`${t.uid}:purge`);
    setError(null);
    setNotice(null);
    try {
      const res = await betaApi<{ reports: number }>("POST", { action: "purge-tester", scopeId, uid: t.uid });
      onPurged(t.uid);
      setNotice(`Deleted ${t.name} and ${res.reports} report${res.reports === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete the tester's data.");
    } finally {
      setBusy(null);
    }
  };

  const pending = testers.filter((t) => t.status === "pending");
  const approved = testers.filter((t) => t.status === "approved");
  const past = testers.filter((t) => t.status === "denied" || t.status === "removed");

  if (!testers.length) {
    return (
      <Panel className="p-8 text-center space-y-3">
        <p className="text-white font-medium">No testers yet</p>
        <p className="text-sm text-zinc-500 max-w-md mx-auto">Share your beta page. People sign up there, and their requests show up here for you to approve.</p>
        <div className="max-w-lg mx-auto pt-2">
          <CopyLink slug={slug} />
        </div>
        <button onClick={() => goTo("settings")} className="text-xs text-zinc-400 hover:text-white underline">
          Beta settings
        </button>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <ErrorNote message={error} />
      {notice && <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{notice}</div>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Requests {pending.length > 0 && <span className="text-zinc-500 font-normal">· {pending.length}</span>}</h2>
        {pending.length ? (
          <div className="grid md:grid-cols-2 gap-3">
            {pending.map((t) => (
              <Panel key={t.uid} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{t.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{t.email}</p>
                  </div>
                  <span className="text-[11px] text-zinc-500 shrink-0">{timeAgo(t.createdAt)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {t.platforms.map((p) => (
                    <Pill key={p} className="border-white/10 text-zinc-300">
                      {p}
                    </Pill>
                  ))}
                </div>
                {(t.device || t.discord) && (
                  <p className="text-xs text-zinc-400 flex flex-wrap gap-x-3 gap-y-1">
                    {t.device && <span>{t.device}</span>}
                    {t.discord && (
                      <span className="inline-flex items-center gap-1">
                        <DiscordLogo size={12} /> {t.discord}
                      </span>
                    )}
                  </p>
                )}
                {t.note && <p className="text-sm text-zinc-300 whitespace-pre-line line-clamp-4">{t.note}</p>}
                <div className="flex gap-2 pt-1">
                  <Button onClick={() => decide(t, "approved")} loading={busy === `${t.uid}:approved`} disabled={!!busy}>
                    <Check size={13} weight="bold" /> Approve
                  </Button>
                  <Button variant="ghost" onClick={() => decide(t, "denied")} loading={busy === `${t.uid}:denied`} disabled={!!busy}>
                    <X size={13} /> Deny
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No requests waiting.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Approved testers <span className="text-zinc-500 font-normal">· {approved.length}</span></h2>
        {approved.length ? (
          <Panel className="divide-y divide-white/5">
            {approved.map((t) => (
              <div key={t.uid} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{t.name}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {t.email} · {t.platforms.join(", ")}
                  </p>
                </div>
                <span className="text-xs text-zinc-400 shrink-0">
                  {t.reports || 0} report{t.reports === 1 ? "" : "s"}
                </span>
                <Button variant="danger" onClick={() => decide(t, "removed")} loading={busy === `${t.uid}:removed`} disabled={!!busy}>
                  Remove
                </Button>
              </div>
            ))}
          </Panel>
        ) : (
          <p className="text-sm text-zinc-500">Nobody approved yet.</p>
        )}
      </section>

      {past.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-300">Denied or removed · {past.length}</summary>
          <Panel className="mt-3 divide-y divide-white/5">
            {past.map((t) => (
              <div key={t.uid} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-300 truncate">{t.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{t.email}</p>
                </div>
                <span className="text-xs text-zinc-500 capitalize">{t.status}</span>
                <Button variant="ghost" onClick={() => decide(t, "approved")} loading={busy === `${t.uid}:approved`} disabled={!!busy}>
                  Approve
                </Button>
                <Button variant="danger" onClick={() => purge(t)} loading={busy === `${t.uid}:purge`} disabled={!!busy}>
                  Delete data
                </Button>
              </div>
            ))}
          </Panel>
        </details>
      )}
    </div>
  );
}
