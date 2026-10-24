"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlock from "@tiptap/extension-code-block";
import { CustomImage } from "./CustomImageNode";
import { LinkMention } from "./LinkMentionNode";
import dynamic from "next/dynamic";
import type { Editor as TldrawEditor } from "tldraw";

// tldraw is large; load it only when the Canvas tab is first opened.
const IdeaCanvas = dynamic(() => import("./IdeaCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground animate-pulse">Loading canvas…</div>,
});
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { compressImage } from "@/lib/beta/image";
import { IDEA_STATUS, statusOf, type Idea, type IdeaStatus } from "./ideaMeta";
import { deleteIdea, readIdeaBody, saveIdeaBody } from "./ideaStore";
import Link from "next/link";
import { PillSelect } from "@/components/ui/PillSelect";
import {
  ArrowLeft, FloppyDisk, LinkSimple, Check, Kanban, Code, CheckSquare,
  TextAlignLeft, TextAlignCenter, TextAlignRight, Camera, Trash,
  TextT, TextHOne, TextHTwo, TextHThree, ListBullets, ListNumbers, Quotes
} from "@phosphor-icons/react";
import { useDirty } from "@/lib/DirtyContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

export function IdeaEditor({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const [idea, setIdea] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "canvas">("text");
  const [tldrawEditor, setTldrawEditor] = useState<TldrawEditor | null>(null);
  const [canvasOpened, setCanvasOpened] = useState(false);
  const [title, setTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);
  const { user } = useAuth();
  const { activeFamily } = useFamily();

  // Keep the canvas mounted after the first visit so drawings survive tab switches.
  useEffect(() => {
    if (activeTab === "canvas") setCanvasOpened(true);
  }, [activeTab]);
  const { setIsDirty, handleNavigation } = useDirty();

  const editor = useEditor({
    extensions: [
      StarterKit,
      CustomImage,
      LinkMention,
      CodeBlock,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[400px] pb-32",
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (text) {
          const isUrl = /^https?:\/\//i.test(text.trim());
          if (isUrl && view.state.selection.empty) {
            // Wait for editor commands to be ready (we use a tiny timeout or just let tiptap handle it in next tick)
            setTimeout(() => {
              editor?.commands.insertContent({
                type: 'linkMention',
                attrs: { href: text.trim() }
              });
              editor?.commands.insertContent(' ');
            }, 0);
            return true; // handled
          }
        }
        return false;
      }
    },
    onUpdate: () => {
      setIsDirty(true);
    }
  });

  useEffect(() => {
    async function fetchIdea() {
      const docRef = doc(db, "ideas", ideaId);
      // A doc from another workspace (or one that was deleted) is refused by the rules: show "not found".
      const docSnap = await getDoc(docRef).catch(() => null);
      if (docSnap?.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Idea;
        // The doc text and whiteboard live in idea_bodies (see ideaStore.ts); older ideas keep them here.
        const body = await readIdeaBody(data);
        setIdea({ ...data, content: body.content, canvas: body.canvas, bodySplit: body.fromBody });
        setTitle(data.title || "");
        if (editor && body.content) {
          editor.commands.setContent(body.content);
          setIsDirty(false); // Reset dirty after load
        }
      }
      setLoading(false);
    }
    fetchIdea();
  }, [ideaId, editor, setIsDirty]);

  // Browser-level guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    // Only attach if editor is updated. We'd need to know isDirty here, but we can't easily without adding it to dependency array, which triggers re-renders. We'll just trust DirtyContext.
    // Actually, we can add it to DirtyContext provider!
  }, []);

  // Saves the doc and, if it was opened, the whiteboard, so teammates and other devices see both.
  const handleSave = async () => {
    if (!editor || !idea) return;
    setSaving(true);
    setNotice(null);
    try {
      // An idea not split yet carries its saved whiteboard over even if the board wasn't opened.
      let canvas: string | undefined = idea && !idea.bodySplit ? idea.canvas : undefined;
      if (tldrawEditor) {
        const { getSnapshot } = await import("tldraw");
        const next = JSON.stringify(getSnapshot(tldrawEditor.store).document);
        // Firestore docs cap at 1 MB; very large boards stay on this device only.
        if (next.length < 700_000) canvas = next;
        else setNotice("The whiteboard is too large to sync, so it's saved on this device only. Try removing big images.");
      }
      await saveIdeaBody(idea, { content: editor.getHTML(), canvas });
      setIdea((cur: any) => ({ ...cur, bodySplit: true, ...(canvas !== undefined ? { canvas } : {}) }));
      setIsDirty(false);
    } catch (err) {
      setNotice(
        err instanceof Error && /size|large|exceed/i.test(err.message)
          ? "This doc is too large to save. Remove some images and try again."
          : "Couldn't save. Check your connection and try again."
      );
    } finally {
      setTimeout(() => setSaving(false), 300);
    }
  };

  // Loads the saved whiteboard (if any) and marks the doc unsaved when the board changes.
  const handleCanvasMount = async (ed: TldrawEditor) => {
    setTldrawEditor(ed);
    if (idea?.canvas) {
      try {
        const { loadSnapshot } = await import("tldraw");
        loadSnapshot(ed.store, JSON.parse(idea.canvas));
      } catch (err) {
        console.warn("Couldn't load the saved whiteboard", err);
      }
    }
    ed.store.listen(() => setIsDirty(true), { source: "user", scope: "document" });
  };

  const saveTitle = async () => {
    const next = title.trim();
    if (!next || next === idea?.title) {
      setTitle(idea?.title || "");
      return;
    }
    await updateDoc(doc(db, "ideas", ideaId), { title: next, updatedAt: serverTimestamp() });
    setIdea((cur: any) => ({ ...cur, title: next }));
  };

  const setStatus = async (status: IdeaStatus) => {
    setIdea((cur: any) => ({ ...cur, status }));
    await updateDoc(doc(db, "ideas", ideaId), { status, updatedAt: serverTimestamp() });
  };

  // Turns the idea into a board task (first column, Design tag) that links back here.
  const addToBoard = async () => {
    if (!user || !idea) return;
    setAddingTask(true);
    try {
      const scopeId = activeFamily ? activeFamily.id : user.uid;
      const board = await getDoc(doc(db, "board_configs", scopeId)).catch(() => null);
      const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
      const task = await addDoc(collection(db, "tasks"), {
        title: idea.title,
        column: board?.data()?.columns?.[0] || "Backlog",
        tags: ["Design"],
        description: `<p>From the idea <a href="/ideas/${ideaId}">${esc(idea.title)}</a>.</p>`,
        userId: user.uid,
        familyId: activeFamily ? activeFamily.id : null,
        assigneeId: null,
        source: "idea",
        ideaId,
        createdAt: serverTimestamp(),
      });
      const current = statusOf(idea.status).key;
      const status = current === "idea" || current === "exploring" ? "planned" : current;
      await updateDoc(doc(db, "ideas", ideaId), { taskId: task.id, status, updatedAt: serverTimestamp() });
      setIdea((cur: any) => ({ ...cur, taskId: task.id, status }));
    } finally {
      setAddingTask(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ... (useEditor config remains the same)

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setIsDirty(false); // don't block navigation
    await deleteIdea(ideaId);
    router.push("/ideas");
  };

  // Link for teammates in this workspace.
  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/ideas/${ideaId}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleBackClick = () => {
    handleNavigation("/ideas");
  };

  const handleInsertSnapshot = async () => {
    if (!tldrawEditor || !editor) return;

    const shapeIds = Array.from(tldrawEditor.getCurrentPageShapeIds());
    if (shapeIds.length === 0) {
      alert("Canvas is empty. Draw something first!");
      return;
    }

    try {
      const { exportToBlob } = await import("tldraw");
      const blob = await exportToBlob({
        editor: tldrawEditor,
        ids: shapeIds,
        format: 'png',
      });

      // Stored inline (compressed) so the image survives reloads; a blob: URL would not.
      const { dataUrl } = await compressImage(new File([blob], "whiteboard.png", { type: "image/png" }));
      editor.chain().focus().setImage({ src: dataUrl }).run();
      setActiveTab("text");
      setIsDirty(true);
    } catch (err) {
      console.error("Failed to snapshot canvas", err);
      alert("Failed to create snapshot.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <Skeleton className="w-9 h-9 rounded-md" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
        <div className="flex justify-between border-b border-border mb-4">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="flex-grow bg-card border border-border rounded-lg p-8">
          <Skeleton className="h-full w-full opacity-50" />
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="p-8 text-center text-muted-foreground space-y-3">
        <p>This doc doesn&apos;t exist, or it belongs to a workspace you&apos;re not in.</p>
        <Link href="/ideas" className="inline-block text-sm text-zinc-300 hover:text-white underline underline-offset-4">Back to Ideas</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackClick}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              aria-label="Title"
              maxLength={140}
              className="w-full max-w-[52vw] bg-transparent text-2xl font-bold rounded-md px-1 -mx-1 outline-none hover:bg-white/[0.03] focus:bg-white/[0.04]"
            />
            <div className="flex items-center gap-2 mt-1">
              <PillSelect
                value={statusOf(idea.status).key}
                options={IDEA_STATUS.map((s) => ({ value: s.key, label: s.label }))}
                onChange={(v) => setStatus(v as IdeaStatus)}
                tone={statusOf(idea.status).tone}
                dot={statusOf(idea.status).dot}
                ariaLabel="Status"
              />
              {notice && <span className="text-xs text-amber-300">{notice}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDeleteClick}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
            title="Delete Workspace"
          >
            <Trash className="w-4 h-4" weight="duotone" />
          </button>
          {idea.taskId ? (
            <Link href={`/board?task=${idea.taskId}`} className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors">
              <Kanban className="w-4 h-4" weight="duotone" /> Open task
            </Link>
          ) : (
            <button
              onClick={addToBoard}
              disabled={addingTask}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Kanban className="w-4 h-4" weight="duotone" /> {addingTask ? "Adding…" : "Add to board"}
            </button>
          )}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <LinkSimple className="w-4 h-4" />} {copied ? "Copied" : "Copy link"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition-opacity"
          >
            <FloppyDisk className="w-4 h-4" weight="duotone" /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-between border-b border-border mb-4">
        <div className="flex">
          <button
            onClick={() => setActiveTab("text")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === "text"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Doc
          </button>
          <button
            onClick={() => setActiveTab("canvas")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === "canvas"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Whiteboard
          </button>
        </div>

        {/* Contextual Action based on Tab */}
        {activeTab === "canvas" && (
          <button
            onClick={handleInsertSnapshot}
            className="flex items-center gap-2 px-3 py-1 mb-2 text-xs font-medium bg-muted text-foreground rounded hover:bg-border transition-colors"
          >
            <Camera className="w-3 h-3" weight="duotone" /> Insert Snapshot to Doc
          </button>
        )}
      </div>

      {/* Workspace Area */}
      <div className="flex-grow overflow-hidden bg-card border border-border rounded-lg relative">

        {/* Rich Text Editor Tab */}
        <div className={`absolute inset-0 flex flex-col ${activeTab === "text" ? "flex" : "hidden"}`}>

          {/* Advanced Formatting Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-background/50">
            {/* Text Style */}
            <button
              onClick={() => editor?.chain().focus().setParagraph().run()}
              className={`p-1.5 rounded ${editor?.isActive("paragraph") ? "bg-muted text-primary" : "hover:bg-muted"}`}
              title="Normal Text"
            >
              <TextT className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded ${editor?.isActive("heading", { level: 1 }) ? "bg-muted text-primary" : "hover:bg-muted"}`}
              title="Heading 1"
            >
              <TextHOne className="w-3.5 h-3.5" weight="bold" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded ${editor?.isActive("heading", { level: 2 }) ? "bg-muted text-primary" : "hover:bg-muted"}`}
              title="Heading 2"
            >
              <TextHTwo className="w-3.5 h-3.5" weight="bold" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1.5 rounded ${editor?.isActive("heading", { level: 3 }) ? "bg-muted text-primary" : "hover:bg-muted"}`}
              title="Heading 3"
            >
              <TextHThree className="w-3.5 h-3.5" weight="bold" />
            </button>

            <div className="w-px h-4 bg-border mx-1" />

            {/* Formatting */}
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`px-2 py-1.5 text-xs rounded font-bold ${editor?.isActive("bold") ? "bg-muted text-primary" : "hover:bg-muted"}`}
            >
              B
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`px-2 py-1.5 text-xs rounded italic ${editor?.isActive("italic") ? "bg-muted text-primary" : "hover:bg-muted"}`}
            >
              I
            </button>

            <div className="w-px h-4 bg-border mx-1" />

            {/* Alignment */}
            <button
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              className={`p-1.5 rounded ${editor?.isActive({ textAlign: 'left' }) ? "bg-muted text-primary" : "hover:bg-muted"}`}
              title="Align Left"
            >
              <TextAlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              className={`p-1.5 rounded ${editor?.isActive({ textAlign: 'center' }) ? "bg-muted text-primary" : "hover:bg-muted"}`}
              title="Align Center"
            >
              <TextAlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              className={`p-1.5 rounded ${editor?.isActive({ textAlign: 'right' }) ? "bg-muted text-primary" : "hover:bg-muted"}`}
              title="Align Right"
            >
              <TextAlignRight className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-border mx-1" />

            {/* Lists & Blocks */}
            <button
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded ${editor?.isActive("bulletList") ? "bg-muted text-primary" : "hover:bg-muted"}`}
              title="Bullet List"
            >
              <ListBullets className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded ${editor?.isActive("orderedList") ? "bg-muted text-primary" : "hover:bg-muted"}`}
              title="Ordered List"
            >
              <ListNumbers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
              className={`p-1.5 rounded ${editor?.isActive("taskList") ? "bg-muted text-primary" : "hover:bg-muted"}`}
              title="Task List"
            >
              <CheckSquare className="w-3.5 h-3.5" weight="duotone" />
            </button>

            <div className="w-px h-4 bg-border mx-1" />

            <button
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded ${editor?.isActive("blockquote") ? "bg-muted text-primary" : "hover:bg-muted"}`}
              title="Blockquote"
            >
              <Quotes className="w-3.5 h-3.5" weight="duotone" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              className={`p-1.5 rounded ${editor?.isActive("codeBlock") ? "bg-muted text-primary" : "hover:bg-muted"}`}
              title="Code Block"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-8">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Tldraw Canvas Tab */}
        <div className={`absolute inset-0 ${activeTab === "canvas" ? "block" : "hidden"}`}>
          <div className="h-full w-full" style={{ filter: "invert(1) hue-rotate(180deg)" }}>
            {canvasOpened && <IdeaCanvas ideaId={ideaId} onMount={handleCanvasMount} />}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Workspace">
        <p className="text-muted-foreground mb-6">
          Are you sure you want to permanently delete this entire workspace? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => setShowDeleteModal(false)}
            className="px-4 py-2 text-sm font-medium hover:text-muted-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>

    </div>
  );
}
