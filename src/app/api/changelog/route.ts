import { NextResponse } from "next/server";
import { ChangelogEntry, formatRelativeTime } from "@/lib/changelog";
import { adminDb } from "@/lib/email/server";

// Entries live in Firestore (synced from git by scripts/changelog/sync.mjs at build time).
// Cached for 5 minutes so the public page doesn't read Firestore on every visit.
export const revalidate = 300;

export async function GET() {
  try {
    const snap = await adminDb().collection("changelog").orderBy("seq", "desc").limit(200).get();
    const entries: ChangelogEntry[] = snap.docs.map((d, i) => {
      const e = d.data();
      return {
        version: e.version,
        isLatest: i === 0,
        hash: e.hash || "",
        fullHash: e.fullHash || d.id,
        date: e.date || "",
        relativeTime: formatRelativeTime(e.timestamp || 0),
        timestamp: e.timestamp || 0,
        rawCommit: e.rawCommit || "",
        rawBody: e.rawBody || "",
        author: e.author || "",
        title: e.title,
        summary: e.summary || "",
        type: e.type || "improvement",
        badge: e.badge || "Update",
        highlights: Array.isArray(e.highlights) ? e.highlights : [],
      };
    });

    return NextResponse.json({
      success: true,
      currentVersion: entries[0]?.version || "v0.1.0",
      totalReleases: entries.length,
      entries,
    });
  } catch (err) {
    console.error("[changelog]", err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, currentVersion: "", totalReleases: 0, entries: [] }, { status: 503 });
  }
}
