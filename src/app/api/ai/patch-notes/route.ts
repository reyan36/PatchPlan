import { aiRoute } from "@/lib/ai/auth";
import { AIError, chatJson } from "@/lib/ai/llm";
import type { PatchNotesDraft, ShippedTask } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Body = { tasks?: ShippedTask[]; gameName?: string; version?: string };

type Reply = {
  title: string;
  excerpt: string;
  intro: string;
  sections: { heading: string; items: { text: string; task: number }[] }[];
  outro?: string;
  discordSummary: string;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function creditLine(names: string[]) {
  const unique = Array.from(new Set(names.filter(Boolean)));
  if (!unique.length) return "";
  const shown = unique.slice(0, 4).join(", ");
  return unique.length > 4 ? `${shown} and ${unique.length - 4} more` : shown;
}

export const POST = aiRoute<Body>(async ({ tasks = [], gameName = "the game", version = "" }) => {
  const shipped = tasks.slice(0, 60);
  if (!shipped.length) throw new AIError("No shipped tasks to write about.", 400);

  const reply = await chatJson<Reply>(
    "large",
    `You write patch notes for the video game ${gameName} for its players.
Tone: friendly, concrete, no marketing fluff. Describe the player-facing effect of each change.
Group changes into sections such as "Bug fixes", "Balance", "New & improved".
Each item references the task number it came from. Do not invent changes that are not in the list.
Do not mention player names; credits are added separately.
Return {"title":"","excerpt":"one sentence","intro":"1-2 sentences","sections":[{"heading":"","items":[{"text":"","task":n}]}],"outro":"optional","discordSummary":"one line under 180 chars"}`,
    `${version ? `Version: ${version}\n` : ""}SHIPPED TASKS:\n${shipped
      .map((t, i) => `${i}. [${t.tags.join(",") || "General"}${t.category ? `/${t.category}` : ""}] ${t.title}${t.description ? ` — ${t.description.replace(/<[^>]+>/g, " ").slice(0, 300)}` : ""}`)
      .join("\n")}`,
    3000
  );

  // Build the HTML ourselves so model output is always escaped, then add player credits.
  const credited = new Set<number>();
  const sectionsHtml = (reply.sections || [])
    .map((s) => {
      const items = (s.items || [])
        .map((it) => {
          const t = shipped[it.task];
          if (t) credited.add(it.task);
          const credit = t ? creditLine(t.reporters) : "";
          return `<li>${esc(it.text)}${credit ? ` <em>(reported by ${esc(credit)})</em>` : ""}</li>`;
        })
        .join("");
      return items ? `<h2>${esc(s.heading)}</h2><ul>${items}</ul>` : "";
    })
    .join("");

  const allReporters = creditLine(shipped.flatMap((t) => t.reporters));
  const draft: PatchNotesDraft = {
    title: String(reply.title || `${gameName} ${version} patch notes`).slice(0, 120),
    excerpt: String(reply.excerpt || "").slice(0, 280),
    content:
      `<p>${esc(reply.intro)}</p>${sectionsHtml}` +
      (reply.outro ? `<p>${esc(reply.outro)}</p>` : "") +
      (allReporters ? `<p><strong>Thank you</strong> to everyone who reported these, including ${esc(allReporters)}.</p>` : ""),
    discordSummary: String(reply.discordSummary || reply.excerpt || "").slice(0, 200),
  };
  return { draft, uncredited: shipped.filter((_, i) => !credited.has(i)).map((t) => t.id) };
});
