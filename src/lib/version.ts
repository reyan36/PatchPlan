"use client";

// Keeps open tabs in step with new deploys, the way Gmail or Linear do:
//
// - Every deploy has a build id (the git commit). Tabs compare theirs with /api/version every few
//   minutes while visible; when it differs, the update bar shows.
// - Once an update is known, the next in-app navigation loads the page fresh (DirtyContext), so most
//   people get the new version without noticing.
// - If an old tab asks for a code file the new deploy removed, it reloads once by itself, unless
//   there are unsaved changes or it already tried in the last minute (no reload loops).

export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "";

let updateReady = false;
let pageDirty = false;
const listeners = new Set<() => void>();

export const isUpdateReady = () => updateReady;

export function markUpdateReady() {
  if (updateReady) return;
  updateReady = true;
  listeners.forEach((l) => l());
}

export function onUpdateReady(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Set by DirtyProvider: an automatic reload must never throw away unsaved work. */
export const setPageDirty = (dirty: boolean) => {
  pageDirty = dirty;
};

export async function checkForUpdate() {
  if (!BUILD_ID) return;
  try {
    const res = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store" });
    const { buildId } = (await res.json()) as { buildId?: string };
    if (buildId && buildId !== BUILD_ID) markUpdateReady();
  } catch {
    // Offline or blocked: try again next time.
  }
}

/** A failed load of a code file from a previous deploy (old tab after a new deploy). */
export function isStaleCodeError(err: unknown) {
  const e = err as { name?: string; message?: string } | null;
  return /ChunkLoadError|Loading (CSS )?chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    `${e?.name ?? ""} ${e?.message ?? String(err ?? "")}`,
  );
}

const RELOAD_KEY = "pp-update-reload";

/** Reloads once to pick up the new version. Returns false when it shouldn't (unsaved work, or just tried). */
export function reloadForUpdate(): boolean {
  if (pageDirty) return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false; // can't remember the attempt, so don't risk a loop
  }
  window.location.reload();
  return true;
}
