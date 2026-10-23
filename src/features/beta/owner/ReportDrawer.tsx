"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowSquareOut, CircleNotch, Kanban, Trash, X } from "@phosphor-icons/react";
import { Button, ErrorNote, Pill, inputClass } from "@/features/ai/ui";
import { betaApi, timeAgo } from "@/lib/beta/client";
import { CATEGORIES, LIMITS, REPORT_STATUS, SEVERITIES, SEVERITY_TONE, type Report, type ReportStatus } from "@/lib/beta/types";

type Detail = { report: Report; images: { id: string; dataUrl: string }[] };

// Opened reports stay in memory for this visit, so reopening one doesn't call the server again.
const cache = new Map<string, Detail>();
function remember(id: string, d: Detail) {
  // Screenshots are large; keep only the last 20 opened reports.
  if (cache.size >= 20) cache.delete(cache.keys().next().value!);
  cache.set(id, d);
}

type Props = {
  scopeId: string;
  id: string;
  row: Report | null;
  onClose: () => void;
  onPatch: (id: string, patch: Partial<Report> | null) => void;
};

export function ReportDrawer({ scopeId, id, row, onClose, onPatch }: Props) {
  const [detail, setDetail] = useState<Detail | null>(cache.get(id) || null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setError(null);
    const hit = cache.get(id);
    if (hit) setDetail(hit);
    else {
      setDetail(null);
      betaApi<Detail>("GET", { scopeId, report: id })
        .then((d) => {
          remember(id, d);
          if (live) setDetail(d);
        })
        .catch((err) => live && setError(err instanceof Error ? err.message : "Couldn't open the report."));
    }
    return () => {
      live = false;
    };
  }, [id, scopeId]);

  // List row has the latest status/reply/task; the cached detail has the long fields.
  const r = detail ? { ...detail.report, ...(row || {}) } : row;
  useEffect(() => setReply(r?.reply || ""), [r?.id, r?.reply]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (zoom ? setZoom(null) : onClose());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, zoom]);

  const act = async (key: string, body: Record<string, unknown>, patch: Partial<Report> | null) => {
    setBusy(key);
    setError(null);
    try {
      const res = await betaApi<{ taskId?: string }>("POST", { scopeId, id, ...body });
      if (patch === null) {
        cache.delete(id);
        onPatch(id, null);
        onClose();
        return;
      }
      const next = { ...patch, ...(res.taskId ? { taskId: res.taskId, status: "in_progress" as ReportStatus } : {}) };
      onPatch(id, next);
      const c = cache.get(id);
      if (c) cache.set(id, { ...c, report: { ...c.report, ...next } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative w-full max-w-xl h-full overflow-y-auto bg-[#111114] border-l border-white/10 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10 bg-[#111114]/95 backdrop-blur">
          <p className="text-xs text-zinc-500">Beta report</p>
          <button onClick={onClose} className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06]" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {!r ? (
          <div className="p-6">{error ? <ErrorNote message={error} /> : <CircleNotch size={20} className="animate-spin text-zinc-500" />}</div>
        ) : (
          <div className="p-5 space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white leading-snug">{r.title}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${SEVERITY_TONE[r.severity]}`} /> {SEVERITIES.find((s) => s.key === r.severity)?.label}
                </span>
                <span>·</span>
                <span>{CATEGORIES.find((c) => c.key === r.category)?.label}</span>
                {r.platform && <><span>·</span><span>{r.platform}</span></>}
                {r.build && <><span>·</span><span>Build {r.build}</span></>}
              </div>
              <p className="text-xs text-zinc-500">
                From <span className="text-zinc-300">{r.testerName}</span> · {timeAgo(r.createdAt)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {r.taskId ? (
                <Link href={`/board?task=${r.taskId}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-white/10 text-zinc-200 hover:bg-white/[0.04]">
                  <Kanban size={13} /> Open task
                </Link>
              ) : (
                <Button onClick={() => act("task", { action: "task" }, {})} loading={busy === "task"} disabled={!!busy}>
                  <Kanban size={13} /> Create board task
                </Button>
              )}
              <select
                value={r.status}
                disabled={!!busy}
                onChange={(e) => act("status", { action: "report", status: e.target.value }, { status: e.target.value as ReportStatus })}
                className="bg-black/30 border border-white/10 rounded-md px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
              >
                {(Object.keys(REPORT_STATUS) as ReportStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {REPORT_STATUS[s].label}
                  </option>
                ))}
              </select>
              {busy === "status" && <CircleNotch size={14} className="animate-spin text-zinc-500" />}
              <Pill className={REPORT_STATUS[r.status]?.tone}>{REPORT_STATUS[r.status]?.label}</Pill>
            </div>
            <ErrorNote message={error} />

            {!detail ? (
              <CircleNotch size={18} className="animate-spin text-zinc-500" />
            ) : (
              <>
                <Section label="What happened" value={r.description} />
                <Section label="Steps to reproduce" value={r.steps} />
                <Section label="Expected" value={r.expected} />
                {r.videoUrl && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">Video</p>
                    <a href={r.videoUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm text-sky-300 hover:underline break-all">
                      {r.videoUrl} <ArrowSquareOut size={12} />
                    </a>
                  </div>
                )}
                {detail.images.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-2">Screenshots</p>
                    <div className="grid grid-cols-2 gap-2">
                      {detail.images.map((img) => (
                        <button key={img.id} onClick={() => setZoom(img.dataUrl)} className="rounded-lg overflow-hidden border border-white/10 bg-black/30 hover:border-white/25 transition-colors">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.dataUrl} alt="Screenshot" className="w-full h-32 object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {r.logs && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">Log</p>
                    <pre className="max-h-64 overflow-auto rounded-md border border-white/10 bg-black/40 p-3 text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-all">{r.logs}</pre>
                  </div>
                )}
              </>
            )}

            {/* Reply the tester sees on their reports list */}
            <div className="space-y-2 border-t border-white/10 pt-5">
              <p className="text-xs font-medium text-zinc-500">Reply to {r.testerName || "the tester"}</p>
              <textarea className={`${inputClass} min-h-[80px]`} maxLength={LIMITS.reply} placeholder="Thanks! Fixed in the next build." value={reply} onChange={(e) => setReply(e.target.value)} />
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => act("reply", { action: "report", reply }, { reply: reply.trim() })} loading={busy === "reply"} disabled={!!busy || reply.trim() === (r.reply || "")}>
                  Save reply
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (window.confirm("Delete this report and its screenshots? This can't be undone.")) act("delete", { action: "delete" }, null);
                  }}
                  loading={busy === "delete"}
                  disabled={!!busy}
                >
                  <Trash size={13} /> Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {zoom && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Screenshot" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

function Section({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
      <p className="text-sm text-zinc-200 whitespace-pre-line leading-relaxed">{value}</p>
    </div>
  );
}

