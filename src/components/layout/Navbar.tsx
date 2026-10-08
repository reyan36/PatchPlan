"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Lightbulb, Kanban, Users, Settings, LogOut, TrendingUp, Bell, Globe, Newspaper } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useDirty } from '@/lib/DirtyContext';
import { useFamily } from '@/lib/FamilyContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { handleNavigation } = useDirty();
  const { activeFamily } = useFamily();
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, "tasks"), where("assigneeId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pending = snapshot.docs.filter(doc => doc.data().column !== "Done").length;
      setPendingTasksCount(pending);
    });

    return () => unsubscribe();
  }, [user]);

  if (pathname?.startsWith('/p/')) return null;

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => handleNavigation("/")} className="text-xl font-bold tracking-tight">
            Patch<span className="text-muted-foreground">plan</span>
          </button>
          
          {activeFamily ? (
            <button 
              onClick={() => handleNavigation("/teams")}
              className="hidden md:flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-primary/20 transition-colors"
            >
              {activeFamily.name}
            </button>
          ) : (
            <button 
              onClick={() => handleNavigation("/teams")}
              className="hidden md:flex items-center gap-2 px-3 py-1 bg-muted text-muted-foreground border border-border rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-muted/80 transition-colors"
            >
              Personal
            </button>
          )}
        </div>

        <div className="flex items-center gap-6 text-sm font-medium">
          {user && (
            <>
              <button onClick={() => handleNavigation("/")} className="flex items-center gap-2 hover:text-muted-foreground transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button onClick={() => handleNavigation("/ideas")} className="flex items-center gap-2 hover:text-muted-foreground transition-colors">
                <Lightbulb className="w-4 h-4" />
                Ideas
              </button>
              <button onClick={() => handleNavigation("/roadmap")} className="flex items-center gap-2 hover:text-muted-foreground transition-colors">
                <Globe className="w-4 h-4" />
                Roadmap
              </button>
              <button onClick={() => handleNavigation("/news")} className="flex items-center gap-2 hover:text-muted-foreground transition-colors">
                <Newspaper className="w-4 h-4" />
                News
              </button>
              <button onClick={() => handleNavigation("/board")} className="flex items-center gap-2 hover:text-muted-foreground transition-colors">
                <Kanban className="w-4 h-4" />
                Board
              </button>
              <button onClick={() => handleNavigation("/teams")} className="flex items-center gap-2 hover:text-muted-foreground transition-colors">
                <Users className="w-4 h-4" />
                Teams
              </button>
              <button onClick={() => handleNavigation("/marketing")} className="flex items-center gap-2 hover:text-muted-foreground transition-colors">
                <TrendingUp className="w-4 h-4" />
                Network
              </button>

              <div className="h-6 w-px bg-border mx-2" />

              <button onClick={() => handleNavigation("/inbox")} className="relative flex items-center gap-2 hover:text-foreground text-muted-foreground transition-colors group">
                <div className="relative">
                  <Bell className="w-4 h-4 group-hover:text-primary transition-colors" />
                  {pendingTasksCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-950 text-[9px] font-bold px-1 py-0.5 rounded-full flex items-center justify-center min-w-[16px] h-[16px]">
                      {pendingTasksCount > 99 ? '99+' : pendingTasksCount}
                    </span>
                  )}
                </div>
                <span className="group-hover:text-primary transition-colors">Inbox</span>
              </button>

              <button onClick={() => handleNavigation("/settings")} className="flex items-center gap-2 hover:text-foreground text-muted-foreground transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </button>

              <button 
                onClick={logout} 
                className="flex items-center gap-2 hover:text-red-400 text-muted-foreground transition-colors ml-2 border-l border-border pl-6"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
