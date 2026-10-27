"use client";

import { auth } from "@/lib/firebase-app";

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Clears the cached public roadmap and news pages for this workspace so changes show right away.
 * Debounced, so a burst of edits (dragging cards around) sends one request.
 * Not critical if it fails: the pages refresh on their own within a minute.
 */
export function refreshPublicPages(scopeId: string | null | undefined) {
  if (!scopeId) return;
  clearTimeout(timers.get(scopeId));
  timers.set(
    scopeId,
    setTimeout(async () => {
      timers.delete(scopeId);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        await fetch("/api/public/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ scopeId }),
          keepalive: true,
        });
      } catch {
        // Falls back to the one-minute refresh.
      }
    }, 800)
  );
}
