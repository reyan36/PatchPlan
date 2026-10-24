"use client";

import { EnvelopeSimple } from "@phosphor-icons/react";
import { SubscribeForm } from "./SubscribeForm";

type Props = {
  scopeId: string;
  source: string;
  studioName: string;
  links?: { label: string; href: string }[];
};

/** Footer for public studio pages: email sign-up on one row, copyright and links below. Uses the --pp-* theme vars. */
export function PublicFooter({ scopeId, source, studioName, links = [] }: Props) {
  return (
    <footer className="mt-auto border-t border-[var(--pp-border,rgba(255,255,255,0.08))] text-[var(--pp-fg,#fafafa)]">
      <div className="max-w-6xl mx-auto px-6 py-10 grid gap-6 md:grid-cols-[1fr_minmax(0,440px)] md:items-center">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <EnvelopeSimple size={18} weight="duotone" className="text-[var(--pp-accent,#c8ff00)]" /> Get updates by email
          </p>
          <p className="mt-1 text-sm text-[var(--pp-muted,#a1a1aa)]">Patch notes, devlogs and news from {studioName}. No spam, unsubscribe anytime.</p>
        </div>
        <SubscribeForm scopeId={scopeId} source={source} studioName={studioName} variant="plain" />
      </div>
      <div className="border-t border-[var(--pp-border,rgba(255,255,255,0.08))]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--pp-muted,#a1a1aa)]">
          <span suppressHydrationWarning>
            &copy; {new Date().getFullYear()} {studioName}
          </span>
          <div className="flex items-center gap-4">
            {links.map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="hover:text-[var(--pp-fg,#fafafa)] transition-colors">
                {l.label}
              </a>
            ))}
            <a href="/privacy" className="hover:text-[var(--pp-fg,#fafafa)] transition-colors">
              Privacy
            </a>
            <span>
              Powered by <span className="font-medium text-[var(--pp-fg,#fafafa)]">PatchPlan</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
