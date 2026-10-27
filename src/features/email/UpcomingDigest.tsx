"use client";

import { useEffect, useState } from "react";
import { deleteField, doc, setDoc, updateDoc } from "firebase/firestore";
import { CheckCircle, Newspaper, Prohibit } from "@phosphor-icons/react";
import { db } from "@/lib/firebase";
import { emailFetch } from "@/lib/email/client";
import { nextRun, runKey, type DigestKind } from "@/lib/email/schedule";
import type { EmailBlock, EmailSettings } from "@/lib/email/types";

const ms = (ts: any): number => (ts?.toMillis ? ts.toMillis() : typeof ts === "number" ? ts : 0);

/** "Today, 8:00 PM" / "Tomorrow, 8:00 PM" / "Fri, 8:00 PM" in the viewer's time zone. */
function when(t: number) {
  const d = new Date(t);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  return `${days === 0 ? "Today" : days === 1 ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}, ${time}`;
}

/**
 * The next scheduled digest: when it goes out, what it will contain (everything new since the last one,
 * merged into one email), and a way to cancel just that send.
 */
export function UpcomingDigest({ kind, scopeId, settings, subscribers }: { kind: DigestKind; scopeId: string; settings: EmailSettings; subscribers: number }) {
  const last = ms(kind === "weekly" ? settings.lastWeeklyAt : settings.lastDailyAt);
  const next = nextRun(kind, settings.weekly.day, last);
  const skipped = settings.skip?.[kind] === runKey(next);
  const [items, setItems] = useState<{ news: string[]; shipped: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setItems(null);
    emailFetch<{ blocks: EmailBlock[] }>("digest", { scopeId, kind, upcoming: true })
      .then(({ blocks }) => {
        if (!live) return;
        const news = blocks.flatMap((b) => (b.type === "articles" ? b.items.map((i) => i.title) : []));
        const shipped = blocks.flatMap((b) => (b.type === "changelog" ? b.items : []));
        setItems({ news, shipped });
      })
      .catch(() => live && setItems({ news: [], shipped: [] }));
    return () => {
      live = false;
    };
  }, [scopeId, kind, last]);

  const toggleSkip = async () => {
    setBusy(true);
    try {
      if (skipped) await updateDoc(doc(db, "email_settings", scopeId), { [`skip.${kind}`]: deleteField() });
      else await setDoc(doc(db, "email_settings", scopeId), { skip: { [kind]: runKey(next) } }, { merge: true });
    } finally {
      setBusy(false);
    }
  };

  const empty = items && !items.news.length && !items.shipped.length;
  const list = items ? [...items.news.map((t) => ({ t, news: true })), ...items.shipped.map((t) => ({ t, news: false }))] : [];

  return (
    <div className={`mt-2 rounded-lg border p-3 space-y-2 ${skipped ? "border-white/[0.06] bg-transparent" : "border-white/[0.08] bg-black/20"}`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={skipped ? "text-zinc-500 line-through" : "text-zinc-200"}>
          Next: {when(next)}
          {!skipped && !empty && items ? ` · ${subscribers} subscriber${subscribers === 1 ? "" : "s"}` : ""}
        </span>
        {(skipped || !empty) && (
          <button onClick={toggleSkip} disabled={busy} className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors disabled:opacity-50 ${skipped ? "text-zinc-200 hover:bg-white/[0.06]" : "text-zinc-400 hover:text-red-300 hover:bg-red-500/10"}`}>
            {skipped ? "Undo" : <><Prohibit size={12} /> Skip this one</>}
          </button>
        )}
      </div>

      {skipped ? (
        <p className="text-xs text-zinc-500">Cancelled. These updates won&apos;t be emailed; the next one starts fresh.</p>
      ) : !items ? (
        <p className="text-xs text-zinc-500">Checking what&apos;s new…</p>
      ) : empty ? (
        <p className="text-xs text-zinc-500">Nothing new yet. It&apos;s skipped automatically unless you publish news or finish a task.</p>
      ) : (
        <ul className="space-y-1">
          {list.slice(0, 4).map(({ t, news }, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-zinc-300 min-w-0">
              {news ? <Newspaper size={12} className="text-zinc-500 shrink-0" /> : <CheckCircle size={12} weight="fill" className="text-emerald-400/80 shrink-0" />}
              <span className="truncate">{t}</span>
            </li>
          ))}
          {list.length > 4 && <li className="text-xs text-zinc-500 pl-5">+{list.length - 4} more, all in one email</li>}
        </ul>
      )}
    </div>
  );
}
