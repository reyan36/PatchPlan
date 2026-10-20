import { emailStatus } from "@/lib/email/server";

export const dynamic = "force-dynamic";

/** Which email integrations are configured (never returns secrets). */
export async function GET() {
  return Response.json({ ...emailStatus(), fromAddress: process.env.EMAIL_FROM_ADDRESS || null });
}
