"use client";

import { refreshPublicPages } from "@/lib/publicRefresh";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { notifyNewsPublished } from "@/lib/discord";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowSquareOut,
  ArrowCounterClockwise,
  ArrowClockwise,
  TextB,
  TextItalic,
  TextStrikethrough,
  Code,
  CodeBlock,
  TextHTwo,
  TextHThree,
  Paragraph,
  ListBullets,
  ListNumbers,
  ListChecks,
  Quotes,
  Minus,
  LinkSimple,
  Image as ImageIcon,
  ImageSquare,
  SidebarSimple,
  Trash,
  Check,
  CloudArrowUp,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { ARTICLE_CATEGORIES, readingStats } from "@/lib/newsTheme";

type Fields = {
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  authorName: string;
  authorRole: string;
  socialLabel: string;
  socialX: string;
};

const EMPTY: Fields = {
  title: "",
  excerpt: "",
  coverImage: "",
  category: "Devlog",
  authorName: "",
  authorRole: "",
  socialLabel: "",
  socialX: "",
};

type SaveState = "saved" | "dirty" | "saving" | "error";

const toMs = (ts: any): number | undefined => (ts?.toMillis ? ts.toMillis() : undefined);

const inputCls =
  "w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors";

/** Textarea that grows with its content — used for title and summary. */
function AutoTextarea({ id, value, onChange, className, placeholder, onEnter }: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  className: string;
  placeholder: string;
  onEnter?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      id={id}
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={e => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter?.();
        }
      }}
      className={`w-full resize-none overflow-hidden bg-transparent border-none focus:outline-none ${className}`}
    />
  );
}

