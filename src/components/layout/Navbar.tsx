"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
  SquaresFour, 
  Lightbulb, 
  Compass, 
  Newspaper, 
  Kanban, 
  Users, 
  ShareNetwork, 
  Bell, 
  Gear, 
  SignOut,
  Buildings,
  User as UserIcon,
  Sparkle
} from '@phosphor-icons/react';
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
    }, (error) => {
      // Graceful error handling for missing permissions or ad blockers
      console.warn("Navbar tasks listener:", error.message);
    });

    return () => unsubscribe();
  }, [user]);

  if (pathname?.startsWith('/p/')) return null;

  const navItems = [
    { name: 'Dashboard', href: '/', icon: SquaresFour, active: pathname === '/' },
    { name: 'Ideas', href: '/ideas', icon: Lightbulb, active: pathname?.startsWith('/ideas') },
    { name: 'Roadmap', href: '/roadmap', icon: Compass, active: pathname?.startsWith('/roadmap') },
    { name: 'News', href: '/news', icon: Newspaper, active: pathname?.startsWith('/news') },
    { name: 'Board', href: '/board', icon: Kanban, active: pathname?.startsWith('/board') },
    { name: 'Teams', href: '/teams', icon: Users, active: pathname?.startsWith('/teams') },
    { name: 'AI', href: '/ai', icon: Sparkle, active: pathname?.startsWith('/ai') || pathname?.startsWith('/modules') },
    { name: 'Network', href: '/marketing', icon: ShareNetwork, active: pathname?.startsWith('/marketing') },
  ];

  return (
    <nav className="border-b border-border/60 bg-background/95 backdrop-blur-md sticky top-0 z-30">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button 
            type="button" 
            suppressHydrationWarning
            onClick={() => handleNavigation("/")} 
            className="text-xl font-bold tracking-tight inline-flex items-center gap-2 group"
          >
            <span className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 inline-flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
              <SquaresFour size={20} weight="duotone" />
            </span>
            <span suppressHydrationWarning>Patch<span className="text-muted-foreground font-normal">plan</span></span>
          </button>
          
          {activeFamily ? (
            <button 
              onClick={() => handleNavigation("/teams")}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-primary/20 transition-colors"
            >
              <Buildings size={14} weight="duotone" />
              {activeFamily.name}
            </button>
          ) : (
            <button 
              onClick={() => handleNavigation("/teams")}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-muted/60 text-muted-foreground border border-border rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-muted transition-colors"
            >
              <UserIcon size={14} weight="duotone" />
              Personal
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-sm">
          {user && (
            <>
              {navItems.map(item => (
                <button 
                  key={item.name}
                  onClick={() => handleNavigation(item.href)} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    item.active 
                      ? 'bg-primary/15 text-primary font-semibold shadow-xs' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <item.icon size={18} weight={item.active ? "duotone" : "regular"} />
                  {item.name}
                </button>
              ))}

              <div className="h-5 w-px bg-border/70 mx-2" />

              <button 
                type="button"
                onClick={() => handleNavigation("/inbox")} 
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  pathname?.startsWith('/inbox')
                    ? 'bg-primary/15 text-primary font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <span className="relative inline-flex items-center">
                  <Bell size={18} weight={pathname?.startsWith('/inbox') ? "duotone" : "regular"} />
                  {pendingTasksCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-amber-500 text-amber-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full inline-flex items-center justify-center min-w-[16px] h-[16px]">
                      {pendingTasksCount > 99 ? '99+' : pendingTasksCount}
                    </span>
                  )}
                </span>
                <span>Inbox</span>
              </button>

              <button 
                onClick={() => handleNavigation("/settings")} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  pathname?.startsWith('/settings')
                    ? 'bg-primary/15 text-primary font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Gear size={18} weight={pathname?.startsWith('/settings') ? "duotone" : "regular"} />
                <span>Settings</span>
              </button>

              <button 
                onClick={logout} 
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium hover:text-red-400 text-muted-foreground hover:bg-red-500/10 transition-colors ml-1"
                title="Log out"
              >
                <SignOut size={18} weight="regular" />
                <span className="hidden lg:inline">Sign out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
