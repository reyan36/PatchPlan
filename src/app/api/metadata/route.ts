// Link previews for doc mentions: fetches a page's <title>.
// Signed-in only, rate limited, and never fetches private or internal addresses (SSRF protection).

import { lookup } from "dns/promises";
import { isIP } from "net";
import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/email/server";
import { enforceLimit, logEvent } from "@/lib/security/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 256 * 1024;

function decodeHTMLEntities(text: string) {
  return text
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Loopback, private, link-local (cloud metadata), CGNAT, multicast and reserved ranges. */
function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || v6.startsWith("ff");
}

/** Only public http(s) hosts on standard ports. */
async function assertPublic(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http and https links are supported.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("Blocked port.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) throw new Error("Blocked host.");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("Blocked host.");
}

/** Fetches with manual redirects (each hop re-checked) and reads at most MAX_BYTES. */
async function fetchPublic(start: URL) {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PatchPlanLinkPreview/1.0; +https://patchplan.net)", Accept: "text/html" },
      signal: AbortSignal.timeout(5000),
    });
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) {
      url = new URL(next, url);
      continue;
    }
    if (!(res.headers.get("content-type") || "").includes("html") || !res.body) return "";
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    return Buffer.concat(chunks).toString("utf8");
  }
  throw new Error("Too many redirects.");
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url") || "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "No valid URL provided" }, { status: 400 });
  }
  const domain = target.hostname;
  const fallback = { title: raw, icon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`, domain };

  let uid: string;
  try {
    uid = (await verifyUser(request)).uid;
    enforceLimit(request, `meta:${uid}`, 30, 60_000, uid);
  } catch (err) {
    const status = (err as { status?: number }).status || 401;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sign in first." }, { status });
  }

  try {
    const html = await fetchPublic(target);
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = match ? decodeHTMLEntities(match[1].trim()).slice(0, 200) : raw;
    return NextResponse.json({ ...fallback, title: title || raw });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("Blocked")) await logEvent(request, "ssrf_blocked", `${msg} ${domain}`.slice(0, 200), { uid });
    return NextResponse.json(fallback);
  }
}
