"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/AuthContext";
import changelogData from "@/data/changelog.json";

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [version, setVersion] = useState(changelogData[0]?.version || "v0.1.2");

  useEffect(() => {
    fetch("/api/changelog")
      .then(res => res.json())
      .then(data => {
        if (data.currentVersion) {
          setVersion(data.currentVersion);
        }
      })
      .catch(() => {});
  }, []);
  
  const isFullBleed = pathname?.startsWith("/p/") || pathname === "/landing" || pathname === "/changelog" || (!user && !loading && pathname === "/");

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
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground tracking-tight">Patch<span className="text-muted-foreground">plan</span></span>
            <span className="text-muted-foreground/80 hidden sm:inline">— Modern project management for game studios</span>
            <Link
              href="/changelog"
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors ml-1"
              title="View Changelog & Updates"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{version} Beta</span>
            </Link>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/changelog" className="hover:text-foreground transition-colors">
              Changelog
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
