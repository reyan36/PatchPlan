import { NextResponse } from "next/server";
import { ChangelogEntry, enhanceCommit } from "@/lib/changelog";
import changelogData from "@/data/changelog.json";
import cp from "child_process";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Attempt dynamic git extraction so development reflects fresh commits instantly
    const cmd = 'git log --pretty=format:%h___%H___%s___%b___%an___%ad___%at===COMMIT_END=== --date=short';
    const output = cp.execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 3000 });

    const rawBlocks = output.split('===COMMIT_END===').map(b => b.trim()).filter(Boolean);
    if (rawBlocks.length > 0) {
      const rawCommits = rawBlocks.map(block => {
        const parts = block.split('___');
        return {
          hash: (parts[0] || '').trim(),
          fullHash: (parts[1] || '').trim(),
          subject: (parts[2] || '').trim(),
          body: (parts[3] || '').trim(),
          author: (parts[4] || '').trim(),
          date: (parts[5] || '').trim(),
          timestamp: parseInt((parts[6] || '0').trim(), 10)
        };
      });

      const reversed = [...rawCommits].reverse();
      const total = reversed.length;

      const entries: ChangelogEntry[] = reversed.map((raw, idx) => {
        const isLatest = idx === total - 1;
        return enhanceCommit(raw, idx, isLatest);
      });

      const displayList = entries.reverse();
      const latest = displayList[0];

      return NextResponse.json({
        success: true,
        currentVersion: latest?.version || "v0.1.0",
        totalReleases: displayList.length,
        entries: displayList
      });
    }
  } catch (err) {
    // Fall back to pre-built changelog.json (e.g. serverless hosting environments)
  }

  const staticEntries = changelogData as ChangelogEntry[];
  const latest = staticEntries[0];

  return NextResponse.json({
    success: true,
    currentVersion: latest?.version || "v0.1.0",
    totalReleases: staticEntries.length,
    entries: staticEntries
  });
}
