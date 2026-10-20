"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/AuthContext";
import { AppSplash } from "@/components/ui/AppSplash";

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, signedInHint, signingOut } = useAuth();
  
  // On "/", only show the app chrome once we know (or strongly expect) the visitor is signed in.
  // Otherwise the server HTML and first paint would show the dashboard shell before the landing page.
  const expectSignedIn = !!user || (loading && signedInHint === true);
  const isFullBleed = pathname?.startsWith("/p/") || pathname === "/landing" || pathname === "/changelog" || pathname === "/status" || (pathname === "/" && !expectSignedIn);

  if (signingOut) return <AppSplash />;

  if (isFullBleed) {
    return <main className="min-h-screen w-full m-0 p-0 bg-[#121212] text-[#FAFAFA]">{children}</main>;
  }

  // Signed-out visitor on an app page (e.g. a bookmarked link): the page renders its sign-in card,
  // so show it on its own instead of inside an empty navbar and footer.
  if (!loading && !user) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center gap-6 px-4 py-10 bg-[#121212] text-[#FAFAFA]">
        {children}
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
          ← Back to PatchPlan home
        </Link>
      </main>
    );
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
