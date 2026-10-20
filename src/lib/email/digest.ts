// Server-only: builds the automatic weekly / daily update from what happened in the workspace.

import type { DocumentData } from "firebase-admin/firestore";
import { chat, isConfigured } from "@/lib/ai/llm";
import { adminDb } from "./server";
import type { EmailBlock } from "./types";
import { newBlockId } from "./types";

const ms = (ts: any): number => (ts?.toMillis ? ts.toMillis() : typeof ts === "number" ? ts : 0);

/** Docs owned by a scope: studio docs by familyId, personal docs by userId. */
async function scoped(col: string, scopeId: string): Promise<DocumentData[]> {
  const db = adminDb();
  const [fam, own] = await Promise.all([
    db.collection(col).where("familyId", "==", scopeId).get(),
    db.collection(col).where("userId", "==", scopeId).get(),
  ]);
  const seen = new Set<string>();
  return [...fam.docs, ...own.docs.filter((d) => !d.data().familyId)]
    .filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)))
    .map((d) => ({ id: d.id, ...d.data() }));
}

export type Digest = { subject: string; preheader: string; blocks: EmailBlock[]; empty: boolean };

export async function buildDigest(scopeId: string, kind: "weekly" | "daily", base: string, opts: { studioName: string; aiIntro: boolean }): Promise<Digest> {
  const since = Date.now() - (kind === "weekly" ? 7 : 1) * 24 * 60 * 60 * 1000;
  const [articles, tasks] = await Promise.all([scoped("articles", scopeId), scoped("tasks", scopeId)]);

  const news = articles
    .filter((a) => a.status === "published" && ms(a.publishedAt || a.createdAt) >= since)
    .sort((a, b) => ms(b.publishedAt) - ms(a.publishedAt))
    .slice(0, 6);
  const shipped = tasks.filter((t) => t.column === "Done" && ms(t.completedAt) >= since).slice(0, 15);

  const label = kind === "weekly" ? "This week" : "Today";
  const blocks: EmailBlock[] = [];

  let intro = kind === "weekly" ? `Here's what changed at ${opts.studioName} this week.` : `A quick update from ${opts.studioName}.`;
  if (opts.aiIntro && isConfigured() && (news.length || shipped.length)) {
    try {
      const raw = await chat(
        "small",
        [
          { role: "system", content: "Write a warm, specific 2-sentence intro for a game studio's player newsletter. No greeting line, no emojis, no hype. Plain text only. /no_think" },
          { role: "user", content: `Studio: ${opts.studioName}\nNews: ${news.map((n) => n.title).join("; ") || "none"}\nShipped: ${shipped.map((t) => t.title).join("; ") || "none"}` },
        ],
        { maxTokens: 200, temperature: 0.6 }
      );
      const clean = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (clean) intro = clean.slice(0, 400);
    } catch {
      // The template intro is fine.
    }
  }

  blocks.push({ id: newBlockId(), type: "heading", text: `${label} at ${opts.studioName}` });
  blocks.push({ id: newBlockId(), type: "text", text: intro });

  if (news.length) {
    blocks.push({
      id: newBlockId(),
      type: "articles",
      items: news.map((a) => ({ title: a.title || "Untitled", excerpt: a.excerpt || "", url: `${base}/p/article/${a.id}`, image: a.coverImage || undefined })),
    });
  }
  if (shipped.length) {
    blocks.push({ id: newBlockId(), type: "changelog", title: "Shipped", items: shipped.map((t) => t.title) });
  }
  blocks.push({ id: newBlockId(), type: "button", label: "See the full roadmap", url: `${base}/p/roadmap/${scopeId}` });

  return {
    subject: kind === "weekly" ? `${opts.studioName}: your weekly update` : `${opts.studioName}: today's update`,
    preheader: news[0]?.title || (shipped.length ? `${shipped.length} things shipped` : "Studio update"),
    blocks,
    empty: !news.length && !shipped.length,
  };
}
