"use client";

import { IdeaBoard } from "@/features/idea-management/IdeaBoard";
import { useAuth } from "@/lib/AuthContext";
import { Login } from "@/components/auth/Login";

export default function IdeasPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="animate-pulse text-muted-foreground p-8">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="space-y-6">
      <header className="py-4">
        <h1 className="text-3xl font-bold tracking-tight">Ideas Workspace</h1>
        <p className="text-muted-foreground">Manage and brainstorm all your studio ideas.</p>
      </header>
      
      <IdeaBoard />
    </div>
  );
}
