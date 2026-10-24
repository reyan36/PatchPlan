"use client";

import { useState } from "react";
import { CheckCircle, CircleNotch, EnvelopeSimple } from "@phosphor-icons/react";
import { EMAIL_LISTS, type EmailList } from "@/lib/email/types";

type Props = {
  /** Workspace id or the public page's custom slug. */
  scopeId: string;
  source: string;
  studioName?: string;
  /** "card" for public pages; "plain" inherits colours (used on the standalone sign-up page). */
  variant?: "card" | "plain";
  showLists?: boolean;
  className?: string;
};

/** Public email sign-up. Uses the --pp-* theme vars when present, with neutral fallbacks. */
export function SubscribeForm({ scopeId, source, studioName, variant = "card", showLists = false, className = "" }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [lists, setLists] = useState<EmailList[]>(["weekly", "announcements"]);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setState("busy");
    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeId, email, name, website, source, lists: showLists ? lists : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't subscribe. Try again.");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't subscribe.");
      setState("idle");
    }
  };

  const fg = "var(--pp-fg, #fafafa)";
  const muted = "var(--pp-muted, #a1a1aa)";
  const border = "var(--pp-border, rgba(255,255,255,0.12))";
  const accent = "var(--pp-accent, #c8ff00)";

  const wrap = variant === "card" ? "rounded-2xl border p-6 sm:p-8" : "";

  if (state === "done") {
    return (
      <div className={`${wrap} ${className}`} style={{ borderColor: border, color: fg }}>
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle size={20} weight="fill" style={{ color: accent }} /> You&apos;re subscribed
        </div>
        <p className="text-sm mt-1" style={{ color: muted }}>Thanks! Updates from {studioName || "the team"} will land in your inbox. Every email has an unsubscribe link.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`relative ${wrap} ${className}`} style={{ borderColor: border, color: fg }}>
      {variant === "card" && (
        <div className="mb-4">
          <div className="flex items-center gap-2 font-semibold"><EnvelopeSimple size={18} weight="duotone" style={{ color: accent }} /> Get updates by email</div>
          <p className="text-sm mt-1" style={{ color: muted }}>Patch notes, devlogs and news from {studioName || "the team"}. No spam, unsubscribe anytime.</p>
        </div>
      )}
      <div className={`flex flex-col gap-2 ${showLists ? "" : "sm:flex-row"}`}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className="flex-1 min-w-0 rounded-lg border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:ring-2"
          style={{ borderColor: border, color: fg }}
        />
        {showLists && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            aria-label="Name"
            className="rounded-lg border bg-transparent px-3.5 py-2.5 text-sm outline-none"
            style={{ borderColor: border, color: fg }}
          />
        )}
        <button type="submit" disabled={state === "busy" || (showLists && !lists.length)} className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60" style={{ background: accent, color: "var(--pp-on-accent, #0a0a0a)" }}>
          {state === "busy" && <CircleNotch size={14} className="animate-spin" />}
          Subscribe
        </button>
      </div>
      {/* Hidden from people; bots fill it in. */}
      <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" aria-hidden className="absolute -left-[9999px] w-px h-px opacity-0" />
      {showLists && (
        <div className="mt-4 space-y-2">
          {EMAIL_LISTS.map((l) => (
            <label key={l.key} className="flex items-start gap-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={lists.includes(l.key)}
                onChange={(e) => setLists(e.target.checked ? [...lists, l.key] : lists.filter((x) => x !== l.key))}
                className="mt-0.5"
                style={{ accentColor: accent }}
              />
              <span>
                {l.label} <span style={{ color: muted }}>· {l.hint}</span>
              </span>
            </label>
          ))}
        </div>
      )}
      <p className="text-xs mt-3" style={{ color: muted }}>
        You&apos;ll get emails from {studioName || "this studio"} and can unsubscribe any time.{" "}
        <a href="/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Privacy Policy
        </a>
      </p>
      {error && <p className="text-sm mt-3 text-red-400">{error}</p>}
    </form>
  );
}
