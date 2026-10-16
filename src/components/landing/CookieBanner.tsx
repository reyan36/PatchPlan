"use client";

import { useState, useEffect } from "react";
import { Cookie, X, ShieldCheck } from "@phosphor-icons/react";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

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
              <button
                onClick={() => setShowPolicy(true)}
                className="underline underline-offset-4 text-neutral-400 hover:text-white transition-colors text-[11px]"
              >
                Learn more
              </button>

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

      {/* Minimal Policy Modal */}
      {showPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl max-w-lg w-full p-6 text-neutral-300 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-semibold text-base">
                <ShieldCheck size={20} weight="duotone" className="text-primary" />
                <h3>Cookie & Data Policy</h3>
              </div>
              <button
                onClick={() => setShowPolicy(false)}
                className="text-neutral-400 hover:text-white transition-colors p-1"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed max-h-[60vh] overflow-y-auto pr-1 text-neutral-400">
              <div>
                <h4 className="text-white font-medium mb-1">1. Essential Authentication Cookies</h4>
                <p>
                  PatchPlan uses Google Firebase Authentication session tokens. These are strictly required to verify your identity, protect your workspace against CSRF attacks, and persist your login state securely across tabs.
                </p>
              </div>

              <div>
                <h4 className="text-white font-medium mb-1">2. Local Storage Preferences</h4>
                <p>
                  We store your selected active family/studio workspace, unsaved editor drafts, and interface theme choices in browser local storage for instantaneous, zero-latency loads.
                </p>
              </div>

              <div>
                <h4 className="text-white font-medium mb-1">3. Zero Advertising or Tracking Networks</h4>
                <p>
                  PatchPlan does not sell personal information, run third-party advertising cookies, or deploy cross-site tracking pixels. Your game design documents and roadmap data remain strictly your own.
                </p>
              </div>

              <div>
                <h4 className="text-white font-medium mb-1">4. Managing Your Preferences</h4>
                <p>
                  You can clear cookies or local storage at any time through your browser settings without affecting public roadmap and news viewing.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                onClick={() => setShowPolicy(false)}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
