"use client";

import { useEffect, useState } from "react";
import { ArrowsClockwise, X } from "@phosphor-icons/react";
import { BUILD_ID, checkForUpdate, isStaleCodeError, isUpdateReady, markUpdateReady, onUpdateReady, reloadForUpdate } from "@/lib/version";

const CHECK_EVERY = 5 * 60_000;

/**
 * "A new version is available" bar. Checks /api/version every 5 minutes while the tab is visible
 * (and when it comes back into focus), never on page load, so it costs one tiny cached request.
 */
export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isUpdateReady()) setReady(true);
    const off = onUpdateReady(() => setReady(true));

    // Code from a previous deploy failing to load outside a page render (e.g. a lazy feature).
    const onRejection = (e: PromiseRejectionEvent) => {
      if (!isStaleCodeError(e.reason)) return;
      markUpdateReady();
      reloadForUpdate();
    };
    window.addEventListener("unhandledrejection", onRejection);

    if (process.env.NODE_ENV !== "production" || !BUILD_ID) {
      return () => {
        off();
        window.removeEventListener("unhandledrejection", onRejection);
      };
    }

    let lastCheck = Date.now();
    const check = () => {
      if (document.visibilityState !== "visible" || isUpdateReady() || Date.now() - lastCheck < 60_000) return;
      lastCheck = Date.now();
      checkForUpdate();
    };
    const timer = setInterval(check, CHECK_EVERY);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      off();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (!ready || dismissed) return null;
  return (
    <div role="status" className="border-b border-[#c8ff00]/20 bg-[#c8ff00]/[0.06] text-zinc-200">
      <div className="container mx-auto px-4 py-2 flex items-center gap-3 text-xs">
        <ArrowsClockwise size={14} weight="bold" className="text-[#c8ff00] shrink-0" />
        <p className="flex-1 min-w-0 truncate">
          <span className="font-medium text-white">A new version of PatchPlan is available.</span>{" "}
          <span className="text-zinc-400 hidden sm:inline">Reload when you&apos;re ready; your next page change updates it too.</span>
        </p>
        <button onClick={() => window.location.reload()} className="shrink-0 px-2.5 py-1 rounded-md bg-[#c8ff00] text-black font-semibold hover:bg-[#d4ff3a]">
          Reload
        </button>
        <button onClick={() => setDismissed(true)} className="shrink-0 p-1 rounded hover:bg-white/10" aria-label="Dismiss">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
