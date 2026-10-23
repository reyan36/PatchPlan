// Server-only: lightweight reachability checks for the services PatchPlan depends on.
// Any HTTP answer below 500 (including 401/404) means the service is up and reachable.

export type ProbeResult = { ok: boolean; ms: number };

const projectId = () => process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";

/** Which checks exist, and whether each one applies to this deployment. */
export const PROBES: Record<string, { url: () => string; enabled: () => boolean }> = {
  db: { url: () => `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`, enabled: () => !!projectId() },
  auth: { url: () => "https://identitytoolkit.googleapis.com/v1/projects", enabled: () => true },
  ai: {
    url: () => `${(process.env.NEBIUS_BASE_URL || "https://api.tokenfactory.nebius.com/v1").replace(/\/$/, "")}/models`,
    enabled: () => !!process.env.NEBIUS_API_KEY,
  },
  email: { url: () => "https://api.resend.com/domains", enabled: () => !!process.env.RESEND_API_KEY },
  discord: { url: () => "https://discord.com/api/v10/gateway", enabled: () => true },
};

export async function probe(url: string, timeoutMs = 4000): Promise<ProbeResult> {
  const start = performance.now();
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    return { ok: res.status < 500, ms: Math.max(1, Math.round(performance.now() - start)) };
  } catch {
    return { ok: false, ms: Math.max(1, Math.round(performance.now() - start)) };
  }
}

export async function runProbe(id: string) {
  const p = PROBES[id];
  if (!p || !p.enabled()) return null;
  return probe(p.url());
}
