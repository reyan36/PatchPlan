"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { Hammer, ArrowRight } from "@phosphor-icons/react";
import { db } from "@/lib/firebase";
import { aiFetch, scopeFields } from "@/lib/ai/client";
import type { ModuleSchema } from "@/lib/ai/types";
import { MODULE_ICONS, ModuleRenderer, emptyRow, type ModuleRow } from "./ModuleRenderer";
import { Button, ErrorNote, Panel, inputClass } from "./ui";

const EXAMPLES = ["Localization tracker for 6 languages", "Playtest session log with build, tester and issues found", "Voice actor casting board", "Steam festival checklist"];

type SavedModule = { id: string; schema: ModuleSchema };

export function BuildAnything({ user, familyId, enabled }: { user: User; familyId: string | null; enabled: boolean }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [refine, setRefine] = useState("");
  const [schema, setSchema] = useState<ModuleSchema | null>(null);
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [busy, setBusy] = useState<"design" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<SavedModule[]>([]);

  useEffect(() => {
    const q = familyId ? query(collection(db, "modules"), where("familyId", "==", familyId)) : query(collection(db, "modules"), where("userId", "==", user.uid));
    return onSnapshot(
      q,
      (s) => setModules(s.docs.map((d) => ({ id: d.id, ...d.data() }) as SavedModule & { familyId?: string }).filter((m) => familyId || !(m as any).familyId)),
      () => setModules([])
    );
  }, [user.uid, familyId]);

  const design = async (ask: string, previous?: ModuleSchema) => {
    setError(null);
    setBusy("design");
    try {
      const { schema } = await aiFetch<{ schema: ModuleSchema }>("build", { prompt: ask, previous });
      setSchema(schema);
      setRows(schema.sampleRows.map((data, i) => ({ id: `preview-${i}`, data })));
      setRefine("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't design that tool.");
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!schema) return;
    setBusy("save");
    try {
      const { sampleRows, ...rest } = schema;
      const ref = await addDoc(collection(db, "modules"), { ...scopeFields(user, familyId), schema: { ...rest, sampleRows: [] }, prompt, createdAt: serverTimestamp() });
      const batch = writeBatch(db);
      rows.forEach((r, i) => batch.set(doc(collection(db, "module_rows")), { moduleId: ref.id, ...scopeFields(user, familyId), data: r.data, order: i, createdAt: serverTimestamp() }));
      await batch.commit();
      router.push(`/modules/${ref.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the module. Check Firestore rules for \"modules\".");
      setBusy(null);
    }
  };

  // Preview edits stay local until the module is added.
  const preview = {
    onAdd: (data?: Record<string, unknown>) => schema && setRows((r) => [...r, { id: `preview-${Date.now()}`, data: { ...emptyRow(schema), ...data } }]),
    onUpdate: (id: string, key: string, value: unknown) => setRows((r) => r.map((x) => (x.id === id ? { ...x, data: { ...x.data, [key]: value } } : x))),
    onDelete: (id: string) => setRows((r) => r.filter((x) => x.id !== id)),
  };

  const Icon = schema ? MODULE_ICONS[schema.icon] || MODULE_ICONS.table : Hammer;

  return (
    <div className="space-y-6">
      <Panel className="p-4 sm:p-5 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight">Build Anything</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Describe a tool your studio needs. The AI designs it, you preview it, then add it to the workspace.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            design(prompt);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input className={inputClass} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Localization tracker for 6 languages" />
          <Button type="submit" loading={busy === "design" && !schema} disabled={!enabled || !prompt.trim()} className="sm:w-auto py-2">
            <Hammer size={13} weight="bold" /> Design it
          </Button>
        </form>
        {!schema && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                disabled={!enabled}
                onClick={() => {
                  setPrompt(ex);
                  design(ex);
                }}
                className="px-2.5 py-1 rounded-full border border-white/10 text-xs text-zinc-500 hover:border-white/25 hover:text-zinc-300 disabled:opacity-40"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
        <ErrorNote message={error} />
      </Panel>

      {schema && (
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-zinc-300">
                <Icon size={16} weight="duotone" />
              </span>
              <div>
                <div className="text-sm font-semibold text-white">{schema.name} <span className="ml-1 text-[10px] uppercase tracking-wide text-zinc-600">Preview · {schema.view}</span></div>
                <div className="text-xs text-zinc-500">{schema.description}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => setSchema(null)}>Discard</Button>
              <Button onClick={save} loading={busy === "save"}>Add to workspace</Button>
            </div>
          </div>

          <ModuleRenderer schema={schema} rows={rows} {...preview} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (refine.trim()) design(refine, schema);
            }}
            className="flex gap-2"
          >
            <input className={inputClass} value={refine} onChange={(e) => setRefine(e.target.value)} placeholder="Change it: “add a deadline column”, “show it as a board by status”…" />
            <Button type="submit" variant="ghost" loading={busy === "design"} disabled={!refine.trim()}>Update</Button>
          </form>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Your modules <span className="text-xs text-zinc-600 font-normal ml-1">{modules.length}</span></h3>
        {modules.length === 0 ? (
          <p className="text-sm text-zinc-600">Modules you add show up here.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {modules.map((m) => {
              const MIcon = MODULE_ICONS[m.schema?.icon] || MODULE_ICONS.table;
              return (
                <Link key={m.id} href={`/modules/${m.id}`} className="group rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 p-4 flex items-start gap-3">
                  <MIcon size={18} weight="duotone" className="text-zinc-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate">{m.schema?.name}</div>
                    <div className="text-xs text-zinc-500 line-clamp-2">{m.schema?.description}</div>
                  </div>
                  <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-300 mt-0.5" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
