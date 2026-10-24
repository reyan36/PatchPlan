"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { ArrowsClockwise, CaretDown, CheckCircle, Link as LinkIcon, Plus, Rocket, X } from "@phosphor-icons/react";
import { db } from "@/lib/firebase";
import { personalOnly, scopeTasks, useLiveQuery } from "@/lib/live";
import { notifyPatchNotes } from "@/lib/discord";
import { aiFetch, scopeFields, type AIStatus } from "@/lib/ai/client";
import type { FeedbackItem, PatchNotesDraft, ShippedTask, SignalCluster, TaskBrief, TaskTag } from "@/lib/ai/types";
import { Button, CATEGORY_STYLE, ErrorNote, Panel, Pill, SEVERITY_DOT, SourceIcon, inputClass } from "./ui";

type SignalStatus = "pending" | "approved" | "dismissed" | "shipped";

type Signal = SignalCluster & {
  id: string;
  status: SignalStatus;
  taskId: string | null;
  reporters: string[];
  createdAt?: any;
};

type Task = { id: string; title: string; tags: string[]; column: string; description?: string; familyId?: string | null };

type Sources = { gameName: string; subreddit: string; feedbackChannelId: string };

const TAGS: TaskTag[] = ["Art", "Code", "Audio", "Design", "Bug", "Marketing", "Other"];
const DONE_COLUMN = "Done";

