"use client";

import { IdeaBoard } from "@/features/idea-management/IdeaBoard";
import { TeamOverview } from "@/features/team-management/TeamOverview";
import { Sparkle } from "@phosphor-icons/react";
import { useAuth } from "@/lib/AuthContext";
import { Login } from "@/components/auth/Login";

import { Skeleton } from "@/components/ui/Skeleton";
import { LandingPage } from "@/components/landing/LandingPage";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
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
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link 
            href="/landing" 
            className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted text-foreground transition-colors flex items-center gap-1.5"
          >
            <span>View Landing Page</span>
            <span className="text-muted-foreground">↗</span>
          </Link>
          <div>
            Logged in as <span className="font-medium text-foreground">{user.email}</span>
          </div>
        </div>
      </header>

      {/* Placeholder for AI feature per hackathon requirements */}
      <section className="bg-card border border-border rounded-lg p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkle size={96} weight="duotone" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3 text-primary">
            <Sparkle size={20} weight="duotone" />
            <h2 className="text-lg font-semibold">Studio AI Assistant</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Powered by NVIDIA Nemotron via Nebius Token Factory. (Hackathon AI Integration to be implemented here)
          </p>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Ask for project insights, idea suggestions, or resource allocation..." 
              className="flex-grow bg-background border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:border-muted-foreground transition-colors"
            />
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
              Ask AI
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
    </div>
  );
}
