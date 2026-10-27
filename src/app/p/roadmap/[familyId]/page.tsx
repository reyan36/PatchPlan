import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { publicTag } from "@/lib/publicCache";
import { pageDesign } from "@/lib/newsTheme";
import { RoadmapView, type RoadmapData } from "./RoadmapView";

// Rendered on the server and cached for a minute per roadmap (ISR), so visitors get a ready page
// without downloading the Firestore SDK, and Firestore sees one read burst per minute at most.
export const revalidate = 60;
export async function generateStaticParams() {
  return [];
}

const DEFAULT_COLUMNS = ["Far Future", "Future", "Later", "Soon", "Done for next update"];

type Result = { expired: true } | ({ expired: false; familyId: string } & RoadmapData);

async function fetchRoadmap(slug: string): Promise<Result> {
  let familyId = slug;
  const bySlug = await getDocs(query(collection(db, "public_configs"), where("roadmapSlug", "==", slug))).catch(() => null);
  if (bySlug && !bySlug.empty) familyId = bySlug.docs[0].id;

  // Studio and profile docs are private under the security rules; they're only a name fallback.
  const [configDoc, pubConfigDoc, familyDoc, userDoc, famSnap, userSnap] = await Promise.all([
    getDoc(doc(db, "roadmap_configs", familyId)).catch(() => null),
    getDoc(doc(db, "public_configs", familyId)).catch(() => null),
    getDoc(doc(db, "families", familyId)).catch(() => null),
    getDoc(doc(db, "user_profiles", familyId)).catch(() => null),
    getDocs(query(collection(db, "roadmap"), where("familyId", "==", familyId))).catch(() => null),
    getDocs(query(collection(db, "roadmap"), where("userId", "==", familyId))).catch(() => null),
  ]);

  const d = pubConfigDoc?.exists() ? pubConfigDoc.data() : {};
  if (d.roadmapExpiresAt !== undefined && d.roadmapExpiresAt !== -1 && d.roadmapExpiresAt > 0 && Date.now() > d.roadmapExpiresAt) {
    return { expired: true };
  }

  const familyName =
    d.roadmapStudioName ||
    (familyDoc?.exists() && familyDoc.data().name) ||
    (userDoc?.exists() && (userDoc.data().displayName || userDoc.data().name)) ||
    d.emailStudioName ||
    d.newsStudioName ||
    d.studioName ||
    "Studio";

  const docs = famSnap && !famSnap.empty ? famSnap.docs : userSnap ? userSnap.docs : [];
  return {
    expired: false,
    familyId,
    familyName: String(familyName),
    columns: (configDoc?.exists() && configDoc.data().columns) || DEFAULT_COLUMNS,
    config: {
      roadmapHeading: d.roadmapHeading || "",
      roadmapDescription: d.roadmapDescription || "",
      logoUrl: d.roadmapLogoUrl || d.logoUrl || "",
      websiteUrl: d.roadmapWebsiteUrl || d.websiteUrl || "",
      discordUrl: d.roadmapDiscordUrl || d.discordUrl || "",
      // Theme, accent and the email sign-up match the News page unless the studio styled them separately.
    ...pageDesign(d, "roadmap"),
    },
    // Only the fields the page shows (keeps the cache small and serializable).
    items: docs.map((x) => {
      const v = x.data();
      return { id: x.id, title: String(v.title || ""), column: String(v.column || ""), category: String(v.category || ""), bullets: Array.isArray(v.bullets) ? v.bullets.map(String) : [] };
    }),
  };
}

// Tagged per URL key so a dashboard edit can refresh it at once (see /api/public/refresh).
const loadRoadmap = (slug: string) => unstable_cache(fetchRoadmap, ["public-roadmap"], { revalidate: 60, tags: [publicTag(slug)] })(slug);

export async function generateMetadata({ params }: { params: { familyId: string } }): Promise<Metadata> {
  const r = await loadRoadmap(params.familyId);
  if (r.expired) return { title: "Link expired" };
  return { title: r.config.roadmapHeading || `${r.familyName} Roadmap`, description: r.config.roadmapDescription || `What ${r.familyName} is working on next.` };
}

export default async function PublicRoadmapPage({ params }: { params: { familyId: string } }) {
  const r = await loadRoadmap(params.familyId);
  if (r.expired) {
    return (
      <div className="min-h-screen bg-[#111111] text-gray-200 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-2">Link Expired</h1>
        <p>This public roadmap link has expired.</p>
      </div>
    );
  }
  const { expired, familyId, ...data } = r;
  // Sign-ups use the URL's id or slug, as before.
  return <RoadmapView familyId={params.familyId} data={data} />;
}
