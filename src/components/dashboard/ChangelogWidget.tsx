"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  GitCommit, 
  ArrowRight, 
  Sparkle, 
  Check, 
  Wrench, 
  Lightning, 
  Clock, 
  Copy, 
  CheckCircle 
} from "@phosphor-icons/react";
import { ChangelogEntry } from "@/lib/changelog";

export function ChangelogWidget() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [currentVersion, setCurrentVersion] = useState("v0.1.2");
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/changelog")
      .then(res => res.json())
      .then(data => {
        if (data.entries && data.entries.length > 0) {
          setEntries(data.entries);
          setCurrentVersion(data.currentVersion);
        }
      })
      .catch(err => {
        console.warn("Could not fetch changelog from API:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  // Show top 3 recent updates on dashboard
  const recentEntries = entries.slice(0, 3);

  const getBadgeStyle = (type: ChangelogEntry["type"]) => {
    switch (type) {
      case "feature":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "performance":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "fix":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-neutral-500/10 text-neutral-300 border-neutral-500/20";
    }
  };

  const getBadgeIcon = (type: ChangelogEntry["type"]) => {
    switch (type) {
      case "feature":
        return <Sparkle size={12} weight="fill" />;
      case "performance":
        return <Lightning size={12} weight="fill" />;
      case "fix":
        return <Wrench size={12} weight="fill" />;
      default:
        return <Check size={12} weight="bold" />;
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl p-6 relative overflow-hidden transition-all shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <GitCommit size={20} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Studio Update Log
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{currentVersion} Beta</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live updates automatically synchronized and refined from Git commits.
            </p>
          </div>
        </div>

        <Link
          href="/changelog"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors self-start sm:self-auto border border-border hover:border-white/20"
        >
          <span>View Full Changelog</span>
          <ArrowRight size={12} weight="bold" />
        </Link>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="h-20 bg-muted/40 rounded-lg animate-pulse" />
          <div className="h-20 bg-muted/40 rounded-lg animate-pulse" />
        </div>
      )}

      {/* Changelog Entries List */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentEntries.map((entry) => (
            <div
              key={entry.hash}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all text-left ${
                entry.isLatest 
                  ? "bg-muted/40 border-white/20 shadow-sm" 
                  : "bg-muted/20 border-border hover:border-border/80"
              }`}
            >
              <div>
                {/* Meta row */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {entry.version}
                    </span>
                    {entry.isLatest && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                        Latest
                      </span>
                    )}
                  </div>

                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${getBadgeStyle(entry.type)}`}>
                    {getBadgeIcon(entry.type)}
                    <span>{entry.badge}</span>
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-foreground line-clamp-1 mb-1.5">
                  {entry.title}
                </h3>

                {/* Highlights preview */}
                <ul className="space-y-1 mb-4 text-xs text-muted-foreground">
                  {entry.highlights.slice(0, 2).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 line-clamp-1">
                      <span className="text-primary mt-1 shrink-0">•</span>
                      <span className="line-clamp-1">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom commit footer */}
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{entry.relativeTime}</span>
                </span>

                <button
                  onClick={() => handleCopyHash(entry.hash)}
                  className="font-mono flex items-center gap-1 hover:text-foreground transition-colors px-1 py-0.5 rounded hover:bg-muted"
                  title="Click to copy commit hash"
                >
                  <span>#{entry.hash}</span>
                  {copiedHash === entry.hash ? (
                    <CheckCircle size={11} className="text-emerald-400" />
                  ) : (
                    <Copy size={11} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Banner */}
      <div className="mt-4 pt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Starting in open beta from v0.1 up to v1.0 stable release</span>
        <span className="text-neutral-500">Auto-versioned via Git commits</span>
      </div>
    </section>
  );
}
