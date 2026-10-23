import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { publicProfile } from "@/lib/email/server";
import { themeVars } from "@/lib/newsTheme";
import { BetaPortal } from "@/features/beta/BetaPortal";

// The shell (studio name, theme, whether sign-ups are open) is cached; everything about the
// signed-in tester loads in the browser straight from Firestore. Saving beta settings
// revalidates this page, so most visits never run a server function.
export const revalidate = 3600;
// No pages at build time; each studio's page is generated on first visit and then cached.
export async function generateStaticParams() {
  return [];
}

const getStudio = cache(async (slug: string) => {
  try {
    const p = await publicProfile(slug);
    return p.found ? p : null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: { familyId: string } }): Promise<Metadata> {
  const s = await getStudio(params.familyId);
  if (!s) return { title: "Beta program" };
  return { title: `${s.name} beta`, description: `Join the ${s.name} beta, play early builds and report issues straight to the team.` };
}

export default async function BetaPage({ params }: { params: { familyId: string } }) {
  const s = await getStudio(params.familyId);
  if (!s) notFound();
  return (
    <div style={themeVars(s.theme, s.accent) as React.CSSProperties} className="min-h-screen bg-[var(--pp-bg)] text-[var(--pp-fg)]">
      <BetaPortal
        scopeId={s.scopeId}
        studio={{ name: s.name, logoUrl: s.logoUrl }}
        open={s.betaOpen}
        intro={s.betaIntro}
      />
    </div>
  );
}
