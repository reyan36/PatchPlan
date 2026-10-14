"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname?.startsWith("/p/");

  if (isPublic) {
    return <main className="min-h-screen w-full m-0 p-0">{children}</main>;
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        {children}
      </main>
      <footer className="border-t border-border/40 py-6 text-xs text-muted-foreground bg-background/50">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground tracking-tight">Patch<span className="text-muted-foreground">plan</span></span>
            <span className="text-muted-foreground/80">— Modern project management for game studios</span>
          </div>
          <div suppressHydrationWarning>
            &copy; {currentYear} PatchPlan. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
