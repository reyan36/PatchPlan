import { NextResponse } from "next/server";
import { MODELS } from "@/lib/ai/llm";
import { aiAllowed, aiPaused } from "@/lib/ai/budget";
import { checkIdToken } from "@/lib/email/server";

export const dynamic = "force-dynamic";

/** Which AI integrations are configured, and whether the signed-in account may use them (never returns secrets). */
export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const decoded = token ? await checkIdToken(req, token).catch(() => null) : null;
  return NextResponse.json({
    nebius: !!process.env.NEBIUS_API_KEY,
    tavily: !!process.env.TAVILY_API_KEY,
    discordBot: !!process.env.DISCORD_BOT_TOKEN,
    paused: aiPaused(),
    allowed: aiAllowed(decoded?.email),
    models: MODELS,
  });
}
