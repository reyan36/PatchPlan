"use client";

import { useState, useEffect } from "react";
import { X, AlignLeft, User, LayoutGrid, CheckSquare, Tag as TagIcon, Calendar, Clock } from "lucide-react";

function formatTimeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  let interval = seconds / 31536000;
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " year ago" : " years ago");
  interval = seconds / 2592000;
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " month ago" : " months ago");
  interval = seconds / 86400;
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " day ago" : " days ago");
  interval = seconds / 3600;
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " hour ago" : " hours ago");
  interval = seconds / 60;
  return Math.floor(interval) + (Math.floor(interval) === 1 ? " minute ago" : " minutes ago");
}
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { notifyTaskCompleted } from "@/lib/discord";
import { useFamily } from "@/lib/FamilyContext";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

type Tag = "Art" | "Code" | "Audio" | "Design" | "Bug" | "Marketing" | "Other";
const TAGS: Tag[] = ["Art", "Code", "Audio", "Design", "Bug", "Marketing", "Other"];

interface TaskSidePanelProps {
  taskId: string;
  onClose: () => void;
  columns: string[];
}

export function TaskSidePanel({ taskId, onClose, columns }: TaskSidePanelProps) {
  const { activeFamily } = useFamily();
  const [task, setTask] = useState<any>(null);
  const [title, setTitle] = useState("");
  
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert focus:outline-none min-h-[150px] cursor-text',
      },
    },
    onUpdate: ({ editor }) => {
      // Debounce this in a real app, but for now we'll update on blur
    },
    onBlur: async ({ editor }) => {
      await updateDoc(doc(db, "tasks", taskId), { description: editor.getHTML() });
    }
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "tasks", taskId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTask(data);
        setTitle(data.title || "");
        if (editor && data.description && editor.getHTML() !== data.description) {
          editor.commands.setContent(data.description);
        }
      } else {
        onClose();
      }
    });
    return () => unsub();
  }, [taskId, editor, onClose]);

  if (!task) return null;

  const handleTitleBlur = async () => {
    if (title.trim() && title !== task.title) {
      await updateDoc(doc(db, "tasks", taskId), { title: title.trim() });
    }
  };

  const handleFieldChange = async (field: string, value: any) => {
    // Determine tags array if replacing entirely, but our UI currently just replaces it
    if (field === "tags") {
      await updateDoc(doc(db, "tasks", taskId), { tags: value ? [value] : [] });
    } else {
      const wasDone = task.column === "Done";
      await updateDoc(doc(db, "tasks", taskId), { [field]: value });
      if (field === "column" && value === "Done" && !wasDone) {
        if (activeFamily) {
          notifyTaskCompleted(activeFamily.id, task.title, "A Team Member");
        }
      }
    }
  };

  let createdDate: Date | null = null;
  if (task.createdAt) {
    createdDate = typeof task.createdAt.toDate === 'function' ? task.createdAt.toDate() : new Date(task.createdAt);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckSquare className="w-4 h-4" />
            <span>Task Details</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Title Edit */}
          <div>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full text-2xl font-semibold bg-transparent border-none resize-none focus:outline-none focus:ring-0 overflow-hidden"
              rows={2}
              placeholder="Task Title..."
            />
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            {/* Status / Column */}
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" /> Status
              </div>
              <select
                value={task.column}
                onChange={(e) => handleFieldChange("column", e.target.value)}
                className="flex-1 bg-muted/50 border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none"
              >
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Assignee */}
            {activeFamily && (
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" /> Assignee
                </div>
                <select
                  value={task.assigneeId || ""}
                  onChange={(e) => handleFieldChange("assigneeId", e.target.value || null)}
                  className="flex-1 bg-muted/50 border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {activeFamily.members.map(m => (
                    <option key={m.uid} value={m.uid}>{m.nickname}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tags / Category */}
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground flex items-center gap-2">
                <TagIcon className="w-4 h-4" /> Category
              </div>
              <select
                value={task.tags?.[0] || ""}
                onChange={(e) => handleFieldChange("tags", e.target.value)}
                className="flex-1 bg-muted/50 border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none"
              >
                <option value="">None</option>
                {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>            {/* Due Date */}
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Due Date
              </div>
              <input
                type="date"
                value={task.dueDate || ""}
                onChange={(e) => handleFieldChange("dueDate", e.target.value)}
                className="flex-1 bg-muted/50 border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none text-foreground color-scheme-dark"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
          
          {createdDate && (
             <div className="flex items-center gap-2 text-xs text-muted-foreground -mt-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Created {createdDate.toLocaleDateString()} at {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({formatTimeAgo(createdDate)})</span>
             </div>
          )}

          <hr className="border-border" />

          {/* Rich Description */}
          <div>
            <div className="flex items-center gap-2 text-muted-foreground font-medium mb-3">
              <AlignLeft className="w-5 h-5" />
              <h3>Description</h3>
            </div>
            
            <div className="border border-border rounded-lg bg-muted/20 focus-within:border-primary/50 focus-within:bg-background transition-colors">
              {/* Toolbar */}
              {editor && (
                <div className="flex items-center gap-1 border-b border-border p-2 bg-muted/30 flex-wrap">
                  <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`px-2 py-1 text-xs rounded font-bold ${editor.isActive('bold') ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                  >
                    B
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`px-2 py-1 text-xs rounded italic ${editor.isActive('italic') ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                  >
                    I
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`px-2 py-1 text-xs rounded line-through ${editor.isActive('strike') ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                  >
                    S
                  </button>
                  <div className="w-px h-4 bg-border mx-1" />
                  <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`px-2 py-1 text-xs rounded ${editor.isActive('bulletList') ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                  >
                    • List
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`px-2 py-1 text-xs rounded ${editor.isActive('orderedList') ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                  >
                    1. List
                  </button>
                  <div className="w-px h-4 bg-border mx-1" />
                  <button
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={`px-2 py-1 text-xs rounded ${editor.isActive('codeBlock') ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                  >
                    Code
                  </button>
                </div>
              )}
              
              <div className="p-4">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}







