"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { CaretDown, ChatCircleText, CircleNotch } from "@phosphor-icons/react";
import { db } from "@/lib/firebase";
import { CATEGORIES, REPORT_STATUS, SEVERITIES, type Report } from "@/lib/beta/types";
import { timeAgo, toMillis } from "@/lib/beta/client";

export function MyReports({ reports }: { reports: Report[] | null }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!reports) {
    return (
      <div className="flex justify-center py-12 text-[var(--pp-muted)]">
        <CircleNotch size={20} className="animate-spin" />
      </div>
    );
  }
  if (!reports.length) {
    return <p className="rounded-2xl border border-[var(--pp-border)] p-8 text-center text-sm text-[var(--pp-muted)]">No reports yet. Anything you send shows up here with its status.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {reports.map((r) => (
        <li key={r.id} className="rounded-2xl border border-[var(--pp-border)] bg-[var(--pp-surface)]">
          <button onClick={() => setOpenId(openId === r.id ? null : r.id)} className="w-full flex items-start gap-3 p-4 text-left">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{r.title}</p>
              <p className="mt-0.5 text-xs text-[var(--pp-muted)]">
                {CATEGORIES.find((c) => c.key === r.category)?.label} · {SEVERITIES.find((s) => s.key === r.severity)?.label} · {timeAgo(toMillis(r.createdAt))}
              </p>
              {r.reply && (
                <p className="mt-2 flex items-start gap-1.5 text-sm">
                  <ChatCircleText size={15} className="text-[var(--pp-accent)] shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{r.reply}</span>
                </p>
              )}
            </div>
            <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${REPORT_STATUS[r.status]?.tone || ""}`}>{REPORT_STATUS[r.status]?.label || r.status}</span>
            <CaretDown size={14} className={`shrink-0 mt-1 text-[var(--pp-muted)] transition-transform ${openId === r.id ? "rotate-180" : ""}`} />
          </button>
          {openId === r.id && <Details report={r} />}
        </li>
      ))}
    </ul>
  );
}

function Details({ report: r }: { report: Report }) {
  return (
    <div className="border-t border-[var(--pp-border)] px-4 py-4 space-y-3 text-sm">
      <Field label="What happened" value={r.description} />
      <Field label="Steps" value={r.steps} />
      <Field label="Expected" value={r.expected} />
      {(r.platform || r.build) && <p className="text-xs text-[var(--pp-muted)]">{[r.platform, r.build && `Build ${r.build}`].filter(Boolean).join(" · ")}</p>}
      {r.videoUrl && (
        <a href={r.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--pp-accent)] underline break-all">
          {r.videoUrl}
        </a>
      )}
      {r.files?.length ? <Screenshots ids={r.files.map((f) => f.id)} /> : null}
      {r.reply && <Field label="Reply from the team" value={r.reply} />}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-[var(--pp-muted)]">{label}</p>
      <p className="mt-0.5 whitespace-pre-line">{value}</p>
    </div>
  );
}

/** Loads the tester's own screenshots only when they expand a report. */
function Screenshots({ ids }: { ids: string[] }) {
  const [urls, setUrls] = useState<string[] | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all(ids.map((id) => getDoc(doc(db, "beta_files", id)).then((s) => String(s.data()?.data || "")).catch(() => ""))).then(
      (list) => live && setUrls(list.filter(Boolean))
    );
    return () => {
      live = false;
    };
  }, [ids.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!urls) return <CircleNotch size={16} className="animate-spin text-[var(--pp-muted)]" />;
  return (
    <div className="grid grid-cols-2 gap-2">
      {urls.map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={u} alt={`Screenshot ${i + 1}`} className="w-full rounded-lg border border-[var(--pp-border)] bg-black/20 object-contain max-h-64" />
      ))}
    </div>
  );
}
