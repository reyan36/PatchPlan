"use client";

import { useState } from "react";
import {
  Table, Globe, Translate, Bug, Users, CalendarBlank, ChartBar, ListBullets, Flag, MusicNotes, Palette, Sword, Trophy, Megaphone, Cube,
  Plus, Trash,
} from "@phosphor-icons/react";
import type { ModuleField, ModuleSchema } from "@/lib/ai/types";

export const MODULE_ICONS: Record<string, typeof Table> = {
  table: Table, globe: Globe, translate: Translate, bug: Bug, users: Users, calendar: CalendarBlank, chart: ChartBar,
  list: ListBullets, flag: Flag, music: MusicNotes, palette: Palette, sword: Sword, trophy: Trophy, megaphone: Megaphone, cube: Cube,
};

export type ModuleRow = { id: string; data: Record<string, unknown> };

type Props = {
  schema: ModuleSchema;
  rows: ModuleRow[];
  onAdd: (data?: Record<string, unknown>) => void;
  onUpdate: (id: string, key: string, value: unknown) => void;
  onDelete: (id: string) => void;
};

export function emptyRow(schema: ModuleSchema): Record<string, unknown> {
  return Object.fromEntries(
    schema.fields.map((f) => [f.key, f.type === "number" || f.type === "progress" ? 0 : f.type === "checkbox" ? false : f.type === "select" ? f.options?.[0] ?? "" : ""])
  );
}

const SELECT_COLORS = ["bg-sky-500/15 text-sky-300", "bg-amber-500/15 text-amber-300", "bg-emerald-500/15 text-emerald-300", "bg-purple-500/15 text-purple-300", "bg-red-500/15 text-red-300", "bg-zinc-500/15 text-zinc-300"];

function selectColor(field: ModuleField, v: unknown) {
  const i = field.options?.indexOf(String(v)) ?? -1;
  return SELECT_COLORS[(i < 0 ? 5 : i) % SELECT_COLORS.length];
}

/** Inline editor for one cell, chosen by field type. */
function Cell({ field, value, onChange }: { field: ModuleField; value: unknown; onChange: (v: unknown) => void }) {
  const base = "w-full bg-transparent text-sm text-zinc-200 focus:outline-none focus:bg-white/[0.04] rounded px-1.5 py-1";
  switch (field.type) {
    case "checkbox":
      return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="accent-white ml-1.5" />;
    case "select":
      return (
        <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={`text-xs rounded-full px-2 py-0.5 border-0 focus:outline-none cursor-pointer ${selectColor(field, value)}`}>
          {field.options?.map((o) => <option key={o} value={o} className="bg-zinc-900 text-zinc-200">{o}</option>)}
        </select>
      );
    case "progress": {
      const n = Number(value) || 0;
      return (
        <div className="flex items-center gap-2 px-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden min-w-[60px]">
            <div className="h-full bg-[#c8ff00]/80" style={{ width: `${n}%` }} />
          </div>
          <input type="number" min={0} max={100} value={n} onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="w-12 bg-transparent text-xs text-zinc-400 text-right focus:outline-none" />
        </div>
      );
    }
    case "number":
      return <input type="number" value={Number(value) || 0} onChange={(e) => onChange(Number(e.target.value) || 0)} className={base} />;
    case "date":
      return <input type="date" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={`${base} [color-scheme:dark]`} />;
    case "longtext":
      return <textarea value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} rows={1} className={`${base} resize-y min-h-[30px]`} />;
    default:
      return <input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={field.type === "url" ? "https://" : ""} className={base} />;
  }
}

export function ModuleRenderer({ schema, rows, onAdd, onUpdate, onDelete }: Props) {
  if (schema.view === "board" && schema.groupBy) return <BoardView schema={schema} rows={rows} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />;
  if (schema.view === "cards") return <CardsView schema={schema} rows={rows} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />;
  return <TableView schema={schema} rows={rows} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />;
}

