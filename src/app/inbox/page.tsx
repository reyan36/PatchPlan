"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useFamily, Family } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { CheckSquare, Clock, ArrowRight, Bell, AlertCircle } from "lucide-react";
import { Login } from "@/components/auth/Login";
import Link from "next/link";
import { TaskSidePanel } from "@/features/task-management/TaskSidePanel";

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Optional: Fetch family names so we can display which workspace the task is from
  const [familyNames, setFamilyNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    
    // Fetch all tasks assigned to the current user (across all families + personal)
    const q = query(collection(db, "tasks"), where("assigneeId", "==", user.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
      setTasks(tasksData);
      
      // Fetch names for any families we don't know yet
      const missingFamilyIds = Array.from(new Set(tasksData.map(t => t.familyId).filter(Boolean))) as string[];
      if (missingFamilyIds.length > 0) {
        const newNames = { ...familyNames };
        let fetchedAny = false;
        for (const id of missingFamilyIds) {
          if (!newNames[id]) {
            const fDoc = await getDoc(doc(db, "families", id));
            if (fDoc.exists()) {
              newNames[id] = fDoc.data().name;
              fetchedAny = true;
            }
          }
        }
        if (fetchedAny) setFamilyNames(newNames);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (authLoading || loading) return <div className="p-8 animate-pulse text-muted-foreground">Loading Inbox...</div>;
  if (!user) return <Login />;

  const pendingTasks = tasks.filter(t => t.column !== "Done");
  const completedTasks = tasks.filter(t => t.column === "Done");

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell className="text-primary" /> 
            Inbox
          </h1>
          <p className="text-muted-foreground">All tasks currently assigned to you across your workspaces.</p>
        </div>
      </header>

      {/* Pending Tasks Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <AlertCircle className="text-yellow-500 w-5 h-5" /> 
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
                className="group flex items-center justify-between p-4 bg-card border-l-4 border-l-yellow-500 border border-y-border border-r-border rounded-r-xl hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all cursor-pointer shadow-sm"
              >
                <div>
                  <h3 className="font-medium text-lg flex items-center gap-2 group-hover:text-yellow-500 transition-colors">
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="bg-muted px-2 py-0.5 rounded text-xs">
                      {task.familyId ? (familyNames[task.familyId] || "Loading...") : "Personal Workspace"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> In: {task.column}
                    </span>
                  </div>
                </div>
                <div className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5" />
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
            <CheckSquare className="w-5 h-5" /> 
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
