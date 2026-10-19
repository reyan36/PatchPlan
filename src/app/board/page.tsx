"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, DotsThree, ChatCircle, TextAlignLeft, SlidersHorizontal, MagnifyingGlass, Funnel, X, Trash, UserCircle, Megaphone } from "@phosphor-icons/react";
import { useAuth } from "@/lib/AuthContext";
import { useFamily, Member } from "@/lib/FamilyContext";
import { Login } from "@/components/auth/Login";
import { notifyTaskCompleted } from "@/lib/discord";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { TaskSidePanel } from "@/features/task-management/TaskSidePanel";

type Tag = "Art" | "Code" | "Audio" | "Design" | "Bug" | "Marketing" | "Other";

type Task = {
  id: string;
  title: string;
  column: string;
  tags: Tag[];
  familyId: string;
  assigneeId?: string;
  description?: string;
  reporters?: string[];
};

const TAGS: Tag[] = ["Art", "Code", "Audio", "Design", "Bug", "Marketing", "Other"];

const TAG_COLORS: Record<Tag, string> = {
  Art: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Code: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Audio: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Design: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Bug: "bg-red-500/20 text-red-400 border-red-500/30",
  Marketing: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function BoardPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeFamily, loading: familyLoading } = useFamily();
  
  // Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [edgeScrollEnabled, setEdgeScrollEnabled] = useState(true);
  
  // Loading States
  const [configLoaded, setConfigLoaded] = useState(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  
  // UI State
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskTag, setNewTaskTag] = useState<Tag | "">("");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  
  const [showSettings, setShowSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<Tag | "All">("All");

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mouseX = useRef<number | null>(null);

  // Deep link from search: /board?task=<id>
  useEffect(() => {
    const taskParam = new URLSearchParams(window.location.search).get("task");
    if (taskParam) setSelectedTaskId(taskParam);
  }, []);

  // Auto-scroll loop
  useEffect(() => {
    if (!edgeScrollEnabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.current = e.clientX;
    };
    
    // Only listen if we have a scroll container
    if (scrollContainerRef.current) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    let animationFrameId: number;
    const scrollLoop = () => {
      if (mouseX.current !== null && scrollContainerRef.current) {
        const edgeSize = 150;
        const maxSpeed = 15;
        const { innerWidth } = window;

        if (mouseX.current < edgeSize) {
          // Scroll left
          const speed = maxSpeed * (1 - mouseX.current / edgeSize);
          scrollContainerRef.current.scrollBy(-speed, 0);
        } else if (mouseX.current > innerWidth - edgeSize) {
          // Scroll right
          const speed = maxSpeed * (1 - (innerWidth - mouseX.current) / edgeSize);
          scrollContainerRef.current.scrollBy(speed, 0);
        }
      }
      animationFrameId = requestAnimationFrame(scrollLoop);
    };
    
    scrollLoop();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [edgeScrollEnabled, configLoaded, tasksLoaded]);

  // Firebase Subscriptions
  useEffect(() => {
    if (!user) return; // User must be logged in
    
    // If activeFamily is set, use it. Otherwise use user.uid (Personal Mode)
    const scopeId = activeFamily ? activeFamily.id : user.uid;

    // Board Config (Columns and Settings)
    const configRef = doc(db, "board_configs", scopeId);
    const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setColumns(data.columns || []);
        setEdgeScrollEnabled(data.edgeScrollEnabled ?? true);
      } else {
        // Create default config
        const defaultCols = ["Backlog", "To Do", "In Progress", "Review", "Done"];
        setDoc(configRef, { columns: defaultCols, edgeScrollEnabled: true });
        setColumns(defaultCols);
      }
      setConfigLoaded(true);
    }, (err) => {
      console.warn("Board config listener:", err.message);
      setConfigLoaded(true);
    });

    // Tasks Collection scoped to family or personal
    const q = activeFamily 
      ? query(collection(db, "tasks"), where("familyId", "==", activeFamily.id))
      : query(collection(db, "tasks"), where("userId", "==", user.uid));

    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      let tasksData = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Task[];
      
      // If we are in personal mode, filter out tasks that belong to a family 
      // (because a user's family tasks ALSO have their userId, but we only want pure personal tasks here)
      if (!activeFamily) {
        tasksData = tasksData.filter(t => !t.familyId);
      }
      
      setTasks(tasksData);
      setTasksLoaded(true);
    }, (err) => {
      console.warn("Board tasks listener:", err.message);
      setTasksLoaded(true);
    });

    return () => {
      unsubscribeConfig();
      unsubscribeTasks();
    };
  }, [user, activeFamily]);

  if (authLoading || familyLoading) return <div className="p-8 animate-pulse text-muted-foreground">Loading...</div>;
  if (!user) return <Login />;
  
  if (!configLoaded || !tasksLoaded) {
    return (
      <div className="h-[calc(100vh-6rem)] flex flex-col space-y-6">
        <header className="py-4 shrink-0">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </header>
        <div className="flex gap-6 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-80 shrink-0 bg-muted/20 border border-border/50 rounded-xl p-4">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("taskId", id);
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) e.target.style.opacity = "1";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("taskId");
    if (id) {
      const task = tasks.find(t => t.id === id);
      if (!task || task.column === targetColumn) return;
      const wasDone = task.column === "Done";

      // Optimistic update
      const oldTasks = [...tasks];
      setTasks(tasks.map(t => t.id === id ? { ...t, column: targetColumn } : t));
      
      try {
        await updateDoc(doc(db, "tasks", id), { column: targetColumn });
        if (targetColumn === "Done" && !wasDone) {
          notifyTaskCompleted(activeFamily ? activeFamily.id : user.uid, task.title, user?.displayName || user?.email?.split('@')[0] || "Someone");
        }
      } catch (err) {
        console.error("Failed to move task", err);
        setTasks(oldTasks); // Revert on failure
      }
    }
  };

  const handleAddTask = async (e: React.FormEvent, column: string) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      setAddingToColumn(null);
      return;
    }
    
    const tagsToSave = newTaskTag ? [newTaskTag] : [];
    
    await addDoc(collection(db, "tasks"), {
      title: newTaskTitle.trim(),
      column,
      tags: tagsToSave,
      userId: user.uid,
      familyId: activeFamily ? activeFamily.id : null, // Important: null for personal tasks
      assigneeId: activeFamily && newTaskAssignee ? newTaskAssignee : null,
      createdAt: serverTimestamp()
    });
    
    setNewTaskTitle("");
    setNewTaskTag("");
    setNewTaskAssignee("");
    setAddingToColumn(null);
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, "tasks", id));
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    
    const scopeId = activeFamily ? activeFamily.id : user.uid;
    const updatedColumns = [...columns, newColumnName.trim()];
    await updateDoc(doc(db, "board_configs", scopeId), { columns: updatedColumns });
    
    setNewColumnName("");
    setIsAddingColumn(false);
  };

  const deleteColumn = async (columnName: string) => {
    if (confirm(`Delete the "${columnName}" column? Tasks inside will NOT be deleted, but may become hidden until moved.`)) {
      const scopeId = activeFamily ? activeFamily.id : user.uid;
      const updatedColumns = columns.filter(c => c !== columnName);
      await updateDoc(doc(db, "board_configs", scopeId), { columns: updatedColumns });
    }
  };

  const toggleEdgeScroll = async () => {
    const scopeId = activeFamily ? activeFamily.id : user.uid;
    const newState = !edgeScrollEnabled;
    setEdgeScrollEnabled(newState);
    await updateDoc(doc(db, "board_configs", scopeId), { edgeScrollEnabled: newState });
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = filterTag === "All" || t.tags.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <header className="py-4 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Board</h1>
          <p className="text-muted-foreground">Drag and drop tasks across your pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Toggle */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${showFilters ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-border'}`}
          >
            <Funnel size={16} weight={showFilters ? "fill" : "duotone"} /> Filters
          </button>
          
          {/* Settings Toggle */}
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-2 bg-muted text-foreground text-sm font-medium rounded-md hover:bg-border transition-colors"
          >
            <SlidersHorizontal size={16} weight="duotone" /> Board Settings
          </button>
        </div>
      </header>

      {/* Filter Bar (Conditional) */}
      {showFilters && (
        <div className="mb-4 p-4 bg-card border border-border rounded-lg flex flex-wrap gap-4 items-center shrink-0 animate-in slide-in-from-top-2">
          <div className="relative w-64">
            <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Category:</span>
            <select 
              value={filterTag}
              onChange={e => setFilterTag(e.target.value as Tag | "All")}
              className="bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="All">All Categories</option>
              {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(searchQuery || filterTag !== "All") && (
            <button 
              onClick={() => { setSearchQuery(""); setFilterTag("All"); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X size={14} weight="bold" /> Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Board Scroll Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-grow overflow-x-auto overflow-y-hidden pb-4 flex gap-6 items-start relative select-none"
      >
        {columns.map(column => (
          <div 
            key={column}
            className="flex-shrink-0 w-80 max-h-full flex flex-col bg-muted/30 border border-border/50 rounded-xl"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column)}
          >
            {/* Column Header */}
            <div className="p-4 flex items-center justify-between shrink-0 group">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                {column}
                <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                  {filteredTasks.filter(t => t.column === column).length}
                </span>
              </h3>
              <button 
                onClick={() => deleteColumn(column)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity p-1"
                title="Delete Column"
              >
                <Trash size={16} weight="duotone" />
              </button>
            </div>

            {/* Task List */}
            <div className="flex-grow overflow-y-auto px-3 pb-2 space-y-3 custom-scrollbar min-h-[50px]">
              {filteredTasks.filter(t => t.column === column).map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="bg-card border border-border rounded-lg p-3 shadow-sm hover:border-primary/50 transition-colors cursor-grab active:cursor-grabbing group"
                >
                  {/* Tags */}
                  {task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {task.tags.map(tag => (
                        <span 
                          key={tag} 
                          className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${TAG_COLORS[tag]}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Title & Assignee/Delete */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <h4 className="text-sm font-medium leading-tight select-text">{task.title}</h4>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1"
                        title="Delete Task"
                      >
                        <Trash size={15} weight="duotone" />
                      </button>
                    </div>
                  </div>

                  {/* Footer indicators */}
                  <div className="flex items-center justify-between text-muted-foreground mt-2">
                    <div className="flex items-center gap-3">
                      {task.description && <TextAlignLeft size={14} weight="duotone" />}
                      {!!task.reporters?.length && (
                        <span className="inline-flex items-center gap-1 text-xs" title={`Reported by ${task.reporters.join(", ")}`}>
                          <Megaphone size={14} weight="duotone" /> {task.reporters.length}
                        </span>
                      )}
                    </div>
                    {task.assigneeId && activeFamily && (
                      <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs font-medium text-foreground">
                        <UserCircle size={14} weight="duotone" />
                        {activeFamily.members.find(m => m.uid === task.assigneeId)?.nickname || "Unknown"}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Task Input Form */}
              {addingToColumn === column && (
                <form onSubmit={(e) => handleAddTask(e, column)} className="bg-card border border-primary rounded-lg p-3 shadow-sm flex flex-col gap-3">
                  <input
                    autoFocus
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Task description..."
                    className="w-full bg-transparent text-sm focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <select 
                      value={newTaskTag}
                      onChange={(e) => setNewTaskTag(e.target.value as Tag)}
                      className="w-full bg-background border border-border rounded p-1 text-xs text-muted-foreground focus:outline-none"
                    >
                      <option value="">No Category</option>
                      {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {activeFamily && (
                      <select 
                        value={newTaskAssignee}
                        onChange={(e) => setNewTaskAssignee(e.target.value)}
                        className="w-full bg-background border border-border rounded p-1 text-xs text-muted-foreground focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {activeFamily.members.map(m => (
                          <option key={m.uid} value={m.uid}>{m.nickname}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 mt-1">
                    <button 
                      type="button" 
                      onClick={() => setAddingToColumn(null)}
                      className="px-2 py-1 text-xs hover:bg-muted rounded text-muted-foreground"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={!newTaskTitle.trim()}
                      className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded font-medium disabled:opacity-50"
                    >
                      Add Card
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Add Task Button */}
            {!addingToColumn && (
              <div className="p-2 shrink-0">
                <button 
                  onClick={() => {
                    setAddingToColumn(column);
                    setNewTaskTitle("");
                    setNewTaskTag("");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
                >
                  <Plus size={16} weight="bold" /> Add a card
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add New Column Button / Form */}
        <div className="flex-shrink-0 w-80 max-h-full">
          {isAddingColumn ? (
            <form onSubmit={handleAddColumn} className="bg-muted/30 border border-primary/50 rounded-xl p-3">
              <input
                autoFocus
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Column name..."
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none mb-2"
              />
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddingColumn(false)}
                  className="px-2 py-1 text-xs hover:bg-muted rounded text-muted-foreground"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newColumnName.trim()}
                  className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded font-medium disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => {
                setIsAddingColumn(true);
                setNewColumnName("");
              }}
              className="w-full flex items-center gap-2 px-4 py-3 bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground border border-border/50 border-dashed rounded-xl transition-colors font-medium text-sm"
            >
              <Plus size={16} weight="bold" /> Add New Column
            </button>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Board Settings">
        <div className="space-y-6">
          <label className="flex items-start justify-between cursor-pointer group">
            <div>
              <h3 className="font-medium group-hover:text-primary transition-colors">Edge Scrolling</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically scroll the board horizontally when you move your mouse to the left or right edges. Perfect for dragging tasks across a large board.
              </p>
            </div>
            <div className="relative inline-flex items-center cursor-pointer ml-4 mt-1">
              <input 
                type="checkbox" 
                checked={edgeScrollEnabled} 
                onChange={toggleEdgeScroll}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-primary-foreground after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-foreground after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-primary-foreground"></div>
            </div>
          </label>
        </div>
        <div className="mt-8 flex justify-end">
          <button 
            onClick={() => setShowSettings(false)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </Modal>

      {/* Task Details Side Panel */}
      {selectedTaskId && (
        <TaskSidePanel 
          taskId={selectedTaskId} 
          onClose={() => setSelectedTaskId(null)} 
          columns={columns} 
        />
      )}
    </div>
  );
}


