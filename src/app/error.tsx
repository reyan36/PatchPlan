"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, ArrowsClockwise, Check, Copy, WarningCircle } from "@phosphor-icons/react";

/**
 * Shown when a page crashes. The rest of the app (navbar, footer) keeps working.
 * After a deploy, an open tab can ask for code files that no longer exist; that case gets a
 * "PatchPlan was updated" message, since a reload is the fix.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [copied, setCopied] = useState(false);
  const updated = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(`${error.name} ${error.message}`);
  // Server errors carry a digest that matches the server log; browser errors don't.
  const ref = error.digest;

  useEffect(() => {
    console.error(error);
  }, [error]);

  const copy = () => {
    const details = `PatchPlan error${ref ? ` ${ref}` : ""}\n${window.location.href}\n${new Date().toISOString()}\n${error.message}`;
    navigator.clipboard?.writeText(details).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center flex flex-col items-center">
        <span className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${updated ? "bg-[#c8ff00]/10 text-[#c8ff00]" : "bg-red-500/10 text-red-300"}`}>
          {updated ? <ArrowsClockwise size={24} weight="duotone" /> : <WarningCircle size={24} weight="duotone" />}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{updated ? "PatchPlan was updated" : "Something went wrong"}</h1>
        <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
          {updated
            ? "A newer version is live. Reload to get it; anything you saved is safe."
            : "This page hit an unexpected error. Trying again usually fixes it. Anything you already saved is safe."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-7">
          {updated ? (
            <button onClick={() => window.location.reload()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#c8ff00] text-black text-sm font-semibold hover:bg-[#d4ff3a] transition-colors">
              <ArrowClockwise size={15} weight="bold" /> Reload
            </button>
          ) : (
            <>
              <button onClick={reset} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#c8ff00] text-black text-sm font-semibold hover:bg-[#d4ff3a] transition-colors">
                <ArrowClockwise size={15} weight="bold" /> Try again
              </button>
              <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-md border border-white/10 text-sm text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors">
                Reload page
              </button>
            </>
          )}
          <Link href="/" className="px-4 py-2 rounded-md text-sm text-zinc-400 hover:text-white transition-colors">
            Go home
          </Link>
        </div>
        {!updated && (
          <div className="mt-8 text-xs text-zinc-600 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {ref && (
              <span>
                Error ID <code className="text-zinc-400">{ref}</code>
              </span>
            )}
            <button onClick={copy} className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-200">
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy details"}
            </button>
            <Link href="/status" className="text-zinc-500 hover:text-zinc-200">
              System status
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
