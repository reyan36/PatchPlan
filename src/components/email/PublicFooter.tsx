"use client";

import type { CSSProperties } from "react";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { SubscribeForm } from "./SubscribeForm";
import { onAccent, type SignupStyle } from "@/lib/newsTheme";

type Props = {
  scopeId: string;
  source: string;
  studioName: string;
  links?: { label: string; href: string }[];
  /** The studio's chosen sign-up look. `accent` is the page's resolved accent; `signupColor` overrides it here. */
  design?: { signupStyle?: SignupStyle; signupColor?: string; accent?: string };
};

const BORDER = "var(--pp-border,rgba(255,255,255,0.08))";

/** Footer for public studio pages: the email sign-up (in the studio's chosen style), copyright and links. Uses the --pp-* theme vars. */
export function PublicFooter({ scopeId, source, studioName, links = [], design }: Props) {
  const style = design?.signupStyle || "sleek";
  const color = design?.signupColor || design?.accent || "";
  // The sign-up's own colour, so it can differ from the rest of the page.
  const colorVars = (color ? { ["--pp-accent" as any]: color, ["--pp-on-accent" as any]: onAccent(color) } : {}) as CSSProperties;
  const blurb = `Patch notes, devlogs and news from ${studioName}. No spam, unsubscribe anytime.`;

  return (
    <footer className="mt-auto text-[var(--pp-fg,#fafafa)]">
      {style === "bold" ? (
        <BoldSignup color={color || "#c8ff00"} scopeId={scopeId} source={source} studioName={studioName} blurb={blurb} />
      ) : style === "card" ? (
        <div className="border-t px-6 py-14" style={{ ...colorVars, borderColor: BORDER }}>
          <div className="relative mx-auto max-w-xl overflow-hidden rounded-2xl border bg-[var(--pp-surface,#1a1a1a)] p-8 text-center shadow-xl" style={{ borderColor: BORDER }}>
            <div className="absolute inset-x-0 top-0 h-1 bg-[var(--pp-accent,#c8ff00)]" />
            <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--pp-accent,#c8ff00)_15%,transparent)]">
              <EnvelopeSimple size={22} weight="duotone" className="text-[var(--pp-accent,#c8ff00)]" />
            </span>
            <p className="text-xl font-bold tracking-tight">Get updates by email</p>
            <p className="mx-auto mt-1.5 mb-6 max-w-sm text-sm text-[var(--pp-muted,#a1a1aa)]">{blurb}</p>
            <SubscribeForm scopeId={scopeId} source={source} studioName={studioName} variant="plain" className="text-left" />
          </div>
        </div>
      ) : style === "minimal" ? (
        <div className="border-t" style={{ ...colorVars, borderColor: BORDER }}>
          <div className="max-w-6xl mx-auto px-6 py-6 grid gap-3 md:grid-cols-[auto_minmax(0,420px)] md:items-start md:justify-between">
            <p className="text-sm text-[var(--pp-muted,#a1a1aa)] md:pt-2.5">
              <span className="font-medium text-[var(--pp-fg,#fafafa)]">Get updates by email</span> from {studioName}.
            </p>
            <SubscribeForm scopeId={scopeId} source={source} studioName={studioName} variant="plain" />
          </div>
        </div>
      ) : (
        <div className="border-t" style={{ ...colorVars, borderColor: BORDER }}>
          <div className="max-w-6xl mx-auto px-6 py-10 grid gap-6 md:grid-cols-[1fr_minmax(0,440px)] md:items-center">
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <EnvelopeSimple size={18} weight="duotone" className="text-[var(--pp-accent,#c8ff00)]" /> Get updates by email
              </p>
              <p className="mt-1 text-sm text-[var(--pp-muted,#a1a1aa)]">{blurb}</p>
            </div>
            <SubscribeForm scopeId={scopeId} source={source} studioName={studioName} variant="plain" />
          </div>
        </div>
      )}
      <div className="border-t" style={{ borderColor: BORDER }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--pp-muted,#a1a1aa)]">
          <span suppressHydrationWarning>
            &copy; {new Date().getFullYear()} {studioName}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-4">
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

/** A full-width band in the sign-up colour. Text and the button flip to whatever reads best on it. */
function BoldSignup({ color, scopeId, source, studioName, blurb }: { color: string; scopeId: string; source: string; studioName: string; blurb: string }) {
  const on = onAccent(color);
  const vars = {
    background: color,
    color: on,
    ["--pp-fg" as any]: on,
    ["--pp-muted" as any]: `color-mix(in srgb, ${on} 72%, transparent)`,
    ["--pp-border" as any]: `color-mix(in srgb, ${on} 28%, transparent)`,
    ["--pp-accent" as any]: on,
    ["--pp-on-accent" as any]: color,
  } as CSSProperties;
  return (
    <div style={vars}>
      <div className="max-w-6xl mx-auto px-6 py-14 grid gap-8 md:grid-cols-[1fr_minmax(0,440px)] md:items-center">
        <div>
          <p className="text-3xl md:text-4xl font-extrabold tracking-tight leading-none uppercase">Never miss an update</p>
          <p className="mt-3 text-sm md:text-base text-[var(--pp-muted)]">{blurb}</p>
        </div>
        <SubscribeForm scopeId={scopeId} source={source} studioName={studioName} variant="plain" />
      </div>
    </div>
  );
}
