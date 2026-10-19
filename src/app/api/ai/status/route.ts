import { NextResponse } from "next/server";
import { MODELS } from "@/lib/ai/llm";

export const dynamic = "force-dynamic";

/** Which AI integrations are configured on the server (never returns secrets). */
export async function GET() {
  return NextResponse.json({
    nebius: !!process.env.NEBIUS_API_KEY,
    tavily: !!process.env.TAVILY_API_KEY,
    discordBot: !!process.env.DISCORD_BOT_TOKEN,
    models: MODELS,
  });
}
