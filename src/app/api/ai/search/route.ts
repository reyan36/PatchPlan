import { aiRoute } from "@/lib/ai/auth";
import { AIError, chatJson } from "@/lib/ai/llm";
import type { SearchDoc, SearchHit } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = { query?: string; docs?: SearchDoc[] };

const STOP = new Set("a an the of to in on for and or is are was what where which who how do does did my our we i with about any all".split(" "));

const terms = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));

/** Cheap keyword score so only plausible candidates reach the model. */
function lexicalScore(doc: SearchDoc, q: string[]) {
  const title = doc.title.toLowerCase();
  const text = doc.text.toLowerCase();
  return q.reduce((s, w) => s + (title.includes(w) ? 3 : 0) + (text.includes(w) ? 1 : 0) + (title.includes(w.slice(0, 4)) ? 0.5 : 0), 0);
}

export const POST = aiRoute<Body>(async ({ query = "", docs = [] }) => {
  const q = query.trim().slice(0, 300);
  if (!q) throw new AIError("Ask something first.", 400);

  const pool = docs.slice(0, 1500);
  const qTerms = terms(q);
  const scored = pool.map((d, i) => ({ d, i, s: lexicalScore(d, qTerms) }));
  const top = scored.sort((a, b) => b.s - a.s).slice(0, 40);
  if (!top.length) return { answer: "Your workspace is empty so far.", hits: [] };

  const reply = await chatJson<{ answer: string; hits: { n: number; reason: string }[] }>(
    "small",
    `You search a game studio's workspace (tasks, design docs, devlogs, roadmap, creator contacts, player signals).
Pick the items that best answer the question, most relevant first, at most 8. Understand intent and synonyms
(e.g. "boss fight" matches "Boss phase 2 rig"). If nothing is relevant, return no hits.
"answer" is one or two sentences that directly answer the question using only these items.
Return {"answer":"","hits":[{"n":item number,"reason":"short why"}]}`,
    `QUESTION: ${q}\n\nITEMS:\n${top.map(({ d }, n) => `${n}. [${d.type}] ${d.title} — ${d.text.slice(0, 280)}`).join("\n")}`,
    1200
  );

  const seen = new Set<number>();
  const hits: SearchHit[] = [];
  (reply.hits || []).forEach((h) => {
    const t = top[h.n];
    if (!t || seen.has(h.n)) return;
    seen.add(h.n);
    hits.push({ type: t.d.type, id: t.d.id, title: t.d.title, href: t.d.href, reason: String(h.reason || "").slice(0, 160) });
  });
  return { answer: String(reply.answer || "").slice(0, 500), hits };
});
