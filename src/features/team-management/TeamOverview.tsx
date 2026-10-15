"use client";

import { useState, useEffect } from "react";
import { Plus, Users } from "@phosphor-icons/react";
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, increment, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { Modal } from "@/components/ui/Modal";

export function TeamOverview() {
  const [teams, setTeams] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, "teams"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeams(teamsData);
    }, (error) => {
      console.warn("Teams listener error:", error.message);
    });
    
    return () => unsubscribe();
  }, [user]);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTeamName.trim()) return;

    await addDoc(collection(db, "teams"), {
      userId: user.uid,
      name: newTeamName.trim(),
      members: 1,
      createdAt: serverTimestamp()
    });
    
    setIsModalOpen(false);
    setNewTeamName("");
  };

  const handleAddMember = async (id: string) => {
    const teamRef = doc(db, "teams", id);
    await updateDoc(teamRef, {
      members: increment(1)
    });
  };

  return (
    <>
      <div className="border border-border rounded-lg p-6 bg-card h-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <Users size={20} weight="duotone" />
            </div>
            <h2 className="text-xl font-semibold">Teams</h2>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
            title="Add new team"
          >
            <Plus size={16} weight="bold" />
          </button>
        </div>
        <div className="space-y-4">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center justify-between p-3 border-b border-border last:border-0 group">
              <span className="font-medium">{team.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{team.members} members</span>
                <button 
                  onClick={() => handleAddMember(team.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs bg-muted px-2 py-1 rounded hover:bg-border transition-all"
                  title="Add member"
                >
                  +1
                </button>
              </div>
            </div>
          ))}
          {teams.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No teams added yet.</p>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Team">
        <form onSubmit={handleAddTeam} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Team Name</label>
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g., Art Department"
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
              Create Team
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
