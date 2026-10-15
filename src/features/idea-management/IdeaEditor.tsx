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
import { Tldraw, exportToBlob, Editor as TldrawEditor } from "tldraw";
import "tldraw/tldraw.css";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  ArrowLeft, FloppyDisk, ShareNetwork, Code, CheckSquare, 
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
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIdea({ id: docSnap.id, ...data });
        if (editor && data.content) {
          editor.commands.setContent(data.content);
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

  const handleSave = async () => {
    if (!editor) return;
    setSaving(true);
    
    const htmlContent = editor.getHTML();
    const docRef = doc(db, "ideas", ideaId);
    
    await updateDoc(docRef, { content: htmlContent });
    
    setIsDirty(false);
    setTimeout(() => setSaving(false), 500);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ... (useEditor config remains the same)

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setIsDirty(false); // don't block navigation
    await deleteDoc(doc(db, "ideas", ideaId));
    router.push("/ideas");
  };

  const handleShare = () => {
    alert("Share link copied to clipboard! (Coming soon)");
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
      const blob = await exportToBlob({
        editor: tldrawEditor,
        ids: shapeIds,
        format: 'png',
      });
      
      const url = URL.createObjectURL(blob);
      
      editor.chain().focus().setImage({ src: url }).run();
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
    return <div className="p-8 text-center text-muted-foreground">Idea not found.</div>;
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
          <div>
            <h2 className="text-2xl font-bold">{idea.title}</h2>
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
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            <ShareNetwork className="w-4 h-4" weight="duotone" /> Share Link
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
            Design Document
          </button>
          <button
            onClick={() => setActiveTab("canvas")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === "canvas" 
                ? "border-b-2 border-primary text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Whiteboard Canvas
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
            <Tldraw 
              persistenceKey={`tldraw-${ideaId}`} 
              onMount={(editor) => setTldrawEditor(editor)}
            />
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
