"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { notifyNewsPublished } from "@/lib/discord";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ArrowLeft, FloppyDisk, Globe, Image as ImageIcon } from "@phosphor-icons/react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

export default function ArticleEditor({ params }: { params: { articleId: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [socialX, setSocialX] = useState("");
    const [socialLabel, setSocialLabel] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [initialStatus, setInitialStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: true })
    ],
    content: "",
    editorProps: {
      attributes: {
        class: 'prose prose-sm md:prose-base lg:prose-lg dark:prose-invert focus:outline-none min-h-[500px] w-full max-w-none',
      },
    },
  });

  useEffect(() => {
    if (!user) return;
    
    const fetchArticle = async () => {
      const docSnap = await getDoc(doc(db, "articles", params.articleId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTitle(data.title || "");
        setExcerpt(data.excerpt || "");
        setCoverImage(data.coverImage || "");
        setAuthorName(data.authorName || "");
        setAuthorRole(data.authorRole || "");
        setSocialX(data.socialX || "");
        setSocialLabel(data.socialLabel || "");
        setStatus(data.status || "draft");
        setInitialStatus(data.status || "draft");
        if (editor && data.content) {
          editor.commands.setContent(data.content);
        }
      }
      setLoading(false);
    };
    
    fetchArticle();
  }, [user, params.articleId, editor]);

  const handleSave = async () => {
    if (!user || !editor) return;
    setSaving(true);
    
    await updateDoc(doc(db, "articles", params.articleId), {
      title,
      excerpt,
      coverImage,
      authorName,
      authorRole,
      socialX,
      socialLabel,
      status,
      content: editor.getHTML()
    });
    
    if (status === "published" && initialStatus !== "published") {
      const docSnap = await getDoc(doc(db, "articles", params.articleId));
      if (docSnap.exists()) {
        notifyNewsPublished(docSnap.data().familyId, title, authorName || user.displayName || "Someone");
      }
      setInitialStatus("published");
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 animate-pulse text-muted-foreground">Loading Editor...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8 px-4">
      <header className="flex items-center justify-between">
        <button 
          onClick={() => router.push("/news")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to News
        </button>
        <div className="flex items-center gap-4">
          <select 
            value={status}
            onChange={e => setStatus(e.target.value as any)}
            className={`px-3 py-1.5 text-sm font-semibold uppercase tracking-wider rounded-md border ${status === 'published' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <FloppyDisk className="w-4 h-4" weight="duotone" />
            {saving ? "Saving..." : "Save Article"}
          </button>
        </div>
      </header>

      <div className="space-y-4 bg-card border border-border p-6 rounded-xl shadow-sm">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Article Title"
          className="w-full text-4xl font-bold bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/30"
        />
        <textarea
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          placeholder="Write a short excerpt summarizing this update..."
          className="w-full text-lg text-muted-foreground bg-transparent border-none focus:outline-none resize-none h-16"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              placeholder="Cover Image URL"
              className="flex-1 text-sm bg-transparent border-b border-border/50 focus:border-primary focus:outline-none pb-1"
            />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={socialLabel}
              onChange={e => setSocialLabel(e.target.value)}
              placeholder="Link Text (e.g. Website, X, Portfolio)"
              className="w-1/3 text-sm bg-transparent border-b border-border/50 focus:border-primary focus:outline-none pb-1"
            />
            <input
              type="text"
              value={socialX}
              onChange={e => setSocialX(e.target.value)}
              placeholder="https://..."
              className="flex-1 text-sm bg-transparent border-b border-border/50 focus:border-primary focus:outline-none pb-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              placeholder="Author Name"
              className="flex-1 text-sm bg-transparent border-b border-border/50 focus:border-primary focus:outline-none pb-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={authorRole}
              onChange={e => setAuthorRole(e.target.value)}
              placeholder="Author Role (e.g. Lead Developer)"
              className="flex-1 text-sm bg-transparent border-b border-border/50 focus:border-primary focus:outline-none pb-1"
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        {editor && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 border-b border-border flex-wrap shrink-0">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={`px-2 py-1 rounded text-sm ${editor.isActive('bold') ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-muted font-bold'}`}>B</button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-2 py-1 rounded text-sm ${editor.isActive('italic') ? 'bg-primary/20 text-primary italic' : 'hover:bg-muted italic'}`}>I</button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`px-2 py-1 rounded text-sm font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}>H2</button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`px-2 py-1 rounded text-sm font-bold ${editor.isActive('heading', { level: 3 }) ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}>H3</button>
            <div className="w-px h-4 bg-border mx-1" />
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-2 py-1 rounded text-sm ${editor.isActive('bulletList') ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}>• List</button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`px-2 py-1 rounded text-sm ${editor.isActive('orderedList') ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}>1. List</button>
            <div className="w-px h-4 bg-border mx-1" />
            <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`px-2 py-1 rounded text-sm ${editor.isActive('blockquote') ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}>Quote</button>
            <button 
              onClick={() => {
                const url = window.prompt('Image URL:');
                if (url) editor.chain().focus().setImage({ src: url }).run();
              }} 
              className="px-2 py-1 rounded text-sm hover:bg-muted flex items-center gap-1"
            >
              <ImageIcon className="w-3 h-3" /> Image
            </button>
          </div>
        )}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}








