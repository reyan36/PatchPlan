"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/AuthContext";

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  
  const isFullBleed = pathname?.startsWith("/p/") || pathname === "/landing" || pathname === "/changelog" || pathname === "/status" || (!user && !loading && pathname === "/");

  if (isFullBleed) {
    return <main className="min-h-screen w-full m-0 p-0 bg-[#121212] text-[#FAFAFA]">{children}</main>;
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        {children}
      </main>
      <footer className="border-t border-border/40 py-5 text-xs text-muted-foreground bg-background/50">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground tracking-tight">Patch<span className="text-muted-foreground">plan</span></span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/changelog" className="hover:text-foreground transition-colors">
              Changelog
            </Link>
            <Link href="/status" className="hover:text-foreground transition-colors">
              Status
            </Link>
            <div suppressHydrationWarning>
              &copy; {currentYear} PatchPlan. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
