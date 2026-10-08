"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useFamily, Member, Family } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, arrayUnion, arrayRemove, getDocs, getDoc, query, where } from "firebase/firestore";
import { Building2, UserPlus, LogIn, Plus, LogOut } from "lucide-react";
import { Login } from "@/components/auth/Login";
import { Modal } from "@/components/ui/Modal";

export default function TeamsPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeFamily, userProfile, setActiveFamilyId, loading: familyLoading } = useFamily();
  
  const [view, setView] = useState<"hub" | "create" | "join">("hub");
  
  const [familyName, setFamilyName] = useState("");
  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [joinedFamiliesData, setJoinedFamiliesData] = useState<Family[]>([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveConfirmText, setLeaveConfirmText] = useState("");

  // Fetch data for families the user has joined
  useEffect(() => {
    if (!userProfile?.joinedFamilies || userProfile.joinedFamilies.length === 0) {
      setJoinedFamiliesData([]);
      return;
    }
    const fetchFamilies = async () => {
      try {
        const promises = userProfile.joinedFamilies.map(id => getDoc(doc(db, "families", id)));
        const snaps = await Promise.all(promises);
        const data = snaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() } as Family));
        setJoinedFamiliesData(data);
      } catch (err) {
        console.error("Failed to fetch joined families", err);
      }
    };
    fetchFamilies();
  }, [userProfile?.joinedFamilies]);

  if (authLoading || familyLoading) return <div className="p-8 text-muted-foreground animate-pulse">Loading Teams...</div>;
  if (!user) return <Login />;

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim() || !nickname.trim()) {
      setError("Please fill out all fields.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const code = generateJoinCode();
      const me: Member = {
        uid: user.uid,
        nickname: nickname.trim(),
        role: "owner",
        email: user.email || ""
      };

      const docRef = await addDoc(collection(db, "families"), {
        name: familyName.trim(),
        ownerId: user.uid,
        joinCode: code,
        members: [me],
        createdAt: new Date().toISOString()
      });

      // Update user profile
      await updateDoc(doc(db, "user_profiles", user.uid), {
        activeFamilyId: docRef.id,
        joinedFamilies: arrayUnion(docRef.id)
      });
      
      setView("hub");
    } catch (err) {
      console.error(err);
      setError("Failed to create family.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !nickname.trim()) {
      setError("Please fill out all fields.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Find family by join code
      const q = query(collection(db, "families"), where("joinCode", "==", joinCode.trim().toUpperCase()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setError("Invalid Join Code.");
        setSubmitting(false);
        return;
      }

      const familyDoc = snap.docs[0];
      const familyData = familyDoc.data();
      
      // Check if already a member
      if (familyData.members.some((m: Member) => m.uid === user.uid)) {
        setError("You are already in this family!");
        await setActiveFamilyId(familyDoc.id);
        setView("hub");
        setSubmitting(false);
        return;
      }

      const me: Member = {
        uid: user.uid,
        nickname: nickname.trim(),
        role: "worker",
        email: user.email || ""
      };

      await updateDoc(doc(db, "families", familyDoc.id), {
        members: arrayUnion(me)
      });

      await updateDoc(doc(db, "user_profiles", user.uid), {
        activeFamilyId: familyDoc.id,
        joinedFamilies: arrayUnion(familyDoc.id)
      });

      setView("hub");
    } catch (err) {
      console.error(err);
      setError("Failed to join family.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveFamily = async () => {
    if (leaveConfirmText !== "LEAVE" || !activeFamily || !user) return;
    setSubmitting(true);
    
    try {
      const familyRef = doc(db, "families", activeFamily.id);
      const me = activeFamily.members.find((m: Member) => m.uid === user.uid);
      
      if (me) {
        await updateDoc(familyRef, { members: arrayRemove(me) });
      }

      await updateDoc(doc(db, "user_profiles", user.uid), {
        joinedFamilies: arrayRemove(activeFamily.id),
        activeFamilyId: null
      });

      setIsLeaveModalOpen(false);
      setLeaveConfirmText("");
      // No need to setView("hub") since it will remount Personal Hub mode
    } catch (err) {
      console.error(err);
      setError("Failed to leave family");
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeFamily && view === "hub") {
    // Show personal mode / team hub
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-8 animate-in fade-in zoom-in-95">
        <div>
          <Building2 className="w-16 h-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold tracking-tight mb-2">Workspace Hub</h1>
          <p className="text-xl text-muted-foreground">You are currently operating in your <strong>Personal Workspace</strong>.<br/>Select a family to collaborate with a team, or create a new one.</p>
        </div>

        {joinedFamiliesData.length > 0 && (
          <div className="bg-card border border-border rounded-xl text-left overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h2 className="font-semibold text-lg">Your Families</h2>
            </div>
            <div className="divide-y divide-border">
              {joinedFamiliesData.map(family => (
                <div key={family.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                  <div>
                    <h3 className="font-medium text-lg">{family.name}</h3>
                    <p className="text-sm text-muted-foreground">{family.members.length} members</p>
                  </div>
                  <button 
                    onClick={() => setActiveFamilyId(family.id)}
                    className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md font-medium text-sm transition-colors"
                  >
                    Switch to Workspace
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => setView("create")}
            className="flex flex-col items-center p-8 bg-card border border-border hover:border-primary rounded-xl transition-all group"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Create a Family</h3>
            <p className="text-sm text-muted-foreground mt-2">Start a new workspace for your studio and invite your team.</p>
          </button>

          <button 
            onClick={() => setView("join")}
            className="flex flex-col items-center p-8 bg-card border border-border hover:border-primary rounded-xl transition-all group"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <LogIn className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Join a Family</h3>
            <p className="text-sm text-muted-foreground mt-2">Have an invite code? Join your team's existing workspace.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      {view === "hub" && activeFamily && (
        <>
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Building2 className="text-primary" /> 
                {activeFamily.name}
              </h1>
              <p className="text-muted-foreground">You are currently operating in this Family workspace.</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Invite Code</div>
              <div className="text-2xl font-mono font-bold tracking-widest bg-muted px-4 py-1 rounded-md border border-border select-all">
                {activeFamily.joinCode}
              </div>
            </div>
          </header>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h2 className="font-semibold">Family Members</h2>
            </div>
            <div className="divide-y divide-border">
              {activeFamily.members.map(member => (
                <div key={member.uid} className="px-6 py-4 flex justify-between items-center hover:bg-muted/10 transition-colors">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {member.nickname} 
                      {member.uid === user.uid && <span className="text-[10px] uppercase bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">You</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">{member.email}</div>
                  </div>
                  <div className="capitalize text-sm font-medium px-3 py-1 bg-muted rounded-full">
                    {member.role}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-6">
            <button 
              onClick={() => setIsLeaveModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors font-medium"
            >
              <LogOut className="w-4 h-4" /> Permanently Leave Family
            </button>
            <button 
              onClick={() => setActiveFamilyId(null)} 
              className="px-4 py-2 text-sm bg-muted text-muted-foreground hover:text-foreground hover:bg-border rounded-md transition-colors"
            >
              Switch to Personal Workspace
            </button>
          </div>

          <Modal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} title="Leave Family">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You are about to permanently leave <strong>{activeFamily.name}</strong>. By doing this, you will be kicked out of the family team. 
                Your data and contributions will be auto-deleted after 3 days.
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">Type "LEAVE" to confirm</label>
                <input 
                  type="text" 
                  value={leaveConfirmText}
                  onChange={e => setLeaveConfirmText(e.target.value)}
                  placeholder="LEAVE"
                  className="w-full bg-background border border-border rounded-md px-4 py-2 uppercase focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              {error && <div className="text-red-400 text-sm">{error}</div>}
              <div className="flex gap-4 pt-4 mt-2">
                <button 
                  onClick={() => { setIsLeaveModalOpen(false); setLeaveConfirmText(""); }}
                  className="flex-1 py-2 rounded-md hover:bg-muted text-muted-foreground font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLeaveFamily}
                  disabled={submitting || leaveConfirmText !== "LEAVE"}
                  className="flex-1 py-2 bg-red-500 text-white rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? "Leaving..." : "Leave Family"}
                </button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {view === "create" && (
        <div className="max-w-md mx-auto mt-12 bg-card p-8 rounded-xl border border-border shadow-sm">
          <h2 className="text-2xl font-bold mb-6">Create a Family</h2>
          <form onSubmit={handleCreateFamily} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Studio / Family Name</label>
              <input 
                type="text" 
                value={familyName}
                onChange={e => setFamilyName(e.target.value)}
                placeholder="e.g. Patchwork Games" 
                className="w-full bg-background border border-border rounded-md px-4 py-2 focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Your Nickname</label>
              <input 
                type="text" 
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="How your team will see you" 
                className="w-full bg-background border border-border rounded-md px-4 py-2 focus:border-primary focus:outline-none"
              />
            </div>
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <div className="flex gap-4 pt-4">
              <button 
                type="button" 
                onClick={() => setView("hub")}
                className="flex-1 py-2 rounded-md hover:bg-muted text-muted-foreground font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Family"}
              </button>
            </div>
          </form>
        </div>
      )}

      {view === "join" && (
        <div className="max-w-md mx-auto mt-12 bg-card p-8 rounded-xl border border-border shadow-sm">
          <h2 className="text-2xl font-bold mb-6">Join a Family</h2>
          <form onSubmit={handleJoinFamily} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Invite Code</label>
              <input 
                type="text" 
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="e.g. A1B2C3" 
                className="w-full bg-background border border-border rounded-md px-4 py-2 uppercase tracking-widest focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Your Nickname</label>
              <input 
                type="text" 
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="How your team will see you" 
                className="w-full bg-background border border-border rounded-md px-4 py-2 focus:border-primary focus:outline-none"
              />
            </div>
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <div className="flex gap-4 pt-4">
              <button 
                type="button" 
                onClick={() => setView("hub")}
                className="flex-1 py-2 rounded-md hover:bg-muted text-muted-foreground font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Joining..." : "Join Family"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
