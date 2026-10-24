"use client";

import type { User } from "firebase/auth";
import { collection, getDocs, query, where, type DocumentData } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { SearchDoc } from "./types";

/** POSTs to an /api/ai route with the user's Firebase ID token. */
export async function aiFetch<T>(path: string, body: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/ai/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export type AIStatus = { nebius: boolean; tavily: boolean; discordBot: boolean; models: { small: string; large: string } };

export async function getAIStatus(): Promise<AIStatus | null> {
  try {
    return await (await fetch("/api/ai/status")).json();
  } catch {
    return null;
  }
}

/** Same scoping rule the rest of the app uses: studio docs by familyId, personal docs by userId with no familyId. */
export async function loadScoped(col: string, user: User, familyId: string | null) {
  const q = familyId
    ? query(collection(db, col), where("familyId", "==", familyId))
    : query(collection(db, col), where("userId", "==", user.uid));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as DocumentData & { id: string })
    .filter((d) => familyId || !d.familyId);
}

export const scopeFields = (user: User, familyId: string | null) => ({ userId: user.uid, familyId });

const strip = (html: unknown) => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** Flattens the workspace into a search corpus. Missing collections or permissions are skipped. */
export async function loadSearchCorpus(user: User, familyId: string | null): Promise<SearchDoc[]> {
  const safe = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
  const scopeId = familyId || user.uid;

  const [tasks, ideas, articles, roadmap, signals, contacts] = await Promise.all([
    safe(loadScoped("tasks", user, familyId)),
    safe(loadScoped("ideas", user, familyId)),
    safe(loadScoped("articles", user, familyId)),
    safe(loadScoped("roadmap", user, familyId)),
    safe(loadScoped("signals", user, familyId)),
    safe(getDocs(query(collection(db, "contacts"), where("scopeId", "==", scopeId))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }) as DocumentData & { id: string }))),
  ]);

  return [
    ...tasks.map((t) => ({ type: "task" as const, id: t.id, title: t.title || "Untitled task", text: `${(t.tags || []).join(" ")} · ${t.column || ""} · ${strip(t.description)}`.slice(0, 600), href: `/board?task=${t.id}` })),
    ...ideas.map((i) => ({ type: "doc" as const, id: i.id, title: i.title || "Untitled doc", text: strip(i.preview ?? i.content).slice(0, 600), href: `/ideas/${i.id}` })),
    ...articles.map((a) => ({ type: "devlog" as const, id: a.id, title: a.title || "Untitled article", text: `${a.category || ""} · ${a.status || ""} · ${a.excerpt || ""} ${strip(a.content)}`.slice(0, 600), href: `/news/${a.id}` })),
    ...roadmap.map((r) => ({ type: "roadmap" as const, id: r.id, title: r.title || "Roadmap item", text: `${r.column || ""} · ${r.category || ""} · ${(r.bullets || []).join("; ")}`.slice(0, 600), href: "/roadmap" })),
    ...signals.map((s) => ({ type: "signal" as const, id: s.id, title: s.summary || "Player signal", text: `${s.category} · ${s.status} · ${(s.reports || []).map((r: any) => r.text).join(" ")}`.slice(0, 600), href: "/ai?tab=signal" })),
    ...contacts.map((c) => ({ type: "contact" as const, id: c.id, title: c.name || "Contact", text: Object.entries(c).filter(([k, v]) => typeof v === "string" && !["id", "scopeId"].includes(k)).map(([, v]) => v).join(" · ").slice(0, 600), href: "/marketing" })),
  ];
}
