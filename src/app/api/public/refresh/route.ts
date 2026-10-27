import { revalidatePath, revalidateTag } from "next/cache";
import { adminDb, emailRoute, requireMember } from "@/lib/email/server";
import { publicTag } from "@/lib/publicCache";

export const dynamic = "force-dynamic";

/**
 * The public roadmap and news pages are cached for a minute. After a studio member changes
 * something on the dashboard, this clears that studio's cached pages so players see it on the next load.
 */
export const POST = emailRoute(async (req) => {
  const { scopeId } = await req.json().catch(() => ({}));
  const id = String(scopeId || "").slice(0, 128);
  await requireMember(req, id);

  // The public URLs use the workspace id or a custom slug; refresh every one of them.
  const cfg = (await adminDb().collection("public_configs").doc(id).get()).data() || {};
  const keys = Array.from(new Set([id, cfg.roadmapSlug, cfg.newsSlug].filter((k): k is string => typeof k === "string" && !!k)));
  for (const key of keys) {
    revalidateTag(publicTag(key));
    revalidatePath(`/p/roadmap/${key}`);
    revalidatePath(`/p/news/${key}`);
  }
  return { ok: true };
});
