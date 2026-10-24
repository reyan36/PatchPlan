"use client";

import { useState, useEffect, useRef } from "react";
import { assignedTasks, useLiveQuery } from "@/lib/live";
import { useAuth } from "@/lib/AuthContext";
import { useFamily, Family } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Bell, Clock, ArrowRight, CheckSquare, WarningCircle } from "@phosphor-icons/react";
import { Login } from "@/components/auth/LazyLogin";
import Link from "next/link";
import dynamic from "next/dynamic";

// The rich-text editor in the task panel is large; it loads when a task is opened.
const TaskSidePanel = dynamic(() => import("@/features/task-management/TaskSidePanel").then((m) => m.TaskSidePanel), { ssr: false });

type Task = {
  id: string;
  title: string;
  column: string;
  tags: string[];
  familyId: string | null;
  assigneeId?: string;
  createdAt: any;
};

export default function InboxPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeFamily } = useFamily();
  // Shared with the navbar badge, so opening the inbox needs no new listener.
  const assigned = user ? assignedTasks(user.uid) : null;
  const live = useLiveQuery<Task>(assigned?.key ?? null, (fs) => assigned!.build(fs));
  const tasks = live.data ?? [];
  const loading = !live.ready;
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Optional: Fetch family names so we can display which workspace the task is from
  const [familyNames, setFamilyNames] = useState<Record<string, string>>({});
  const knownFamilies = useRef(new Set<string>());

  // Names for workspaces we haven't looked up yet, in parallel. Unreadable ones are skipped.
  useEffect(() => {
    const missing = (Array.from(new Set(tasks.map((t) => t.familyId).filter(Boolean))) as string[]).filter((id) => !knownFamilies.current.has(id));
    if (!missing.length) return;
    missing.forEach((id) => knownFamilies.current.add(id));
    Promise.all(missing.map((id) => getDoc(doc(db, "families", id)).catch(() => null))).then((snaps) => {
      const found: Record<string, string> = {};
      snaps.forEach((s) => { if (s?.exists()) found[s.id] = s.data().name; });
      if (Object.keys(found).length) setFamilyNames((prev) => ({ ...prev, ...found }));
    });
  }, [tasks]);

  if (authLoading || loading) return <div className="p-8 animate-pulse text-muted-foreground">Loading Inbox...</div>;
  if (!user) return <Login />;

  const pendingTasks = tasks.filter(t => t.column !== "Done");
  const completedTasks = tasks.filter(t => t.column === "Done");

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell size={28} weight="duotone" className="text-primary" /> 
            Inbox
          </h1>
          <p className="text-muted-foreground">All tasks currently assigned to you across your workspaces.</p>
        </div>
      </header>

      {/* Pending Tasks Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <WarningCircle size={20} weight="duotone" className="text-amber-500" /> 
          Pending Tasks
          <span className="text-sm font-normal text-muted-foreground ml-2">({pendingTasks.length})</span>
        </h2>
        
        {pendingTasks.length === 0 ? (
          <div className="p-8 border border-border border-dashed rounded-xl text-center text-muted-foreground">
            You're all caught up! No pending tasks assigned to you.
          </div>
        ) : (
          <div className="grid gap-3">
            {pendingTasks.map(task => (
              <div 
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="group flex items-center justify-between p-4 bg-card border-l-4 border-l-amber-500 border border-y-border border-r-border rounded-r-xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-all cursor-pointer shadow-sm"
              >
                <div>
                  <h3 className="font-medium text-lg flex items-center gap-2 group-hover:text-amber-500 transition-colors">
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="bg-muted px-2 py-0.5 rounded text-xs">
                      {task.familyId ? (familyNames[task.familyId] || "Loading...") : "Personal Workspace"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} weight="regular" /> In: {task.column}
                    </span>
                  </div>
                </div>
                <div className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight size={18} weight="bold" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Tasks Section */}
      {completedTasks.length > 0 && (
        <div className="space-y-4 pt-8">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-muted-foreground">
            <CheckSquare size={20} weight="duotone" /> 
            Recently Completed
          </h2>
          <div className="grid gap-3 opacity-60 hover:opacity-100 transition-opacity">
            {completedTasks.map(task => (
              <div 
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="group flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl hover:border-border/80 transition-all cursor-pointer"
              >
                <div>
                  <h3 className="font-medium line-through">{task.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="bg-muted px-2 py-0.5 rounded text-xs">
                      {task.familyId ? (familyNames[task.familyId] || "Unknown") : "Personal"}
                    </span>
                    <span>Column: {task.column}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTaskId && (
        <TaskSidePanel 
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          columns={["Backlog", "To Do", "In Progress", "Review", "Done"]} // We pass default columns for inbox view since it can span families
        />
      )}
    </div>
  );
}
