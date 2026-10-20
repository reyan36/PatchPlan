import { aiRoute } from "@/lib/ai/auth";
import { AIError, chatJson } from "@/lib/ai/llm";
import { newBlockId, type EmailBlock } from "@/lib/email/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = { prompt?: string; studioName?: string; context?: string };

type Reply = {
  subject: string;
  preheader: string;
  blocks: { type: string; text?: string; label?: string; url?: string; title?: string; items?: string[] }[];
};

/** Drafts a player email as designer blocks. Only text-like blocks; links stay as the studio provides them. */
export const POST = aiRoute<Body>(async ({ prompt = "", studioName = "our studio", context = "" }) => {
  const ask = prompt.trim().slice(0, 1000);
  if (!ask) throw new AIError("Describe the email you want.", 400);

  const reply = await chatJson<Reply>(
    "large",
    `You write emails from the indie game studio ${studioName} to its players.
Voice: friendly, concrete, human. No hype words ("epic", "insane"), no emojis in the subject.
Use these block types only:
- {"type":"heading","text":""}
- {"type":"text","text":""}  (supports **bold** and [label](https://url) only for URLs given in the context)
- {"type":"changelog","title":"","items":[""]}
- {"type":"button","label":"","url":""} only if the context gives a URL
Keep it short: 3-7 blocks. Subject under 60 characters; preheader under 90.
Return {"subject":"","preheader":"","blocks":[...]}`,
    `REQUEST: ${ask}${context ? `\n\nCONTEXT:\n${context.slice(0, 3000)}` : ""}`,
    2000
  );

  const blocks: EmailBlock[] = [];
  (reply.blocks || []).slice(0, 10).forEach((b) => {
    if (b.type === "heading" && b.text) blocks.push({ id: newBlockId(), type: "heading", text: String(b.text).slice(0, 140) });
    if (b.type === "text" && b.text) blocks.push({ id: newBlockId(), type: "text", text: String(b.text).slice(0, 2000) });
    if (b.type === "changelog" && Array.isArray(b.items))
      blocks.push({ id: newBlockId(), type: "changelog", title: String(b.title || "").slice(0, 60), items: b.items.slice(0, 20).map((i) => String(i).slice(0, 240)) });
    if (b.type === "button" && b.label && /^https?:\/\//.test(String(b.url)))
      blocks.push({ id: newBlockId(), type: "button", label: String(b.label).slice(0, 40), url: String(b.url) });
  });
  if (!blocks.length) throw new AIError("The model didn't return any content. Try again.", 502);

  return { subject: String(reply.subject || "").slice(0, 120), preheader: String(reply.preheader || "").slice(0, 160), blocks };
});
