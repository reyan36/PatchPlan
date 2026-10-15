"use client";

import { useState, useEffect } from "react";
import { Plus, ArrowRight, Trash, Heart, Lightbulb } from "@phosphor-icons/react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, arrayUnion, arrayRemove, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { notifyNewIdea } from "@/lib/discord";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { useDirty } from "@/lib/DirtyContext";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function IdeaBoard() {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [ideaToDelete, setIdeaToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { activeFamily } = useFamily();
  const { handleNavigation } = useDirty();
  const router = useRouter();

  // ... (useEffect and other handlers remain the same)
  useEffect(() => {
    if (!user) return;
    
    const q = activeFamily
      ? query(collection(db, "ideas"), where("familyId", "==", activeFamily.id))
      : query(collection(db, "ideas"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let ideasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // If personal mode, filter out ideas that belong to a family
      if (!activeFamily) {
        ideasData = ideasData.filter((i: any) => !i.familyId);
      }
      
      // Sort by upvotes count
      ideasData.sort((a: any, b: any) => {
        const aVotes = a.upvotedBy?.length || 0;
        const bVotes = b.upvotedBy?.length || 0;
        return bVotes - aVotes;
      });
      
      setIdeas(ideasData.slice(0, 5));
      setLoading(false);
    }, (error) => {
      console.warn("IdeaBoard listener error:", error.message);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, activeFamily]);

  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newIdeaTitle.trim()) return;

    const docRef = await addDoc(collection(db, "ideas"), {
      userId: user.uid,
      familyId: activeFamily ? activeFamily.id : null,
      title: newIdeaTitle.trim(),
      upvotedBy: [], 
      content: "", 
      createdAt: serverTimestamp()
    });
    
    setIsModalOpen(false);
    setNewIdeaTitle("");
    
    router.push(`/ideas/${docRef.id}`);
  };

  const handleVote = async (e: React.MouseEvent, id: string, upvotedBy: string[]) => {
    e.stopPropagation();
    if (!user) return;
    
    const ideaRef = doc(db, "ideas", id);
    const hasVoted = upvotedBy?.includes(user.uid);
    
    await updateDoc(ideaRef, {
      upvotedBy: hasVoted ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setIdeaToDelete(id);
  };

  const confirmDelete = async () => {
    if (ideaToDelete) {
      await deleteDoc(doc(db, "ideas", ideaToDelete));
      setIdeaToDelete(null);
    }
  };

  return (
    <>
      <div className="border border-border rounded-lg p-6 bg-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Lightbulb size={20} weight="duotone" />
            </div>
            <h2 className="text-xl font-semibold">Idea Board</h2>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/ideas" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
              View All <ArrowRight size={14} weight="bold" />
            </Link>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 text-sm bg-muted hover:bg-border transition-colors px-3 py-1.5 rounded-md font-medium"
            >
              <Plus size={16} weight="bold" /> Add Idea
            </button>
          </div>
        </div>
        <div className="grid gap-4">
          {ideas.map((idea) => {
            const votesCount = idea.upvotedBy?.length || 0;
            const hasVoted = idea.upvotedBy?.includes(user?.uid);
            
            return (
              <div 
                key={idea.id} 
                onClick={() => router.push(`/ideas/${idea.id}`)}
                className="p-4 border border-border rounded-md bg-background flex items-center justify-between cursor-pointer hover:border-muted-foreground transition-colors group"
              >
                <div>
                  <h3 className="font-medium group-hover:text-primary transition-colors">{idea.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Click to open workspace</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{votesCount} votes</span>
                  <button 
                    onClick={(e) => handleVote(e, idea.id, idea.upvotedBy || [])}
                    className={`p-1.5 rounded-md transition-colors ${
                      hasVoted ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-muted hover:bg-border"
                    }`}
                    title={hasVoted ? "Remove vote" : "Upvote"}
                  >
                    <Heart size={16} weight={hasVoted ? "fill" : "regular"} className={hasVoted ? "text-red-500" : ""} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(e, idea.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-red-500/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Idea"
                  >
                    <Trash size={16} weight="duotone" />
                  </button>
                </div>
              </div>
            );
          })}
          {ideas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No ideas yet. Brainstorm something!</p>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!ideaToDelete} onClose={() => setIdeaToDelete(null)} title="Delete Idea">
        <p className="text-muted-foreground mb-6">
          Are you sure you want to permanently delete this idea? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => setIdeaToDelete(null)}
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

      {/* Create Idea Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Idea Workspace">
        <form onSubmit={handleAddIdea} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Idea Title</label>
            <input
              type="text"
              value={newIdeaTitle}
              onChange={(e) => setNewIdeaTitle(e.target.value)}
              placeholder="e.g., Co-op Multiplayer Mode"
              className="w-full bg-background border border-border rounded-md px-4 py-2 focus:outline-none focus:border-muted-foreground"
              required
              autoFocus
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
              Create Workspace
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}


