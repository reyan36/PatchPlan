"use client";

import type { ReactNode } from "react";
import { DiscordLogo, SteamLogo, RedditLogo, Globe, PencilSimple, CircleNotch } from "@phosphor-icons/react";
import type { FeedbackSource, SignalCategory } from "@/lib/ai/types";

export const CATEGORY_STYLE: Record<SignalCategory, string> = {
  bug: "bg-red-500/10 text-red-300 border-red-500/20",
  balance: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  feature: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  praise: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
};

export const SEVERITY_DOT = { high: "bg-red-400", medium: "bg-amber-400", low: "bg-zinc-500" } as const;

export function SourceIcon({ source, size = 13 }: { source: FeedbackSource; size?: number }) {
  const props = { size, weight: "fill" as const };
  if (source === "discord") return <DiscordLogo {...props} className="text-indigo-300" />;
  if (source === "steam") return <SteamLogo {...props} className="text-sky-300" />;
  if (source === "reddit") return <RedditLogo {...props} className="text-orange-400" />;
  if (source === "manual") return <PencilSimple size={size} className="text-zinc-400" />;
  return <Globe size={size} className="text-zinc-400" />;
}

export function Pill({ className = "", children }: { className?: string; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${className}`}>{children}</span>;
}

export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-white/10 bg-white/[0.02] ${className}`}>{children}</div>;
}

export function Button({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  className?: string;
}) {
  const styles = {
    primary: "bg-[#FAFAFA] text-black hover:bg-zinc-200",
    ghost: "border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.04]",
    danger: "text-zinc-500 hover:text-red-300 hover:bg-red-500/10",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none ${styles} ${className}`}
    >
      {loading && <CircleNotch size={13} className="animate-spin" />}
      {children}
    </button>
  );
}

export const inputClass =
  "w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/25";

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{message}</div>;
}
