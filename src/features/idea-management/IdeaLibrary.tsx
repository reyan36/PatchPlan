"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { FileText, Heart, Kanban, MagnifyingGlass, PencilLine, Plus, Trash, Lightbulb, Scribble } from "@phosphor-icons/react";
import { db } from "@/lib/firebase";
import { notifyNewIdea } from "@/lib/discord";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { IDEA_STATUS, TEMPLATES, statusOf, toMs, type Idea, type IdeaStatus } from "./ideaMeta";
import { createIdea, deleteIdea, ideaHasCanvas, ideaPreview } from "./ideaStore";
import { personalOnly, scopeIdeas, useLiveQuery } from "@/lib/live";

type Sort = "votes" | "updated" | "newest";

function ago(ms: number) {
  if (!ms) return "";
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ms).toLocaleDateString();
}

/** Every idea and design doc in the workspace, with search, status filters, sorting and templates. */
export function IdeaLibrary() {
  const { user } = useAuth();
  const { activeFamily } = useFamily();
  const router = useRouter();
  // Shared with the dashboard widget; lists read only the light summary docs (ideaStore.ts).
  const source = user ? scopeIdeas(user.uid, activeFamily?.id) : null;
  const live = useLiveQuery<Idea>(source?.key ?? null, (fs) => source!.build(fs));
  const ideas = useMemo(() => (live.ready ? personalOnly(live.error ? [] : live.data, activeFamily?.id) : null), [live.ready, live.data, live.error, activeFamily?.id]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<IdeaStatus | "all">("all");
  const [sort, setSort] = useState<Sort>("updated");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("blank");
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Idea | null>(null);


  const counts = useMemo(() => {
    const c: Record<string, number> = { all: ideas?.length || 0 };
    ideas?.forEach((i) => (c[statusOf(i.status).key] = (c[statusOf(i.status).key] || 0) + 1));
    return c;
  }, [ideas]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (ideas || []).filter(
      (i) => (status === "all" || statusOf(i.status).key === status) && (!q || i.title?.toLowerCase().includes(q) || ideaPreview(i, 2000).toLowerCase().includes(q))
    );
    const edited = (i: Idea) => toMs(i.updatedAt) || toMs(i.createdAt);
    return list.sort((a, b) =>
      sort === "votes" ? (b.upvotedBy?.length || 0) - (a.upvotedBy?.length || 0) || edited(b) - edited(a) : sort === "newest" ? toMs(b.createdAt) - toMs(a.createdAt) : edited(b) - edited(a)
    );
  }, [ideas, search, status, sort]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setBusy(true);
    try {
      const t = TEMPLATES.find((x) => x.key === template) || TEMPLATES[0];
      const id = await createIdea({ userId: user.uid, familyId: activeFamily ? activeFamily.id : null }, { title: title.trim(), content: t.content, template: t.key });
      notifyNewIdea(activeFamily?.id || user.uid, title.trim(), user.displayName || user.email || "A teammate").catch(() => {});
      router.push(`/ideas/${id}`);
    } finally {
      setBusy(false);
    }
  };

  const vote = (e: React.MouseEvent, i: Idea) => {
    e.stopPropagation();
    if (!user) return;
    const voted = i.upvotedBy?.includes(user.uid);
    updateDoc(doc(db, "ideas", i.id), { upvotedBy: voted ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  const openNew = (key = "blank") => {
    setTemplate(key);
    setTitle("");
    setCreating(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Lightbulb size={26} weight="duotone" /> Ideas &amp; docs
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Pitch features, write design docs and sketch levels. Vote on what to build, then send it to the board.</p>
        </div>
        <button onClick={() => openNew()} className="self-start inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#FAFAFA] text-black text-sm font-semibold hover:bg-zinc-200">
          <Plus size={14} weight="bold" /> New idea
        </button>
      </header>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {[{ key: "all" as const, label: "All" }, ...IDEA_STATUS].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatus(s.key)}
              className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${status === s.key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"}`}
            >
              {s.label} <span className="text-zinc-500">{counts[s.key] || 0}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          <div className="relative flex-1 lg:w-64">
            <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ideas and docs" className="w-full bg-black/30 border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/25" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="bg-black/30 border border-white/10 rounded-md px-2 py-1.5 text-xs text-zinc-300 focus:outline-none">
            <option value="updated">Recently edited</option>
            <option value="votes">Most votes</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {ideas === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8">
          <p className="text-white font-medium">Start your first doc</p>
          <p className="text-sm text-zinc-500 mt-1">Pick a template. You can sketch on a whiteboard inside any doc.</p>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TEMPLATES.filter((t) => t.key !== "blank").map((t) => (
              <button key={t.key} onClick={() => openNew(t.key)} className="text-left rounded-lg border border-white/10 p-4 hover:border-white/25 hover:bg-white/[0.03] transition-colors">
                <FileText size={18} weight="duotone" className="text-[#c8ff00]" />
                <p className="mt-2 text-sm font-medium text-white">{t.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{t.hint}</p>
              </button>
            ))}
          </div>
        </div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-zinc-500 py-10 text-center">Nothing matches.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map((i) => {
            const st = statusOf(i.status);
            const voted = !!user && !!i.upvotedBy?.includes(user.uid);
            const preview = ideaPreview(i);
            return (
              <div
                key={i.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/ideas/${i.id}`)}
                onKeyDown={(e) => e.key === "Enter" && router.push(`/ideas/${i.id}`)}
                className="group relative flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4 cursor-pointer hover:border-white/25 hover:bg-white/[0.035] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${st.tone}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setToDelete(i);
                    }}
                    className="p-1 rounded-md text-zinc-600 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    aria-label={`Delete ${i.title}`}
                  >
                    <Trash size={14} />
                  </button>
                </div>
                <h3 className="mt-3 font-semibold text-white leading-snug line-clamp-2">{i.title}</h3>
                <p className="mt-1.5 text-sm text-zinc-500 line-clamp-3 flex-1">{preview || <span className="italic text-zinc-600">Empty doc</span>}</p>
                <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
                  <button
                    onClick={(e) => vote(e, i)}
                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors ${voted ? "text-rose-300 bg-rose-500/10" : "hover:text-zinc-200 hover:bg-white/[0.05]"}`}
                    aria-label={voted ? "Remove vote" : "Vote"}
                  >
                    <Heart size={13} weight={voted ? "fill" : "regular"} /> {i.upvotedBy?.length || 0}
                  </button>
                  {ideaHasCanvas(i) && (
                    <span className="inline-flex items-center gap-1" title="Has a whiteboard">
                      <Scribble size={13} /> Sketch
                    </span>
                  )}
                  {i.taskId && (
                    <span className="inline-flex items-center gap-1" title="On the board">
                      <Kanban size={13} /> On board
                    </span>
                  )}
                  <span className="ml-auto inline-flex items-center gap-1">
                    <PencilLine size={12} /> {ago(toMs(i.updatedAt) || toMs(i.createdAt))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={creating} onClose={() => setCreating(false)} title="New idea">
        <form onSubmit={create} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Co-op mode, Ice cave level, Lore of the Old King"
              className="w-full bg-background border border-border rounded-md px-3.5 py-2 text-sm focus:outline-none focus:border-muted-foreground"
              required
              autoFocus
              maxLength={140}
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Start from</p>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  type="button"
                  key={t.key}
                  onClick={() => setTemplate(t.key)}
                  className={`text-left rounded-lg border p-3 transition-colors ${template === t.key ? "border-[#c8ff00]/50 bg-[#c8ff00]/[0.06]" : "border-border hover:border-muted-foreground"}`}
                >
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.hint}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 text-sm font-medium hover:text-muted-foreground">
              Cancel
            </button>
            <button type="submit" disabled={busy || !title.trim()} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!toDelete} onClose={() => setToDelete(null)} title="Delete idea">
        <p className="text-muted-foreground">
          Delete <span className="text-foreground font-medium">{toDelete?.title}</span> and its whiteboard? This can&apos;t be undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setToDelete(null)} className="px-4 py-2 text-sm font-medium hover:text-muted-foreground">
            Cancel
          </button>
          <button
            onClick={async () => {
              if (toDelete) await deleteIdea(toDelete.id);
              setToDelete(null);
            }}
            className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
