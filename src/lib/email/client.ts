"use client";

import { auth } from "@/lib/firebase";

/** POSTs to an /api/email route with the user's Firebase ID token. */
export async function emailFetch<T>(path: string, body: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/email/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

/** Any-method call to an /api/email route with the user's ID token. */
export async function emailApi<T>(path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/email/${path}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export type EmailStatus = {
  firebaseAdmin: boolean;
  resend: boolean;
  fromAddress: string | null;
  appUrl: boolean;
  cron: boolean;
};

export async function getEmailStatus(): Promise<EmailStatus | null> {
  try {
    return await (await fetch("/api/email/status")).json();
  } catch {
    return null;
  }
}

/** Same doc id the public sign-up route uses, so manual adds and sign-ups never duplicate. */
export async function subscriberId(scopeId: string, email: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.trim().toLowerCase()));
  const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${scopeId}_${hex.slice(0, 24)}`;
}

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
