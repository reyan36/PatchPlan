import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { themeVars } from "@/lib/newsTheme";
import { SubscribeForm } from "@/components/email/SubscribeForm";
import { publicProfile } from "@/lib/email/server";

export const dynamic = "force-dynamic";

// Cached for 5 minutes per studio: this page used to wait ~3 s on Firestore for every visit.
const getStudio = unstable_cache(async (slug: string) => {
  // Preferred: server-side lookup, which sees the name the studio set in Email or its workspace name.
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const p = await publicProfile(slug);
      return { name: p.name, logoUrl: p.logoUrl, theme: p.theme, accent: p.accent };
    } catch {
      // Fall through to the public-config lookup.
    }
  }
  let id = slug;
  let cfg: Record<string, any> = {};
  try {
    for (const field of ["newsSlug", "roadmapSlug"]) {
      const bySlug = await getDocs(query(collection(db, "public_configs"), where(field, "==", slug)));
      if (!bySlug.empty) {
        id = bySlug.docs[0].id;
        break;
      }
    }
    const snap = await getDoc(doc(db, "public_configs", id));
    cfg = snap.data() || {};
  } catch {
    // Unauthenticated reads can fail; fall back to defaults.
  }
  return {
    name: cfg.emailStudioName || cfg.newsStudioName || cfg.studioName || cfg.roadmapStudioName || "the studio",
    logoUrl: cfg.newsLogoUrl || cfg.logoUrl || "",
    theme: cfg.newsTheme || cfg.theme || "dark",
    accent: cfg.newsAccent || "",
  };
}, ["public-subscribe"], { revalidate: 300 });

export async function generateMetadata({ params }: { params: { familyId: string } }): Promise<Metadata> {
  const s = await getStudio(params.familyId);
  return { title: `Subscribe to ${s.name}`, description: `Get patch notes, devlogs and news from ${s.name} by email.` };
}

export default async function SubscribePage({ params, searchParams }: { params: { familyId: string }; searchParams: { embed?: string } }) {
  const s = await getStudio(params.familyId);
  const embed = searchParams.embed === "1";
  return (
    <div style={themeVars(s.theme, s.accent) as React.CSSProperties} className={`bg-[var(--pp-bg)] text-[var(--pp-fg)] ${embed ? "p-4" : "min-h-screen flex items-center justify-center px-5 py-16"}`}>
      <div className="w-full max-w-md">
        {!embed && (
          <div className="mb-8 text-center">
            {s.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logoUrl} alt={s.name} className="h-10 mx-auto mb-5" />
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight">Stay in the loop</h1>
            <p className="mt-2 text-[var(--pp-muted)]">Patch notes, devlogs and news from {s.name}, straight to your inbox.</p>
          </div>
        )}
        <SubscribeForm scopeId={params.familyId} source={embed ? "embed" : "signup-page"} studioName={s.name} variant={embed ? "plain" : "card"} showLists />
        {!embed && <p className="mt-8 text-center text-xs text-[var(--pp-muted)]">Powered by PatchPlan</p>}
      </div>
    </div>
  );
}
