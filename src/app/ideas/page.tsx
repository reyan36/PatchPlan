"use client";

import { IdeaLibrary } from "@/features/idea-management/IdeaLibrary";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { Login } from "@/components/auth/LazyLogin";
import { PageLoader } from "@/components/ui/PageLoader";

export default function IdeasPage() {
  const { user, loading } = useAuth();
  const { loading: familyLoading } = useFamily();

  if (loading || (user && familyLoading)) return <PageLoader variant="grid" label="Loading ideas" />;
  if (!user) return <Login />;

  return (
    <div className="max-w-6xl mx-auto">
      <IdeaLibrary />
    </div>
  );
}
