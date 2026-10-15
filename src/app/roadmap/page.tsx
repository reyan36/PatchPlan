"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Compass, Plus, Trash, ShareNetwork, SlidersHorizontal, GearSix } from "@phosphor-icons/react";
import { Login } from "@/components/auth/Login";
import { Modal } from "@/components/ui/Modal";
import { ShareModal } from "@/components/ui/ShareModal";
import { RoadmapSettingsModal } from "@/components/ui/RoadmapSettingsModal";

type RoadmapItem = {
  id: string;
  title: string;
  column: string;
  familyId: string;
  category: string;
  bullets: string[];
};

export default function RoadmapPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeFamily, loading: familyLoading } = useFamily();
  
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [columns, setColumns] = useState<string[]>(["Far Future", "Future", "Later", "Soon", "Done"]);
  const [loading, setLoading] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);
  
  // UI State
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemColumn, setNewItemColumn] = useState("");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Gameplay");
  const [newItemBullets, setNewItemBullets] = useState("");
  const [shareCopied, setShareCopied] = useState(false);

  // Column management
  const [isManagingColumns, setIsManagingColumns] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  // Edit Item State
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [editItemTitle, setEditItemTitle] = useState("");
  const [editItemCategory, setEditItemCategory] = useState("");
  const [editItemColumn, setEditItemColumn] = useState("");
  const [editItemBullets, setEditItemBullets] = useState("");

  useEffect(() => {
    if (!user) return;
    const scopeId = activeFamily ? activeFamily.id : user.uid;

    // Fetch Config (Columns)
    const configRef = doc(db, "roadmap_configs", scopeId);
    const unsubConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        setColumns(docSnap.data().columns || ["Far Future", "Future", "Later", "Soon", "Done"]);
      } else {
        const defaultCols = ["Far Future", "Future", "Later", "Soon", "Done"];
        setColumns(defaultCols);
      }
      setConfigLoaded(true);
    }, (err) => {
      console.warn("Roadmap config listener:", err.message);
      setConfigLoaded(true);
    });

    const q = activeFamily
      ? query(collection(db, "roadmap"), where("familyId", "==", scopeId))
      : query(collection(db, "roadmap"), where("userId", "==", scopeId));

    const unsubItems = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as RoadmapItem[];
      if (!activeFamily) {
        data = data.filter((i: any) => !i.familyId); 
      }
      setItems(data);
      setLoading(false);
    }, (err) => {
      console.warn("Roadmap items listener:", err.message);
      setLoading(false);
    });
    
    return () => {
      unsubConfig();
      unsubItems();
    };
  }, [user, activeFamily]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newItemTitle.trim()) return;

    await addDoc(collection(db, "roadmap"), {
      userId: user.uid,
      familyId: activeFamily ? activeFamily.id : null,
      title: newItemTitle.trim(),
      column: newItemColumn,
      category: newItemCategory,
      bullets: newItemBullets.split('\n').filter(b => b.trim() !== ""),
      createdAt: serverTimestamp()
    });

    setIsAddingItem(false);
    setNewItemTitle("");
    setNewItemBullets("");
  };

  const deleteItem = async (id: string) => {
    await deleteDoc(doc(db, "roadmap", id));
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId) return;
    const item = items.find(i => i.id === itemId);
    if (item && item.column !== targetColumn) {
      await updateDoc(doc(db, "roadmap", itemId), { column: targetColumn });
    }
  };

  const openEditModal = (item: RoadmapItem) => {
    setEditingItem(item);
    setEditItemTitle(item.title);
    setEditItemCategory(item.category);
    setEditItemColumn(item.column);
    setEditItemBullets((item.bullets || []).join('\n'));
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    await updateDoc(doc(db, "roadmap", editingItem.id), {
      title: editItemTitle.trim(),
      column: editItemColumn,
      category: editItemCategory,
      bullets: editItemBullets.split('\n').filter(b => b.trim() !== ""),
    });

    setEditingItem(null);
  };

  // Share Modal
  const [isSharing, setIsSharing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim() || !user) return;
    const scopeId = activeFamily ? activeFamily.id : user.uid;
    const updatedColumns = [...columns, newColumnName.trim()];
    await updateDoc(doc(db, "roadmap_configs", scopeId), { columns: updatedColumns }).catch(async () => {
      // If doc doesn't exist yet, set it
      await setDoc(doc(db, "roadmap_configs", scopeId), { columns: updatedColumns });
    });
    setNewColumnName("");
  };

  const deleteColumn = async (columnName: string) => {
    if (!user) return;
    if (confirm(`Delete the "${columnName}" column? Tasks inside will NOT be deleted, but may become hidden until moved.`)) {
      const scopeId = activeFamily ? activeFamily.id : user.uid;
      const updatedColumns = columns.filter(c => c !== columnName);
      await updateDoc(doc(db, "roadmap_configs", scopeId), { columns: updatedColumns });
    }
  };

  if (authLoading || familyLoading || loading || !configLoaded) return <div className="p-8 text-muted-foreground animate-pulse">Loading Roadmap...</div>;
  if (!user) return <Login />;
  
  const scopeId = activeFamily ? activeFamily.id : user.uid;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#191919] text-gray-200 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <header className="px-8 py-6 border-b border-border/10 flex items-center justify-between shrink-0 bg-[#151515]">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
            <Compass size={32} weight="duotone" className="text-red-500" />
            Roadmap
          </h1>
          <p className="text-sm text-gray-400 mt-1">Cards are arranged by milestone status. Share to let players see your progress.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsManagingColumns(!isManagingColumns)}
            className="flex items-center gap-2 px-4 py-2 bg-muted/30 hover:bg-muted/50 border border-border/20 rounded-md text-sm font-medium transition-colors"
          >
            <SlidersHorizontal size={16} weight="duotone" />
            Columns
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-muted/30 hover:bg-muted/50 border border-border/20 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
          >
            <GearSix size={16} weight="duotone" />
            Settings
          </button>
          <button 
            onClick={() => setIsSharing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-muted/30 hover:bg-muted/50 border border-border/20 rounded-md text-sm font-medium transition-colors"
          >
            <ShareNetwork size={16} weight="duotone" />
            Share Public Link
          </button>
          <button 
            onClick={() => {
              setNewItemColumn(columns[0] || "");
              setIsAddingItem(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={16} weight="bold" />
            Add Milestone
          </button>
        </div>
      </header>

      {/* Kanban Board Area */}
      <div className="flex-1 overflow-x-auto p-8 custom-scrollbar bg-[#191919]">
        <div className="flex gap-6 h-full min-w-max">
          {columns.map(column => {
            const columnItems = items.filter(i => i.column === column);
            return (
              <div key={column} className="w-80 flex flex-col h-full group/col relative">
                {/* Column Header */}
                <div className="flex items-center gap-2 mb-4 shrink-0">
                  <div className={`w-3 h-3 rounded-full ${
                    column === "Far Future" ? "bg-gray-500" :
                    column === "Future" ? "bg-red-500/50" :
                    column === "Later" ? "bg-orange-500/50" :
                    column === "Soon" ? "bg-emerald-500/50" : "bg-blue-500/50"
                  }`} />
                  <h3 className="font-semibold text-gray-300">{column}</h3>
                  <span className="text-xs text-gray-500 ml-auto">{columnItems.length}</span>
                </div>

                {/* Column Items */}
                <div 
                  className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 pb-20"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, column)}
                >
                  {columnItems.map(item => (
                    <div 
                      key={item.id} 
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
                      className="bg-[#202020] border border-border/5 rounded-lg p-4 group cursor-pointer hover:border-border/20 transition-colors" 
                      onClick={() => openEditModal(item)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-gray-200">{item.title}</h4>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                        >
                          <Trash className="w-3.5 h-3.5" weight="duotone" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="inline-block px-2 py-0.5 bg-green-900/30 text-green-400 border border-green-800/50 rounded text-xs font-medium">
                          {item.category}
                        </span>
                        <select
                          value={item.column}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            updateDoc(doc(db, "roadmap", item.id), { column: e.target.value });
                          }}
                          className="text-xs bg-background border border-border rounded px-1 py-0.5 focus:outline-none"
                        >
                          {columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <ul className="text-sm text-gray-400 space-y-2 list-disc pl-4">
                        {item.bullets?.length > 0 ? (
                          item.bullets.map((b, i) => <li key={i}>{b}</li>)
                        ) : (
                          <li className="italic opacity-50">No details added.</li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddingItem} onClose={() => setIsAddingItem(false)} title="Add Roadmap Item">
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Feature / Area Name</label>
            <input
              type="text"
              value={newItemTitle}
              onChange={e => setNewItemTitle(e.target.value)}
              placeholder="e.g. Aircraft, Mod Support"
              className="w-full bg-background border border-border rounded-md px-4 py-2 focus:border-red-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Milestone</label>
              <select
                value={newItemColumn}
                onChange={e => setNewItemColumn(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2 focus:outline-none"
              >
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Category Tag</label>
              <input
                type="text"
                value={newItemCategory}
                onChange={e => setNewItemCategory(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Details (one per line)</label>
            <textarea
              value={newItemBullets}
              onChange={e => setNewItemBullets(e.target.value)}
              placeholder="- Detail 1&#10;- Detail 2"
              className="w-full bg-background border border-border rounded-md px-4 py-2 focus:border-red-500 focus:outline-none h-24"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsAddingItem(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600">Create</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Roadmap Item">
        <form onSubmit={handleEditItem} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Feature / Area Name</label>
            <input
              type="text"
              value={editItemTitle}
              onChange={e => setEditItemTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-4 py-2 focus:border-red-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Milestone</label>
              <select
                value={editItemColumn}
                onChange={e => setEditItemColumn(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2 focus:outline-none"
              >
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Category Tag</label>
              <input
                type="text"
                value={editItemCategory}
                onChange={e => setEditItemCategory(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Details (one per line)</label>
            <textarea
              value={editItemBullets}
              onChange={e => setEditItemBullets(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-4 py-2 focus:border-red-500 focus:outline-none h-24"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600">Save</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isManagingColumns} onClose={() => setIsManagingColumns(false)} title="Manage Milestones">
        <div className="space-y-6">
          <ul className="space-y-2">
            {columns.map(col => (
              <li key={col} className="flex items-center justify-between bg-card border border-border p-3 rounded-md">
                <span className="font-medium text-gray-200">{col}</span>
                <button onClick={() => deleteColumn(col)} className="text-gray-500 hover:text-red-500 p-1">
                  <Trash className="w-4 h-4" weight="duotone" />
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={handleAddColumn} className="flex gap-2">
            <input
              type="text"
              value={newColumnName}
              onChange={e => setNewColumnName(e.target.value)}
              placeholder="New milestone name..."
              className="flex-1 bg-background border border-border rounded-md px-4 py-2 focus:border-red-500 focus:outline-none"
            />
            <button type="submit" className="px-4 py-2 bg-muted text-foreground rounded-md text-sm font-medium hover:bg-muted/80">Add</button>
          </form>
        </div>
      </Modal>
      
      <RoadmapSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} scopeId={scopeId} />
      <ShareModal 
        isOpen={isSharing} 
        onClose={() => setIsSharing(false)} 
        scopeId={scopeId} 
        sharePath="/p/roadmap" 
        title="Share Roadmap" 
      />
    </div>
  );
}
