"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkle, Megaphone, Hammer, ArrowRight } from "@phosphor-icons/react";
import { DashboardGuide } from "@/features/tour/ProductTour";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";

import { Skeleton } from "@/components/ui/Skeleton";
import { AppSplash } from "@/components/ui/AppSplash";
import dynamic from "next/dynamic";

// Dashboard widgets use Firestore; landing visitors never download them.
const IdeaBoard = dynamic(() => import("@/features/idea-management/IdeaBoard").then((m) => m.IdeaBoard), { loading: () => <Skeleton className="h-64 w-full" /> });
const TeamOverview = dynamic(() => import("@/features/team-management/TeamOverview").then((m) => m.TeamOverview), { loading: () => <Skeleton className="h-96 w-full" /> });

// Signed-in users never download the landing page (and its animation libraries), and vice versa.
const LandingPage = dynamic(() => import("@/components/landing/LandingPage").then((m) => m.LandingPage), {
  loading: () => <AppSplash />,
});

export default function Home() {
  const { user, loading, signedInHint } = useAuth();
  const { loading: familyLoading } = useFamily();
  const router = useRouter();
  const [ask, setAsk] = useState("");

  if (loading || (user && familyLoading)) {
    // Firebase is still restoring the session. Show what this browser most likely gets,
    // instead of a dashboard skeleton that then flips to the landing page.
    // Signed out last time, or a first visit (almost always signed out): show the landing page
    // right away instead of waiting for Firebase. Only "not read yet" shows the splash.
    if (!user && (signedInHint === false || signedInHint === null)) return <LandingPage />;
    if (!user && signedInHint === undefined) return <AppSplash />;
    return (
      <div className="space-y-8">
        <header className="py-6">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </header>
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="md:col-span-1">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="space-y-8">
      <header className="py-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to Patchplan. Here's an overview of your studio.</p>
        </div>
        <div className="text-sm text-muted-foreground">
          Logged in as <span className="font-medium text-foreground">{user.email}</span>
        </div>
      </header>

      {/* PatchPlan AI quick access */}
      <section className="bg-card border border-border rounded-lg p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Sparkle size={96} weight="duotone" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-1 text-primary">
            <Sparkle size={20} weight="duotone" />
            <h2 className="text-lg font-semibold">PatchPlan AI</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Ask anything about your studio. Powered by NVIDIA Nemotron on Nebius.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (ask.trim()) router.push(`/ai?tab=search&q=${encodeURIComponent(ask.trim())}`);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              placeholder="What's left before the boss fight ships?"
              className="flex-grow bg-background border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:border-muted-foreground transition-colors"
            />
            <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
              Ask AI
            </button>
          </form>
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            <button onClick={() => router.push("/ai?tab=signal")} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground">
              <Megaphone size={12} /> Sort player feedback <ArrowRight size={10} />
            </button>
            <button onClick={() => router.push("/ai?tab=build")} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground">
              <Hammer size={12} /> Build a custom tool <ArrowRight size={10} />
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <IdeaBoard />
        </div>
        <div className="md:col-span-1">
          <TeamOverview />
        </div>
      </div>

      <DashboardGuide />
    </div>
  );
}
