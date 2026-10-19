"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { ArrowLeft, Trash } from "@phosphor-icons/react";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import { Login } from "@/components/auth/Login";
import { Modal } from "@/components/ui/Modal";
import type { ModuleSchema } from "@/lib/ai/types";
import { MODULE_ICONS, ModuleRenderer, emptyRow, type ModuleRow } from "@/features/ai/ModuleRenderer";

type ModuleDoc = { schema: ModuleSchema; userId: string; familyId: string | null; prompt?: string };

export default function ModulePage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const { loading: familyLoading } = useFamily();
  const router = useRouter();
  const [mod, setMod] = useState<ModuleDoc | null | undefined>(undefined);
  const [rows, setRows] = useState<(ModuleRow & { order: number })[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pending = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!user) return;
    const unsubMod = onSnapshot(
      doc(db, "modules", params.id),
      (s) => setMod(s.exists() ? (s.data() as ModuleDoc) : null),
      () => setMod(null)
    );
    return unsubMod;
  }, [user, params.id]);

  // Rows are scoped like the module so Firestore rules can check them the same way.
  useEffect(() => {
    if (!user || !mod) return;
    const scope = mod.familyId ? where("familyId", "==", mod.familyId) : where("userId", "==", mod.userId);
    return onSnapshot(query(collection(db, "module_rows"), where("moduleId", "==", params.id), scope), (s) => {
      setRows(
        s.docs
          .map((d) => ({ id: d.id, data: d.data().data || {}, order: d.data().order ?? 0 }))
          .sort((a, b) => a.order - b.order)
      );
    });
  }, [user, mod?.familyId, mod?.userId, params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading || familyLoading || (user && mod === undefined)) return <div className="p-8 text-sm text-zinc-500 animate-pulse">Loading module…</div>;
  if (!user) return <Login />;
  if (!mod) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-zinc-400">This module doesn&apos;t exist or you don&apos;t have access.</p>
        <Link href="/ai?tab=build" className="text-sm text-zinc-300 underline">Back to Build</Link>
      </div>
    );
  }

  const { schema } = mod;
  const Icon = MODULE_ICONS[schema.icon] || MODULE_ICONS.table;

  const onAdd = async (data?: Record<string, unknown>) => {
    await addDoc(collection(db, "module_rows"), {
      moduleId: params.id,
      userId: user.uid,
      familyId: mod.familyId,
      data: { ...emptyRow(schema), ...data },
      order: (rows[rows.length - 1]?.order ?? 0) + 1,
      createdAt: serverTimestamp(),
    });
  };

  // Optimistic local edit, debounced write per cell.
  const onUpdate = (id: string, key: string, value: unknown) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, data: { ...x.data, [key]: value } } : x)));
    const k = `${id}:${key}`;
    clearTimeout(pending.current[k]);
    pending.current[k] = setTimeout(() => updateDoc(doc(db, "module_rows", id), { [`data.${key}`]: value }), 400);
  };

  const onDelete = (id: string) => deleteDoc(doc(db, "module_rows", id));

  const deleteModule = async () => {
    const batch = writeBatch(db);
    rows.forEach((r) => batch.delete(doc(db, "module_rows", r.id)));
    batch.delete(doc(db, "modules", params.id));
    await batch.commit();
    router.push("/ai?tab=build");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/ai?tab=build" className="text-zinc-500 hover:text-zinc-200 p-1 -ml-1" title="All modules">
            <ArrowLeft size={18} />
          </Link>
          <span className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center text-zinc-300">
            <Icon size={20} weight="duotone" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{schema.name}</h1>
            <p className="text-sm text-zinc-500">{schema.description}</p>
          </div>
        </div>
        <button onClick={() => setConfirmDelete(true)} className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-300 px-2 py-1.5 rounded-md hover:bg-red-500/10">
          <Trash size={13} /> Delete module
        </button>
      </header>

      <ModuleRenderer schema={schema} rows={rows} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />

      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete module?">
        <p className="text-sm text-zinc-400 mb-4">This removes “{schema.name}” and its {rows.length} rows for everyone in the workspace.</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white">Cancel</button>
          <button onClick={deleteModule} className="px-3 py-1.5 text-sm rounded-md bg-red-500/90 text-white hover:bg-red-500">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
