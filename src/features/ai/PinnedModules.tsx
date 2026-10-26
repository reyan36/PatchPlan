"use client";

import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { ArrowUpRight, PushPin } from "@phosphor-icons/react";
import { db } from "@/lib/firebase";
import { moduleRows, personalOnly, scopeModules, useLiveQuery } from "@/lib/live";
import type { ModuleField, ModuleSchema } from "@/lib/ai/types";
import { MODULE_ICONS, SELECT_BARS, selectColor } from "./ModuleRenderer";

type PinnedModule = { schema: ModuleSchema; pinned?: boolean; familyId?: string | null };
type Row = { data: Record<string, unknown>; order?: number };

/** AI-built tools pinned to the dashboard, each with a live summary of its rows. Hidden when nothing is pinned. */
export function PinnedModules({ uid, familyId }: { uid: string; familyId: string | null }) {
  const source = scopeModules(uid, familyId);
  const pinned = personalOnly(useLiveQuery<PinnedModule>(source.key, source.build).data, familyId).filter((m) => m.pinned && m.schema);
  if (!pinned.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <PushPin size={18} weight="duotone" className="text-[#c8ff00]" /> Pinned tools
        </h2>
        <Link href="/ai?tab=build" className="text-xs text-muted-foreground hover:text-foreground">All tools</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {pinned.map((m) => (
          <PinnedCard key={m.id} id={m.id} schema={m.schema} uid={uid} familyId={familyId} />
        ))}
      </div>
    </section>
  );
}

function PinnedCard({ id, schema, uid, familyId }: { id: string; schema: ModuleSchema; uid: string; familyId: string | null }) {
  const source = moduleRows(id, uid, familyId);
  const live = useLiveQuery<Row>(source.key, source.build);
  return <PinnedCardView id={id} schema={schema} rows={live.data || []} ready={live.ready} />;
}

export function PinnedCardView({ id, schema, rows, ready }: { id: string; schema: ModuleSchema; rows: Row[]; ready: boolean }) {
  const Icon = MODULE_ICONS[schema.icon] || MODULE_ICONS.table;

  const titleField = schema.fields.find((f) => f.type === "text") || schema.fields[0];
  const statusField = schema.fields.find((f) => f.key === schema.groupBy && f.type === "select") || schema.fields.find((f) => f.type === "select");
  const recent = [...rows].sort((a, b) => (b.order ?? 0) - (a.order ?? 0)).slice(0, 3);

  return (
    <Link href={`/modules/${id}`} className="group relative flex flex-col gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-muted-foreground/40">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#c8ff00]/10 text-[#c8ff00]">
          <Icon size={20} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{schema.name}</div>
          <div className="truncate text-xs text-muted-foreground">{schema.description}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold leading-none tabular-nums">{ready ? rows.length : "–"}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{rows.length === 1 ? "row" : "rows"}</div>
        </div>
      </div>

      {rows.length > 0 && <Summary schema={schema} rows={rows} statusField={statusField} />}

      {recent.length > 0 ? (
        <ul className="divide-y divide-border/60 border-t border-border/60">
          {recent.map((r, i) => {
            const status = statusField ? String(r.data[statusField.key] ?? "") : "";
            return (
              <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="truncate">{String(r.data[titleField?.key] ?? "") || "Untitled"}</span>
                {status && statusField && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${selectColor(statusField, status)}`}>{status}</span>}
              </li>
            );
          })}
        </ul>
      ) : (
        ready && <p className="text-sm text-muted-foreground">No rows yet. Open it to add the first one.</p>
      )}

      <div className="absolute right-3 top-3 hidden items-center gap-1 rounded-md bg-card group-hover:flex">
        <button
          onClick={(e) => {
            e.preventDefault();
            updateDoc(doc(db, "modules", id), { pinned: false });
          }}
          title="Unpin from the dashboard"
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <PushPin size={14} weight="fill" />
        </button>
        <ArrowUpRight size={14} className="mr-1.5 text-muted-foreground" />
      </div>
    </Link>
  );
}

/** Status breakdown for a select column, else average progress, else checked count. */
function Summary({ schema, rows, statusField }: { schema: ModuleSchema; rows: Row[]; statusField?: ModuleField }) {
  if (statusField?.options?.length) {
    const counts = statusField.options.map((o, i) => ({ label: o, n: rows.filter((r) => r.data[statusField.key] === o).length, color: SELECT_BARS[i % SELECT_BARS.length] }));
    return (
      <div className="space-y-2">
        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
          {counts.map((c) => c.n > 0 && <div key={c.label} className={c.color} style={{ width: `${(c.n / rows.length) * 100}%` }} title={`${c.label}: ${c.n}`} />)}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {counts.map((c) => (
            <span key={c.label} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${c.color}`} /> {c.label} <span className="tabular-nums text-foreground">{c.n}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  const progress = schema.fields.find((f) => f.type === "progress");
  const check = schema.fields.find((f) => f.type === "checkbox");
  const pct = progress
    ? Math.round(rows.reduce((s, r) => s + (Number(r.data[progress.key]) || 0), 0) / rows.length)
    : check
      ? Math.round((rows.filter((r) => r.data[check.key]).length / rows.length) * 100)
      : null;
  if (pct === null) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{progress ? `Average ${progress.label.toLowerCase()}` : `${check!.label}`}</span>
        <span className="tabular-nums text-foreground">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-[#c8ff00]/80" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
