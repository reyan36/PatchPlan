"use client";

import { useState } from "react";
import { CheckCircle, DownloadSimple } from "@phosphor-icons/react";
import { postWithAuth } from "@/lib/api";
import { Button, ErrorNote } from "@/features/ai/ui";

type Start = { parts: string[]; workspace: Record<string, unknown> };
type Page = { docs: unknown[]; next: string | null };

const LABELS: Record<string, string> = {
  tasks: "tasks", ideas: "ideas", idea_bodies: "docs and whiteboards", articles: "news posts", roadmap: "roadmap", signals: "player signals",
  modules: "AI modules", module_rows: "module rows", campaigns: "email campaigns", contacts: "network contacts", subscribers: "subscribers",
  beta_testers: "beta testers", beta_reports: "bug reports", beta_files: "screenshots",
};

/**
 * Downloads every document of the workspace as one JSON file. Pages through /api/export so large
 * workspaces never hit response size limits; tokens and webhook URLs are left out on the server.
 */
export function ExportData({ scopeId, name, canExport }: { scopeId: string; name: string; canExport: boolean }) {
  const [progress, setProgress] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setDone(null);
    setProgress("Preparing…");
    try {
      const start = await postWithAuth<Start>("/api/export", { scopeId, part: "_start" });
      const collections: Record<string, unknown[]> = {};
      let total = 0;
      for (let i = 0; i < start.parts.length; i++) {
        const part = start.parts[i];
        setProgress(`Exporting ${LABELS[part] || part.replace(/_/g, " ")} (${i + 1}/${start.parts.length})`);
        const docs: unknown[] = [];
        let after: string | null = null;
        do {
          const page: Page = await postWithAuth<Page>("/api/export", { scopeId, part, after });
          docs.push(...page.docs);
          after = page.next;
        } while (after);
        if (docs.length) collections[part] = docs;
        total += docs.length;
      }
      const file = {
        about: "PatchPlan data export. Each collection is a list of documents; dates are ISO 8601 (UTC). Access tokens and webhook URLs are removed.",
        exportedAt: new Date().toISOString(),
        workspace: start.workspace,
        collections,
      };
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
      a.download = `patchplan-${slug}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      setDone(`Downloaded ${total.toLocaleString()} items.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed. Try again.");
    } finally {
      setProgress(null);
    }
  };

  if (!canExport) {
    return <p className="text-sm text-zinc-500">Only the studio owner can export its data. Ask them, or export your personal workspace instead.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        One JSON file with everything in <span className="text-zinc-200">{name}</span>: tasks, docs, roadmap, news, contacts, subscribers, beta reports and settings. Access tokens and webhook URLs are left out.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} loading={!!progress}>
          <DownloadSimple size={13} /> {progress ? "Exporting…" : "Download data"}
        </Button>
        {progress && <span className="text-xs text-zinc-500">{progress}</span>}
        {done && (
          <span className="text-xs text-emerald-300 inline-flex items-center gap-1">
            <CheckCircle size={13} /> {done}
          </span>
        )}
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
