import { NextResponse } from "next/server";
import { runProbe } from "@/lib/status/probes";

export const dynamic = "force-dynamic";

// /api/health                → the web app itself (always 200 while it's serving)
// /api/health?check=db       → also db | auth | ai | email | discord: 200 when that service is
//                              reachable, 503 when not. Point one UptimeRobot monitor at each to
//                              give every component on /status its own uptime history.
export async function GET(req: Request) {
  const check = new URL(req.url).searchParams.get("check");
  if (!check) return NextResponse.json({ status: "ok", service: "patchplan", timestamp: Date.now() });

  const result = await runProbe(check);
  if (!result) return NextResponse.json({ status: "unknown", check }, { status: 404 });
  return NextResponse.json(
    { status: result.ok ? "ok" : "down", check, ms: result.ms, timestamp: Date.now() },
    // Short edge cache: a burst of checks costs one probe.
    { status: result.ok ? 200 : 503, headers: { "Cache-Control": "public, s-maxage=30" } }
  );
}

export async function HEAD(req: Request) {
  const res = await GET(req);
  return new Response(null, { status: res.status });
}
