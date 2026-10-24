// The build id of the deployed version, generated at build time and served as a static file from
// Vercel's CDN (no function runs). Open tabs compare it with their own (lib/version.ts).
export const dynamic = "force-static";

export function GET() {
  return Response.json({ buildId: process.env.NEXT_PUBLIC_BUILD_ID || "" });
}
