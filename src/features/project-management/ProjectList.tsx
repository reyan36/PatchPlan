"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { collection, onSnapshot, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { Modal } from "@/components/ui/Modal";

export function ProjectList() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectType, setNewProjectType] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, "projects"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsData);
    });
    
    return () => unsubscribe();
  }, [user]);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjectName.trim()) return;
    
    await addDoc(collection(db, "projects"), {
      userId: user.uid,
      name: newProjectName.trim(),
      type: newProjectType.trim() || "Misc",
      status: "Planning",
      createdAt: serverTimestamp()
    });
    
    setIsModalOpen(false);
    setNewProjectName("");
    setNewProjectType("");
  };

  return (
    <>
      <div className="border border-border rounded-lg p-6 bg-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Active Projects</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
        <div className="space-y-4">
          {projects.map((project) => (
            <div key={project.id} className="p-4 border border-border rounded-md hover:border-muted-foreground transition-colors flex justify-between items-center cursor-pointer">
              <div>
                <h3 className="font-medium">{project.name}</h3>
                <p className="text-sm text-muted-foreground">{project.type}</p>
              </div>
              <span className="text-xs px-2 py-1 bg-muted rounded-full">{project.status}</span>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No projects yet. Create one!</p>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Project">
        <form onSubmit={handleAddProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g., Project Alpha"
              className="w-full bg-background border border-border rounded-md px-4 py-2 focus:outline-none focus:border-muted-foreground"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Project Type (Optional)</label>
            <input
              type="text"
              value={newProjectType}
              onChange={(e) => setNewProjectType(e.target.value)}
              placeholder="e.g., RPG, Shooter"
              className="w-full bg-background border border-border rounded-md px-4 py-2 focus:outline-none focus:border-muted-foreground"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium hover:text-muted-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Create Project
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
