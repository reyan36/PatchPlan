"use client";

import { IdeaEditor } from "@/features/idea-management/IdeaEditor";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { Login } from "@/components/auth/LazyLogin";
import { PageLoader } from "@/components/ui/PageLoader";

// Waits for the session before loading the doc: docs are private, so reading them before
// sign-in has restored (e.g. a link opened in a new tab) would be refused.
export default function IdeaPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth();
  const { loading: familyLoading } = useFamily();

  if (loading || (user && familyLoading)) return <PageLoader label="Loading doc" />;
  if (!user) return <Login />;

  return (
    <div className="h-full">
      <IdeaEditor ideaId={params.id} />
    </div>
  );
}
