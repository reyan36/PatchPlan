"use client";

import { auth } from "@/lib/firebase-app";

/** Owner-side calls to /api/beta with the user's Firebase ID token. */
export async function betaApi<T>(method: "GET" | "POST", params: Record<string, unknown>): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  let url = "/api/beta";
  let body: string | undefined;
  if (method === "GET") {
    url += `?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v ?? "")]))}`;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(params);
  }
  const res = await fetch(url, { method, headers, body, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

/** Firestore Timestamp | millis | undefined → millis. */
export const toMillis = (v: any): number => (typeof v === "number" ? v : v?.toMillis?.() ?? (v?.seconds ? v.seconds * 1000 : 0));

export function timeAgo(ms?: number) {
  if (!ms) return "";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ms).toLocaleDateString();
}