function TableView({ schema, rows, onAdd, onUpdate, onDelete }: Props) {
  return (
    <div className="rounded-xl border border-white/10 overflow-x-auto">
      <table className="w-full text-left min-w-[560px]">
        <thead>
          <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-zinc-500">
            {schema.fields.map((f) => <th key={f.key} className="px-3 py-2 font-medium">{f.label}</th>)}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="group border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
              {schema.fields.map((f) => (
                <td key={f.key} className="px-1.5 py-1 align-middle">
                  <Cell field={f} value={r.data[f.key]} onChange={(v) => onUpdate(r.id, f.key, v)} />
                </td>
              ))}
              <td className="pr-2">
                <button onClick={() => onDelete(r.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-300 p-1" title="Delete row">
                  <Trash size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => onAdd()} className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02] border-t border-white/[0.05]">
        <Plus size={12} weight="bold" /> New row
      </button>
    </div>
  );
}

function RowCard({ schema, row, onUpdate, onDelete, skip }: { schema: ModuleSchema; row: ModuleRow; onUpdate: Props["onUpdate"]; onDelete: Props["onDelete"]; skip?: string }) {
  const [title, ...rest] = schema.fields.filter((f) => f.key !== skip);
  return (
    <div className="group rounded-lg border border-white/[0.08] bg-[#16161a] p-2.5 space-y-1.5">
      <div className="flex items-start gap-1">
        <div className="flex-1 font-medium [&_input]:font-medium">
          {title && <Cell field={title} value={row.data[title.key]} onChange={(v) => onUpdate(row.id, title.key, v)} />}
        </div>
        <button onClick={() => onDelete(row.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-300 p-1" title="Delete">
          <Trash size={12} />
        </button>
      </div>
      {rest.map((f) => (
        <div key={f.key} className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600 w-20 shrink-0 truncate px-1.5">{f.label}</span>
          <div className="flex-1 min-w-0 text-xs"><Cell field={f} value={row.data[f.key]} onChange={(v) => onUpdate(row.id, f.key, v)} /></div>
        </div>
      ))}
    </div>
  );
}

function BoardView({ schema, rows, onAdd, onUpdate, onDelete }: Props) {
  const field = schema.fields.find((f) => f.key === schema.groupBy)!;
  const options = field.options || [];
  const [dragId, setDragId] = useState<string | null>(null);
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {options.map((opt) => (
        <div
          key={opt}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => dragId && onUpdate(dragId, field.key, opt)}
          className="w-72 shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 space-y-2"
        >
          <div className="flex items-center justify-between px-1">
            <span className={`text-xs rounded-full px-2 py-0.5 ${selectColor(field, opt)}`}>{opt}</span>
            <span className="text-[11px] text-zinc-600">{rows.filter((r) => r.data[field.key] === opt).length}</span>
          </div>
          {rows
            .filter((r) => r.data[field.key] === opt)
            .map((r) => (
              <div key={r.id} draggable onDragStart={() => setDragId(r.id)} onDragEnd={() => setDragId(null)} className="cursor-grab active:cursor-grabbing">
                <RowCard schema={schema} row={r} onUpdate={onUpdate} onDelete={onDelete} skip={field.key} />
              </div>
            ))}
          <button onClick={() => onAdd({ [field.key]: opt })} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-200 rounded-md hover:bg-white/[0.03]">
            <Plus size={12} weight="bold" /> Add
          </button>
        </div>
      ))}
    </div>
  );
}

function CardsView({ schema, rows, onAdd, onUpdate, onDelete }: Props) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {rows.map((r) => <RowCard key={r.id} schema={schema} row={r} onUpdate={onUpdate} onDelete={onDelete} />)}
      <button onClick={() => onAdd()} className="rounded-lg border border-dashed border-white/10 min-h-[120px] flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 hover:border-white/25">
        <Plus size={12} weight="bold" /> New card
      </button>
    </div>
  );
}