export function PlayerSignal({ user, familyId, status }: { user: User; familyId: string | null; status: AIStatus | null }) {
  const scopeId = familyId || user.uid;

  const [signals, setSignals] = useState<Signal[]>([]);
  // Same listener as the board (shared), so switching between them costs nothing.
  const taskSource = scopeTasks(user.uid, familyId);
  const liveTasks = useLiveQuery<Task>(taskSource.key, (fs) => taskSource.build(fs));
  const tasks = useMemo(() => personalOnly(liveTasks.data, familyId), [liveTasks.data, familyId]);
  const [sources, setSources] = useState<Sources>({ gameName: "", subreddit: "", feedbackChannelId: "" });
  const [manual, setManual] = useState("");
  const [showSources, setShowSources] = useState(false);

  const [phase, setPhase] = useState<"idle" | "collecting" | "triaging">("idle");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live signals + tasks for this scope.
  useEffect(() => {
    const scoped = (col: string) =>
      familyId ? query(collection(db, col), where("familyId", "==", familyId)) : query(collection(db, col), where("userId", "==", user.uid));
    const unsubSignals = onSnapshot(
      scoped("signals"),
      (s) => setSignals(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Signal).filter((x) => familyId || !(x as any).familyId)),
      (e) => setError(`Can't read player signals: ${e.message}. Check your Firestore rules allow the "signals" collection.`)
    );
    return () => {
      unsubSignals();
    };
  }, [user.uid, familyId]);

  // Feedback sources live alongside the Discord webhook in the integrations doc.
  useEffect(() => {
    getDoc(doc(db, "integrations", scopeId))
      .then((snap) => {
        const d = snap.data() || {};
        const next = { gameName: d.gameName || "", subreddit: d.subreddit || "", feedbackChannelId: d.feedbackChannelId || "" };
        setSources(next);
        if (!next.gameName && !next.feedbackChannelId) setShowSources(true);
      })
      .catch(() => setShowSources(true));
  }, [scopeId]);

  const saveSources = async () => {
    await setDoc(doc(db, "integrations", scopeId), sources, { merge: true });
    setShowSources(false);
  };

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const inbox = signals.filter((s) => s.status === "pending").sort((a, b) => sevRank(a) - sevRank(b) || b.reports.length - a.reports.length);
  const approved = signals.filter((s) => s.status === "approved");
  const readyToShip = approved.filter((s) => s.taskId && taskById.get(s.taskId)?.column === DONE_COLUMN);
  const inProgress = approved.filter((s) => !readyToShip.includes(s));

  const knownReportIds = useMemo(() => new Set(signals.flatMap((s) => s.reports.map((r) => r.id))), [signals]);

  // Collect → sort → match, then store each cluster as a pending signal.
  const runPipeline = async () => {
    setError(null);
    setNote(null);
    try {
      setPhase("collecting");
      const collected = await aiFetch<{ items: FeedbackItem[]; errors: string[] }>("signal/collect", {
        discordChannelId: sources.feedbackChannelId || undefined,
        gameName: sources.gameName || undefined,
        subreddit: sources.subreddit || undefined,
        manual,
      });
      const fresh = collected.items.filter((i) => i.source === "manual" || !knownReportIds.has(i.id));
      if (!fresh.length) {
        setNote(collected.errors.length ? collected.errors.join(" · ") : "No new player feedback since the last run.");
        return;
      }

      setPhase("triaging");
      const board: TaskBrief[] = tasks.map((t) => ({ id: t.id, title: t.title, tags: t.tags || [], column: t.column }));
      const { clusters } = await aiFetch<{ clusters: SignalCluster[] }>("signal/triage", { items: fresh, tasks: board, gameName: sources.gameName || undefined });

      const batch = writeBatch(db);
      clusters.forEach((c) => {
        batch.set(doc(collection(db, "signals")), {
          ...scopeFields(user, familyId),
          ...c,
          reporters: Array.from(new Set(c.reports.map((r) => r.author))),
          status: "pending",
          taskId: null,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
      setManual("");
      setNote(
        `Sorted ${fresh.length} reports into ${clusters.length} signals.` + (collected.errors.length ? ` Skipped: ${collected.errors.join(" · ")}` : "")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPhase("idle");
    }
  };

  const approve = async (s: Signal, draft: SignalCluster["draft"], linkTo: string | null) => {
    let taskId = linkTo;
    if (taskId) {
      await updateDoc(doc(db, "tasks", taskId), { signalIds: arrayUnion(s.id), reporters: arrayUnion(...s.reporters) });
    } else if (draft) {
      const board = await getDoc(doc(db, "board_configs", scopeId)).catch(() => null);
      const ref = await addDoc(collection(db, "tasks"), {
        title: draft.title,
        column: board?.data()?.columns?.[0] || "Backlog",
        tags: [draft.tag],
        description: `<p>${escapeHtml(draft.description)}</p>${reportsHtml(s)}`,
        userId: user.uid,
        familyId,
        assigneeId: null,
        signalIds: [s.id],
        reporters: s.reporters,
        source: "player-signal",
        createdAt: serverTimestamp(),
      });
      taskId = ref.id;
    }
    await updateDoc(doc(db, "signals", s.id), { status: "approved", taskId, draft: draft ?? null });
  };

  const dismiss = (s: Signal) => updateDoc(doc(db, "signals", s.id), { status: "dismissed" });

  return (
    <div className="space-y-6">
      {/* Pipeline header */}
      <Panel className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight">Player Signal</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Collect feedback from Discord, Steam and Reddit, sort it, and turn it into board tasks.</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Pill className={status?.discordBot && sources.feedbackChannelId ? "border-indigo-500/25 text-indigo-300" : "border-white/10 text-zinc-500"}>
                <SourceIcon source="discord" size={11} /> {sources.feedbackChannelId ? "Discord channel" : "Discord not set"}
              </Pill>
              <Pill className={status?.tavily && sources.gameName ? "border-sky-500/25 text-sky-300" : "border-white/10 text-zinc-500"}>
                <SourceIcon source="steam" size={11} /> Steam + Reddit {sources.gameName ? `· ${sources.gameName}` : "not set"}
              </Pill>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="ghost" onClick={() => setShowSources((v) => !v)}>
              Sources <CaretDown size={11} className={showSources ? "rotate-180" : ""} />
            </Button>
            <Button onClick={runPipeline} loading={phase !== "idle"} disabled={!status?.nebius}>
              {phase === "idle" && <ArrowsClockwise size={13} weight="bold" />}
              {phase === "collecting" ? "Collecting…" : phase === "triaging" ? "Sorting & matching…" : "Collect feedback"}
            </Button>
          </div>
        </div>

        {showSources && (
          <div className="grid sm:grid-cols-3 gap-3 pt-3 border-t border-white/[0.06]">
            <label className="space-y-1">
              <span className="text-[11px] text-zinc-500">Game name (for Steam / web search)</span>
              <input className={inputClass} value={sources.gameName} onChange={(e) => setSources({ ...sources, gameName: e.target.value })} placeholder="Your game" />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-zinc-500">Subreddit (optional)</span>
              <input className={inputClass} value={sources.subreddit} onChange={(e) => setSources({ ...sources, subreddit: e.target.value })} placeholder="r/yourgame" />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-zinc-500">Discord feedback channel ID</span>
              <input className={inputClass} value={sources.feedbackChannelId} onChange={(e) => setSources({ ...sources, feedbackChannelId: e.target.value.trim() })} placeholder="123456789012345678" />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-[11px] text-zinc-500">Or paste feedback, one report per line (&quot;Name: message&quot; credits the player)</span>
              <textarea className={`${inputClass} min-h-[72px] font-mono text-xs`} value={manual} onChange={(e) => setManual(e.target.value)} placeholder={"Player1: game softlocks if you exit the ladder mid-climb\nPlayer2: parry window feels way too tight on boss 2"} />
            </label>
            <div className="sm:col-span-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-zinc-600">
                {!status?.discordBot && "Discord needs DISCORD_BOT_TOKEN on the server. "}
                {!status?.tavily && "Steam/Reddit search needs TAVILY_API_KEY. "}
              </p>
              <Button variant="ghost" onClick={saveSources}>Save sources</Button>
            </div>
          </div>
        )}

        {!status?.nebius && <ErrorNote message="NEBIUS_API_KEY isn't set on the server, so the AI can't run yet. See .env.example." />}
        <ErrorNote message={error} />
        {note && <div className="text-xs text-zinc-400">{note}</div>}
      </Panel>

      {/* Inbox */}
      <section className="space-y-3">
        <SectionTitle title="Needs review" count={inbox.length} hint="Approve to create or link a board task." />
        {inbox.length === 0 ? (
          <Empty text="No new player signals. Collect feedback to fill this up." />
        ) : (
          inbox.map((s) => <SignalCard key={s.id} signal={s} tasks={tasks} taskById={taskById} onApprove={approve} onDismiss={dismiss} />)
        )}
      </section>

      {/* Ship */}
      <ShipPanel
        user={user}
        familyId={familyId}
        gameName={sources.gameName}
        ready={readyToShip}
        inProgress={inProgress}
        taskById={taskById}
      />
    </div>
  );
}

function sevRank(s: Signal) {
  return { high: 0, medium: 1, low: 2 }[s.severity] ?? 1;
}

function SectionTitle({ title, count, hint }: { title: string; count: number; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <span className="text-xs text-zinc-600">{count}</span>
      {hint && <span className="text-xs text-zinc-600 hidden sm:inline">· {hint}</span>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-600">{text}</div>;
}

function SignalCard({
  signal: s,
  tasks,
  taskById,
  onApprove,
  onDismiss,
}: {
  signal: Signal;
  tasks: Task[];
  taskById: Map<string, Task>;
  onApprove: (s: Signal, draft: SignalCluster["draft"], linkTo: string | null) => Promise<void>;
  onDismiss: (s: Signal) => void;
}) {
  const matched = s.matchTaskId ? taskById.get(s.matchTaskId) : undefined;
  const [mode, setMode] = useState<"link" | "create">(matched ? "link" : "create");
  const [linkTo, setLinkTo] = useState(matched?.id || "");
  const [draft, setDraft] = useState(s.draft || { title: s.summary.slice(0, 100), tag: (s.category === "bug" ? "Bug" : "Design") as TaskTag, description: s.summary });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const approve = async () => {
    setBusy(true);
    try {
      await onApprove(s, mode === "create" ? draft : null, mode === "link" ? linkTo || null : null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[s.severity]}`} title={`${s.severity} severity`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <Pill className={CATEGORY_STYLE[s.category]}>{s.category}</Pill>
            <button onClick={() => setOpen((v) => !v)} className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
              {s.reports.length} report{s.reports.length === 1 ? "" : "s"} · {s.reporters.slice(0, 3).join(", ")}
              {s.reporters.length > 3 ? ` +${s.reporters.length - 3}` : ""}
              <CaretDown size={10} className={open ? "rotate-180" : ""} />
            </button>
          </div>
          <p className="text-sm text-zinc-100">{s.summary}</p>
        </div>
        <button onClick={() => onDismiss(s)} className="text-zinc-600 hover:text-zinc-300 p-1" title="Dismiss">
          <X size={14} />
        </button>
      </div>

      {open && (
        <ul className="space-y-1.5 pl-4 border-l border-white/[0.06] ml-0.5">
          {s.reports.map((r) => (
            <li key={r.id} className="flex gap-2 text-xs">
              <span className="mt-0.5 shrink-0"><SourceIcon source={r.source} /></span>
              <span className="text-zinc-400 min-w-0">
                <span className="text-zinc-300 font-medium">{r.author}</span> {r.text}
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer" className="ml-1 text-zinc-500 hover:text-zinc-300 underline underline-offset-2">source</a>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {s.category === "praise" ? (
        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onDismiss(s)}>Archive</Button>
        </div>
      ) : (
        <div className="rounded-lg bg-black/20 border border-white/[0.06] p-3 space-y-3">
          <div className="flex gap-1 text-xs">
            {(["link", "create"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2.5 py-1 rounded-md ${mode === m ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                {m === "link" ? "Link to existing task" : "Create new task"}
              </button>
            ))}
            {matched && <span className="ml-auto self-center text-[11px] text-emerald-400/80 hidden sm:inline">AI found a match</span>}
          </div>

          {mode === "link" ? (
            <div className="space-y-1.5">
              <select className={inputClass} value={linkTo} onChange={(e) => setLinkTo(e.target.value)}>
                <option value="">Choose a task…</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title} · {t.column}</option>
                ))}
              </select>
              {matched && s.matchReason && linkTo === matched.id && <p className="text-[11px] text-zinc-500">{s.matchReason}</p>}
            </div>
          ) : (
            <div className="grid sm:grid-cols-[1fr_120px] gap-2">
              <input className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <select className={inputClass} value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value as TaskTag })}>
                {TAGS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <textarea className={`${inputClass} sm:col-span-2 min-h-[64px] text-xs`} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={approve} loading={busy} disabled={mode === "link" ? !linkTo : !draft.title.trim()}>
              {mode === "link" ? <LinkIcon size={13} weight="bold" /> : <Plus size={13} weight="bold" />}
              Approve
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function ShipPanel({
  user,
  familyId,
  gameName,
  ready,
  inProgress,
  taskById,
}: {
  user: User;
  familyId: string | null;
  gameName: string;
  ready: Signal[];
  inProgress: Signal[];
  taskById: Map<string, Task>;
}) {
  const scopeId = familyId || user.uid;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState("");
  const [draft, setDraft] = useState<PatchNotesDraft | null>(null);
  const [busy, setBusy] = useState<"write" | "publish" | "draft" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Several signals can point at one task; ship per task.
  const readyTasks = useMemo(() => {
    const byTask = new Map<string, Signal[]>();
    ready.forEach((s) => byTask.set(s.taskId!, [...(byTask.get(s.taskId!) || []), s]));
    return Array.from(byTask.entries()).map(([taskId, sigs]) => ({ task: taskById.get(taskId)!, signals: sigs }));
  }, [ready, taskById]);

  useEffect(() => {
    setSelected(new Set(readyTasks.map((r) => r.task.id)));
  }, [readyTasks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = readyTasks.filter((r) => selected.has(r.task.id));
  const credits = Array.from(new Set(chosen.flatMap((r) => r.signals.flatMap((s) => s.reporters))));

  const write = async () => {
    setError(null);
    setBusy("write");
    try {
      const payload: ShippedTask[] = chosen.map(({ task, signals }) => ({
        id: task.id,
        title: task.title,
        tags: task.tags || [],
        description: task.description,
        reporters: Array.from(new Set(signals.flatMap((s) => s.reporters))),
        category: signals[0]?.category,
      }));
      const { draft } = await aiFetch<{ draft: PatchNotesDraft }>("patch-notes", { tasks: payload, gameName: gameName || undefined, version });
      setDraft(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't write patch notes.");
    } finally {
      setBusy(null);
    }
  };

  const save = async (publish: boolean) => {
    if (!draft) return;
    setError(null);
    setBusy(publish ? "publish" : "draft");
    try {
      const article = await addDoc(collection(db, "articles"), {
        ...scopeFields(user, familyId),
        title: draft.title,
        excerpt: draft.excerpt,
        content: draft.content,
        coverImage: "",
        category: "Patch Notes",
        authorName: user.displayName || "",
        authorRole: "",
        status: publish ? "published" : "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(publish ? { publishedAt: serverTimestamp() } : {}),
      });

      const batch = writeBatch(db);
      chosen.forEach(({ signals }) => signals.forEach((s) => batch.update(doc(db, "signals", s.id), { status: "shipped", articleId: article.id })));
      await batch.commit();

      if (publish) {
        // Public roadmap: shipped work lands in the roadmap's last column.
        const cfg = await getDoc(doc(db, "roadmap_configs", scopeId)).catch(() => null);
        const cols: string[] = cfg?.data()?.columns || ["Far Future", "Future", "Later", "Soon", "Done"];
        await addDoc(collection(db, "roadmap"), {
          ...scopeFields(user, familyId),
          title: draft.title,
          column: cols[cols.length - 1],
          category: "Patch",
          bullets: chosen.map((r) => r.task.title),
          createdAt: serverTimestamp(),
        });
        const posted = await notifyPatchNotes(scopeId, draft.title, draft.discordSummary, `${window.location.origin}/p/article/${article.id}`, credits);
        setDone(`Published${posted ? ", posted to Discord" : ""} and added to the roadmap.`);
      } else {
        window.location.href = `/news/${article.id}`;
        return;
      }
      setDraft(null);
      setVersion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save patch notes.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-3">
      <SectionTitle title="Ready to ship" count={readyTasks.length} hint={`Linked tasks that reached ${DONE_COLUMN}.`} />
      <Panel className="p-4 space-y-4">
        {readyTasks.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Nothing shipped yet. When a task linked to player signals moves to {DONE_COLUMN}, it shows up here.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {readyTasks.map(({ task, signals }) => (
              <li key={task.id}>
                <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(task.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      e.target.checked ? next.add(task.id) : next.delete(task.id);
                      setSelected(next);
                    }}
                    className="accent-white"
                  />
                  <CheckCircle size={14} weight="fill" className="text-emerald-400 shrink-0" />
                  <span className="text-zinc-200 truncate">{task.title}</span>
                  <span className="text-[11px] text-zinc-600 shrink-0">
                    {Array.from(new Set(signals.flatMap((s) => s.reporters))).length} players
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {readyTasks.length > 0 && !draft && (
          <div className="flex gap-2">
            <input className={`${inputClass} max-w-[140px]`} value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Version, e.g. 2.2.1" />
            <Button onClick={write} loading={busy === "write"} disabled={!chosen.length}>
              <Rocket size={13} weight="bold" /> Write patch notes
            </Button>
          </div>
        )}

        {draft && (
          <div className="space-y-3 pt-3 border-t border-white/[0.06]">
            <input className={`${inputClass} font-semibold`} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <input className={inputClass} value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
            {/* Server-built HTML: every model string is escaped before it gets here. */}
            <div
              className="prose prose-invert prose-sm max-w-none rounded-lg border border-white/[0.06] bg-black/20 p-4"
              dangerouslySetInnerHTML={{ __html: draft.content }}
            />
            <p className="text-[11px] text-zinc-500">Discord: {draft.discordSummary}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="danger" onClick={() => setDraft(null)}>Discard</Button>
              <Button variant="ghost" onClick={() => save(false)} loading={busy === "draft"}>Edit in News</Button>
              <Button onClick={() => save(true)} loading={busy === "publish"}>Publish to players</Button>
            </div>
          </div>
        )}

        <ErrorNote message={error} />
        {done && <p className="text-xs text-emerald-400">{done}</p>}
      </Panel>

      {inProgress.length > 0 && (
        <p className="text-xs text-zinc-600">
          {inProgress.length} approved signal{inProgress.length === 1 ? "" : "s"} still in progress on the board.
        </p>
      )}
    </section>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function reportsHtml(s: Signal) {
  const items = s.reports
    .slice(0, 10)
    .map((r) => `<li><strong>${escapeHtml(r.author)}</strong> (${r.source}): ${escapeHtml(r.text.slice(0, 280))}</li>`)
    .join("");
  return `<p><strong>Player reports</strong></p><ul>${items}</ul>`;
}
