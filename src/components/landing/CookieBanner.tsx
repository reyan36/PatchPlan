"use client";

import { useState, useEffect } from "react";
import { Cookie, X } from "@phosphor-icons/react";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a cookie choice
    const consent = localStorage.getItem("patchplan_cookie_consent");
    if (!consent) {
      // Small delay for smooth entry
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleChoice = (choice: "accepted" | "rejected") => {
    localStorage.setItem("patchplan_cookie_consent", choice);
    setVisible(false);
  };

  return (
    <>
      {/* Floating Minimal Consent Banner */}
      {visible && (
        <aside
          aria-label="Cookie Consent"
          className="fixed bottom-5 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="bg-[#0c0c0e]/95 border border-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-2xl text-xs text-neutral-300 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-white font-medium">
                <span className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-200">
                  <Cookie size={16} weight="duotone" />
                </span>
                <span>Cookie & Privacy Policy</span>
              </div>
              <button
                onClick={() => setVisible(false)}
                className="text-neutral-500 hover:text-white transition-colors p-1"
                aria-label="Dismiss banner"
              >
                <X size={14} weight="bold" />
              </button>
            </div>

            <p className="leading-relaxed text-neutral-400">
              We use strictly essential cookies and local storage to keep your session secure and remember your studio settings. No third-party ad trackers.
            </p>

            <div className="flex items-center justify-between pt-1">
              <a href="/privacy#cookies" className="underline underline-offset-4 text-neutral-400 hover:text-white transition-colors text-[11px]">
                Learn more
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleChoice("rejected")}
                  className="px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/5 text-neutral-300 font-medium transition-colors text-xs"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleChoice("accepted")}
                  className="px-4 py-1.5 rounded-full bg-white text-black font-semibold hover:bg-neutral-200 transition-colors text-xs shadow-sm"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