function ToolBtn({ onClick, active, disabled, title, children }: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none ${
        active ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white hover:bg-white/[0.07]"
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => <div className="w-px h-4 bg-white/10 mx-1" />;

function SaveIndicator({ state, lastSaved }: { state: SaveState; lastSaved: number | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  if (state === "saving") return <span className="flex items-center gap-1.5 text-xs text-zinc-500"><CloudArrowUp size={14} className="animate-pulse" /> Saving…</span>;
  if (state === "dirty") return <span className="text-xs text-zinc-500">Unsaved changes</span>;
  if (state === "error") return <span className="flex items-center gap-1.5 text-xs text-red-400"><WarningCircle size={14} /> Couldn&apos;t save</span>;
  let label = "Saved";
  if (lastSaved) {
    const m = Math.floor((Date.now() - lastSaved) / 60000);
    label = m < 1 ? "Saved just now" : `Saved ${m}m ago`;
  }
  return <span className="flex items-center gap-1.5 text-xs text-zinc-500"><Check size={13} weight="bold" /> {label}</span>;
}

export default function ArticleEditor({ params }: { params: { articleId: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const articleId = params.articleId;

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [meta, setMeta] = useState<{ createdAt?: number; publishedAt?: number; familyId?: string | null; userId?: string }>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [coverEditing, setCoverEditing] = useState(false);
  const [coverDraft, setCoverDraft] = useState("");
  const [inline, setInline] = useState<null | "link" | "image">(null);
  const [inlineValue, setInlineValue] = useState("");
  const [stats, setStats] = useState({ words: 0, minutes: 1 });
  const [, rerender] = useState(0);

  // Refs hold the latest values so debounced/async saves never use stale state
  const fieldsRef = useRef<Fields>(EMPTY);
  const contentRef = useRef<string>("");
  const pendingContent = useRef<string | null>(null);
  const loadedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const saveRef = useRef<(overrides?: Record<string, any>) => Promise<void>>(async () => {});
  const scheduleRef = useRef<() => void>(() => {});

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Image,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Placeholder.configure({ placeholder: "Write your update… Use the toolbar or Markdown shortcuts like ## or -" }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[420px] focus:outline-none prose-p:text-zinc-300 prose-p:leading-7 prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-[#FAFAFA] prose-a:text-[#4d94ff] prose-a:no-underline hover:prose-a:underline prose-strong:text-[#FAFAFA] prose-blockquote:border-l-white/20 prose-blockquote:text-zinc-400 prose-blockquote:font-normal prose-code:text-zinc-200 prose-code:bg-white/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-white/[0.04] prose-pre:border prose-pre:border-white/10 prose-img:rounded-xl prose-hr:border-white/10 prose-li:text-zinc-300",
      },
    },
    onUpdate: ({ editor }) => {
      contentRef.current = editor.getHTML();
      setStats(readingStats(contentRef.current));
      if (loadedRef.current) scheduleRef.current();
    },
    onSelectionUpdate: () => rerender(x => x + 1),
    onTransaction: () => rerender(x => x + 1),
  });

  // ---- Load article -------------------------------------------------------
  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "articles", articleId));
      if (!snap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const d = snap.data();
      const loaded: Fields = {
        title: d.title || "",
        excerpt: d.excerpt || "",
        coverImage: d.coverImage || "",
        category: d.category || "Devlog",
        authorName: d.authorName || "",
        authorRole: d.authorRole || "",
        socialLabel: d.socialLabel || "",
        socialX: d.socialX || "",
      };
      fieldsRef.current = loaded;
      setFields(loaded);
      setStatus(d.status === "published" ? "published" : "draft");
      setMeta({
        createdAt: toMs(d.createdAt),
        // Legacy published articles have no publishedAt — fall back so we don't re-notify Discord
        publishedAt: toMs(d.publishedAt) ?? (d.status === "published" ? toMs(d.createdAt) ?? Date.now() : undefined),
        familyId: d.familyId ?? null,
        userId: d.userId,
      });
      const updated = toMs(d.updatedAt);
      if (updated) setLastSaved(updated);
      pendingContent.current = d.content || "";
      contentRef.current = d.content || "";
      setStats(readingStats(d.content));
      setLoading(false);
    })();
  }, [user, articleId]);

  // Push loaded HTML into the editor once both are ready
  useEffect(() => {
    if (!editor || pendingContent.current === null) return;
    editor.commands.setContent(pendingContent.current, false);
    pendingContent.current = null;
    loadedRef.current = true;
  }, [editor, loading]);

  // ---- Saving -------------------------------------------------------------
  saveRef.current = async (overrides = {}) => {
    clearTimeout(saveTimer.current);
    setSaveState("saving");
    try {
      await updateDoc(doc(db, "articles", articleId), {
        ...fieldsRef.current,
        content: contentRef.current,
        updatedAt: serverTimestamp(),
        ...overrides,
      });
      dirtyRef.current = false;
      // Published edits (and publish/unpublish) show on the public news page right away.
      if (status === "published" || "status" in overrides) refreshPublicPages(meta.familyId || meta.userId);
      setSaveState("saved");
      setLastSaved(Date.now());
    } catch (err) {
      console.error("Article save failed:", err);
      setSaveState("error");
    }
  };

  scheduleRef.current = () => {
    dirtyRef.current = true;
    setSaveState("dirty");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveRef.current(), 1200);
  };

  const update = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    const next = { ...fieldsRef.current, [key]: value };
    fieldsRef.current = next;
    setFields(next);
    scheduleRef.current();
  };

  // Ctrl/Cmd+S, unsaved-changes guard, and flush pending edits when leaving
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (dirtyRef.current) saveRef.current();
    };
  }, []);

  const handlePublish = async () => {
    if (!user) return;
    setPublishing(true);
    const firstPublish = !meta.publishedAt;
    await saveRef.current({ status: "published", ...(firstPublish ? { publishedAt: serverTimestamp() } : {}) });
    setStatus("published");
    if (firstPublish) {
      setMeta(m => ({ ...m, publishedAt: Date.now() }));
      notifyNewsPublished(meta.familyId || meta.userId || user.uid, fieldsRef.current.title || "Untitled article", fieldsRef.current.authorName || user.displayName || "Someone");
    }
    setPublishing(false);
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    await saveRef.current({ status: "draft" });
    setStatus("draft");
    setPublishing(false);
  };

  const handleDelete = async () => {
    dirtyRef.current = false;
    clearTimeout(saveTimer.current);
    await deleteDoc(doc(db, "articles", articleId));
    refreshPublicPages(meta.familyId || meta.userId);
    router.push("/news");
  };

  // ---- Inline link / image input -----------------------------------------
  const openInline = (kind: "link" | "image") => {
    if (!editor) return;
    setInline(kind);
    setInlineValue(kind === "link" ? editor.getAttributes("link").href || "" : "");
  };

  const applyInline = () => {
    if (!editor || !inline) return;
    const url = inlineValue.trim();
    if (inline === "link") {
      if (!url) editor.chain().focus().extendMarkRange("link").unsetLink().run();
      else editor.chain().focus().extendMarkRange("link").setLink({ href: url.startsWith("http") || url.startsWith("mailto:") ? url : `https://${url}` }).run();
    } else if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    setInline(null);
    setInlineValue("");
  };

  const applyCover = () => {
    update("coverImage", coverDraft.trim());
    setCoverEditing(false);
  };

  // ---- Render -------------------------------------------------------------
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 space-y-4 animate-pulse">
        <div className="h-10 w-2/3 bg-white/[0.04] rounded-lg" />
        <div className="h-5 w-1/2 bg-white/[0.03] rounded" />
        <div className="h-64 bg-white/[0.02] rounded-xl mt-8" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="py-24 text-center">
        <h2 className="text-sm font-semibold text-[#FAFAFA]">Article not found</h2>
        <p className="text-xs text-zinc-500 mt-1">It may have been deleted.</p>
        <button onClick={() => router.push("/news")} className="mt-5 text-xs text-zinc-300 hover:text-white underline underline-offset-4">Back to News</button>
      </div>
    );
  }

  const isPublished = status === "published";
  const e = editor as Editor | null;

  return (
    <div className="-mt-8 -mx-4">
      {/* Action bar */}
      <div className="sticky top-16 z-20 h-14 px-4 flex items-center justify-between gap-3 border-b border-white/10 bg-black/85 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/news")}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft size={14} weight="bold" /> News
          </button>
          <span className="text-zinc-700">/</span>
          <span className="text-xs text-zinc-300 truncate max-w-[240px]">{fields.title || "Untitled article"}</span>
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${
              isPublished ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/[0.04] text-zinc-400 border-white/10"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-emerald-400" : "bg-zinc-500"}`} />
            {isPublished ? "Published" : "Draft"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:block mr-2">
            <SaveIndicator state={saveState} lastSaved={lastSaved} />
          </div>
          {isPublished && (
            <a
              href={`/p/article/${articleId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <ArrowSquareOut size={14} /> View live
            </a>
          )}
          <button
            onClick={() => setShowSidebar(s => !s)}
            className={`p-2 rounded-lg transition-colors ${showSidebar ? "text-white bg-white/[0.06]" : "text-zinc-500 hover:text-white hover:bg-white/[0.06]"}`}
            title="Toggle article settings"
          >
            <SidebarSimple size={16} weight="bold" className="scale-x-[-1]" />
          </button>
          {isPublished ? (
            <>
              <button
                onClick={handleUnpublish}
                disabled={publishing}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50"
              >
                Unpublish
              </button>
              <button
                onClick={() => saveRef.current()}
                disabled={saveState === "saving"}
                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#FAFAFA] text-black hover:bg-white transition-colors disabled:opacity-60"
              >
                Update
              </button>
            </>
          ) : (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#FAFAFA] text-black hover:bg-white transition-colors disabled:opacity-60"
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Writing canvas */}
        <div className="flex-1 min-w-0 px-4">
          <div className="max-w-[720px] mx-auto pt-10 pb-32">
            {/* Cover */}
            {fields.coverImage && !coverEditing ? (
              <div className="group relative mb-8 rounded-xl overflow-hidden border border-white/10 aspect-[16/7] bg-white/[0.02]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fields.coverImage} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-end p-3 gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => {
                      setCoverDraft(fields.coverImage);
                      setCoverEditing(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-black/70 text-white border border-white/15 hover:bg-black/90 backdrop-blur"
                  >
                    Change cover
                  </button>
                  <button
                    onClick={() => update("coverImage", "")}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-black/70 text-white border border-white/15 hover:bg-black/90 backdrop-blur"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : coverEditing ? (
              <div className="mb-8 flex items-center gap-2 p-2 rounded-xl border border-white/10 bg-white/[0.02]">
                <ImageSquare size={16} className="text-zinc-500 ml-1.5 shrink-0" />
                <input
                  autoFocus
                  value={coverDraft}
                  onChange={ev => setCoverDraft(ev.target.value)}
                  onKeyDown={ev => {
                    if (ev.key === "Enter") applyCover();
                    if (ev.key === "Escape") setCoverEditing(false);
                  }}
                  placeholder="Paste an image URL (1600×700 works best)"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                />
                <button onClick={applyCover} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAFAFA] text-black hover:bg-white">Apply</button>
                <button onClick={() => setCoverEditing(false)} className="p-1.5 rounded-md text-zinc-500 hover:text-white"><X size={14} /></button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setCoverDraft("");
                  setCoverEditing(true);
                }}
                className="mb-6 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <ImageSquare size={15} /> Add cover image
              </button>
            )}

            {/* Category chip */}
            <div className="mb-3">
              <span className="text-xs font-medium text-zinc-500">{fields.category}</span>
            </div>

            <AutoTextarea
              value={fields.title}
              onChange={v => update("title", v)}
              placeholder="Untitled article"
              className="text-4xl md:text-[2.75rem] leading-[1.15] font-semibold tracking-tight text-[#FAFAFA] placeholder:text-zinc-700"
              onEnter={() => document.getElementById("pp-excerpt")?.focus()}
            />
            <div className="mt-3">
              <AutoTextarea
                id="pp-excerpt"
                value={fields.excerpt}
                onChange={v => update("excerpt", v)}
                placeholder="Add a one-line summary — shown on cards and link previews"
                className="text-lg leading-relaxed text-zinc-400 placeholder:text-zinc-700"
                onEnter={() => e?.commands.focus("start")}
              />
            </div>

            {/* Toolbar */}
            {e && (
              <div className="sticky top-[7.5rem] z-10 mt-8 mb-6 -mx-2">
                <div className="flex items-center flex-wrap gap-0.5 px-1.5 py-1 rounded-xl border border-white/10 bg-[#0b0b0b]/95 backdrop-blur-md shadow-lg">
                  <ToolBtn title="Undo (Ctrl+Z)" onClick={() => e.chain().focus().undo().run()} disabled={!e.can().undo()}><ArrowCounterClockwise size={15} /></ToolBtn>
                  <ToolBtn title="Redo (Ctrl+Shift+Z)" onClick={() => e.chain().focus().redo().run()} disabled={!e.can().redo()}><ArrowClockwise size={15} /></ToolBtn>
                  <Divider />
                  <ToolBtn title="Paragraph" active={e.isActive("paragraph")} onClick={() => e.chain().focus().setParagraph().run()}><Paragraph size={15} /></ToolBtn>
                  <ToolBtn title="Heading (##)" active={e.isActive("heading", { level: 2 })} onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}><TextHTwo size={15} /></ToolBtn>
                  <ToolBtn title="Subheading (###)" active={e.isActive("heading", { level: 3 })} onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()}><TextHThree size={15} /></ToolBtn>
                  <Divider />
                  <ToolBtn title="Bold (Ctrl+B)" active={e.isActive("bold")} onClick={() => e.chain().focus().toggleBold().run()}><TextB size={15} weight="bold" /></ToolBtn>
                  <ToolBtn title="Italic (Ctrl+I)" active={e.isActive("italic")} onClick={() => e.chain().focus().toggleItalic().run()}><TextItalic size={15} /></ToolBtn>
                  <ToolBtn title="Strikethrough" active={e.isActive("strike")} onClick={() => e.chain().focus().toggleStrike().run()}><TextStrikethrough size={15} /></ToolBtn>
                  <ToolBtn title="Inline code" active={e.isActive("code")} onClick={() => e.chain().focus().toggleCode().run()}><Code size={15} /></ToolBtn>
                  <ToolBtn title="Link" active={e.isActive("link") || inline === "link"} onClick={() => openInline("link")}><LinkSimple size={15} /></ToolBtn>
                  <Divider />
                  <ToolBtn title="Bullet list" active={e.isActive("bulletList")} onClick={() => e.chain().focus().toggleBulletList().run()}><ListBullets size={15} /></ToolBtn>
                  <ToolBtn title="Numbered list" active={e.isActive("orderedList")} onClick={() => e.chain().focus().toggleOrderedList().run()}><ListNumbers size={15} /></ToolBtn>
                  <ToolBtn title="Checklist" active={e.isActive("taskList")} onClick={() => e.chain().focus().toggleTaskList().run()}><ListChecks size={15} /></ToolBtn>
                  <Divider />
                  <ToolBtn title="Quote" active={e.isActive("blockquote")} onClick={() => e.chain().focus().toggleBlockquote().run()}><Quotes size={15} /></ToolBtn>
                  <ToolBtn title="Code block" active={e.isActive("codeBlock")} onClick={() => e.chain().focus().toggleCodeBlock().run()}><CodeBlock size={15} /></ToolBtn>
                  <ToolBtn title="Divider" onClick={() => e.chain().focus().setHorizontalRule().run()}><Minus size={15} /></ToolBtn>
                  <ToolBtn title="Image" active={inline === "image"} onClick={() => openInline("image")}><ImageIcon size={15} /></ToolBtn>
                </div>

                {inline && (
                  <div className="mt-1.5 flex items-center gap-2 px-2 py-1.5 rounded-xl border border-white/10 bg-[#0b0b0b] shadow-lg animate-in fade-in slide-in-from-top-1 duration-100">
                    {inline === "link" ? <LinkSimple size={14} className="text-zinc-500 ml-1" /> : <ImageIcon size={14} className="text-zinc-500 ml-1" />}
                    <input
                      autoFocus
                      value={inlineValue}
                      onChange={ev => setInlineValue(ev.target.value)}
                      onKeyDown={ev => {
                        if (ev.key === "Enter") {
                          ev.preventDefault();
                          applyInline();
                        }
                        if (ev.key === "Escape") setInline(null);
                      }}
                      placeholder={inline === "link" ? "Paste a link — leave empty to remove" : "Paste an image URL"}
                      className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-600 focus:outline-none py-1"
                    />
                    <button onClick={applyInline} className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#FAFAFA] text-black hover:bg-white">
                      {inline === "link" ? "Apply" : "Insert"}
                    </button>
                    <button onClick={() => setInline(null)} className="p-1 rounded text-zinc-500 hover:text-white"><X size={13} /></button>
                  </div>
                )}
              </div>
            )}

            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Settings sidebar */}
        {showSidebar && (
          <aside className="hidden lg:block w-[300px] shrink-0 border-l border-white/10">
            <div className="sticky top-[7.5rem] max-h-[calc(100vh-7.5rem)] overflow-y-auto p-5 space-y-7">
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Category</h4>
                <div className="flex flex-wrap gap-1.5">
                  {ARTICLE_CATEGORIES.map(c => (
                    <button
                      key={c}
                      onClick={() => update("category", c)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        fields.category === c ? "bg-[#FAFAFA] text-black border-transparent font-medium" : "border-white/10 text-zinc-400 hover:text-white hover:border-white/25"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Author</h4>
                <input className={inputCls} value={fields.authorName} onChange={ev => update("authorName", ev.target.value)} placeholder="Name" />
                <input className={inputCls} value={fields.authorRole} onChange={ev => update("authorRole", ev.target.value)} placeholder="Role, e.g. Lead Designer" />
              </div>

              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Author link</h4>
                <input className={inputCls} value={fields.socialLabel} onChange={ev => update("socialLabel", ev.target.value)} placeholder="Label, e.g. Follow on X" />
                <input className={inputCls} value={fields.socialX} onChange={ev => update("socialX", ev.target.value)} placeholder="https://…" />
              </div>

              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Cover image</h4>
                <input className={inputCls} value={fields.coverImage} onChange={ev => update("coverImage", ev.target.value)} placeholder="https://…" />
              </div>

              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Details</h4>
                <dl className="text-xs space-y-1.5">
                  <div className="flex justify-between"><dt className="text-zinc-500">Words</dt><dd className="text-zinc-300 tabular-nums">{stats.words.toLocaleString()}</dd></div>
                  <div className="flex justify-between"><dt className="text-zinc-500">Reading time</dt><dd className="text-zinc-300">{stats.minutes} min</dd></div>
                  {meta.createdAt && <div className="flex justify-between"><dt className="text-zinc-500">Created</dt><dd className="text-zinc-300">{new Date(meta.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd></div>}
                  {isPublished && meta.publishedAt && <div className="flex justify-between"><dt className="text-zinc-500">Published</dt><dd className="text-zinc-300">{new Date(meta.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd></div>}
                </dl>
              </div>

              <div className="pt-5 border-t border-white/10">
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors">
                  <Trash size={14} /> Delete article
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={() => setConfirmDelete(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-white/10 bg-[#0d0d0d] p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-semibold text-[#FAFAFA]">Delete this article?</h3>
            <p className="text-xs text-zinc-500 mt-1.5">This permanently removes it{isPublished ? " and takes it off your public news page" : ""}.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmDelete(false)} className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5">Cancel</button>
              <button onClick={handleDelete} className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-500/90 hover:bg-red-500 text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
