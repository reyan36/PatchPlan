// Server-only: verifies the caller's Firebase ID token so AI routes can't be used anonymously.

import { NextResponse } from "next/server";
import { AIError } from "./llm";

const cache = new Map<string, { uid: string; exp: number }>();

export async function requireUser(req: Request): Promise<string> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new AIError("Sign in to use PatchPlan AI.", 401);

  const hit = cache.get(token);
  if (hit && hit.exp > Date.now()) return hit.uid;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
  });
  const uid = res.ok ? (await res.json())?.users?.[0]?.localId : null;
  if (!uid) throw new AIError("Your session expired. Sign in again.", 401);

  if (cache.size > 500) cache.clear();
  cache.set(token, { uid, exp: Date.now() + 5 * 60_000 });
  return uid;
}

/** Wraps a route handler with auth + consistent JSON errors. */
export function aiRoute<T>(handler: (body: T, uid: string) => Promise<unknown>) {
  return async (req: Request) => {
    try {
      const uid = await requireUser(req);
      const body = (await req.json().catch(() => ({}))) as T;
      return NextResponse.json(await handler(body, uid));
    } catch (err) {
      const status = err instanceof AIError ? err.status : 500;
      const message = err instanceof Error ? err.message : "AI request failed.";
      if (status >= 500) console.error("[ai]", message);
      return NextResponse.json({ error: message }, { status });
    }
  };
}
