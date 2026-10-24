"use client";

// Shared live Firestore queries, the way React Query / Apollo share fetches:
//
// - One listener per query key, however many components use it (navbar + inbox, board + signals).
// - When the last component unmounts, the listener lingers for a minute, so going back to a page
//   shows its data instantly instead of a loading state, and Firestore resumes instead of re-reading.
// - Firestore itself is only downloaded when the first live query starts.
//
// Keys must include everything the query depends on (user id, studio id). clearLive() runs on sign-out.

import { useCallback, useSyncExternalStore } from "react";
import type { DocumentReference, Query } from "firebase/firestore";

type Fs = typeof import("@/lib/lazyFirestore");
export type LiveState<T> = { data: T | undefined; error: string | null; ready: boolean };
export type WithId<T> = T & { id: string };

type Entry = {
  state: LiveState<unknown>;
  listeners: Set<() => void>;
  stop?: () => void;
  linger?: ReturnType<typeof setTimeout>;
};

const LINGER_MS = 60_000;
const IDLE: LiveState<never> = { data: undefined, error: null, ready: false };
const entries = new Map<string, Entry>();

function start(key: string, entry: Entry, build: (fs: Fs) => Query | DocumentReference, kind: "query" | "doc") {
  let stopped = false;
  let unsub = () => {};
  entry.stop = () => {
    stopped = true;
    unsub();
  };
  const set = (next: LiveState<unknown>) => {
    entry.state = next;
    entry.listeners.forEach((l) => l());
  };
  const onError = (err: Error) => {
    console.warn(`[live] ${key}:`, err.message);
    // A failed listener is dead; the next component to need it starts a fresh one.
    entry.stop = undefined;
    set({ ...entry.state, error: err.message, ready: true });
  };
  import("@/lib/lazyFirestore")
    .then((fs) => {
      if (stopped) return;
      const target = build(fs);
      unsub =
        kind === "doc"
          ? fs.onSnapshot(target as DocumentReference, (s) => set({ data: s.exists() ? { id: s.id, ...s.data() } : null, error: null, ready: true }), onError)
          : fs.onSnapshot(target as Query, (s) => set({ data: s.docs.map((d) => ({ id: d.id, ...d.data() })), error: null, ready: true }), onError);
    })
    .catch(onError);
}

function useLive<T>(key: string | null, build: (fs: Fs) => Query | DocumentReference, kind: "query" | "doc"): LiveState<T> {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!key) return () => {};
      let entry = entries.get(key);
      if (!entry) {
        entry = { state: IDLE, listeners: new Set() };
        entries.set(key, entry);
      }
      clearTimeout(entry.linger);
      entry.listeners.add(onChange);
      if (!entry.stop) start(key, entry, build, kind);
      return () => {
        const e = entries.get(key);
        if (!e) return;
        e.listeners.delete(onChange);
        if (e.listeners.size === 0) {
          e.linger = setTimeout(() => {
            e.stop?.();
            entries.delete(key);
          }, LINGER_MS);
        }
      };
    },
    // `build` is identified by `key`; a new function with the same key is the same query.
    [key, kind],
  );
  const get = useCallback(() => (key ? (entries.get(key)?.state ?? IDLE) : IDLE), [key]);
  return useSyncExternalStore(subscribe, get, () => IDLE) as LiveState<T>;
}

/** Live list of documents. `key` null = not ready to query yet (e.g. no user). */
export function useLiveQuery<T>(key: string | null, build: (fs: Fs) => Query): LiveState<WithId<T>[]> {
  return useLive<WithId<T>[]>(key, build, "query");
}

/** Live single document; data is null when it doesn't exist. */
export function useLiveDoc<T>(key: string | null, build: (fs: Fs) => DocumentReference): LiveState<WithId<T> | null> {
  return useLive<WithId<T> | null>(key, build, "doc");
}

/** Stops every listener and forgets cached data (sign-out, account switch). */
export function clearLive() {
  entries.forEach((e) => {
    clearTimeout(e.linger);
    e.stop?.();
  });
  entries.clear();
}

// ---------- Shared query definitions ----------
// Defined once so every screen using the same data shares one listener.

/** All tasks of a workspace. Personal mode also returns studio tasks you created; filter with personalOnly(). */
export const scopeTasks = (uid: string, familyId: string | null | undefined) => ({
  key: familyId ? `tasks:family:${familyId}` : `tasks:user:${uid}`,
  build: (fs: Fs) => fs.query(fs.collection(fs.db, "tasks"), familyId ? fs.where("familyId", "==", familyId) : fs.where("userId", "==", uid)),
});

/** Tasks assigned to you in every workspace (navbar badge, inbox). */
export const assignedTasks = (uid: string) => ({
  key: `tasks:assignee:${uid}`,
  build: (fs: Fs) => fs.query(fs.collection(fs.db, "tasks"), fs.where("assigneeId", "==", uid)),
});

export const scopeIdeas = (uid: string, familyId: string | null | undefined) => ({
  key: familyId ? `ideas:family:${familyId}` : `ideas:user:${uid}`,
  build: (fs: Fs) => fs.query(fs.collection(fs.db, "ideas"), familyId ? fs.where("familyId", "==", familyId) : fs.where("userId", "==", uid)),
});

/** Personal workspaces exclude docs that belong to a studio (they also carry your userId). */
export function personalOnly<T extends { familyId?: string | null }>(list: T[] | undefined, familyId: string | null | undefined): T[] {
  if (!list) return [];
  return familyId ? list : list.filter((x) => !x.familyId);
}
