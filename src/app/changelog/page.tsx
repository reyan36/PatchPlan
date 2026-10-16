"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  SquaresFour, 
  ArrowLeft, 
  GitCommit, 
  Sparkle, 
  Check, 
  Wrench, 
  Lightning, 
  Clock, 
  Copy, 
  CheckCircle, 
  CaretDown,
  Code
} from "@phosphor-icons/react";
import { ChangelogEntry } from "@/lib/changelog";

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [currentVersion, setCurrentVersion] = useState("v0.1.2");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "feature" | "improvement" | "fix" | "performance">("all");
  const [expandedCommits, setExpandedCommits] = useState<Record<string, boolean>>({});
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
        console.warn("Could not load changelog:", err);
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

  const toggleExpand = (hash: string) => {
    setExpandedCommits(prev => ({
      ...prev,
      [hash]: !prev[hash]
    }));
  };

  const filteredEntries = entries.filter(entry => {
    if (activeFilter === "all") return true;
    return entry.type === activeFilter;
  });

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

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#121212] text-[#FAFAFA] selection:bg-white/20 selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* ─── Floating Island Header ─── */}
      <header className="fixed top-4 inset-x-0 z-40 max-w-[860px] mx-auto px-4">
        <nav className="bg-[#1a1a1e]/80 border border-white/[0.08] backdrop-blur-2xl rounded-full px-4 py-2 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center text-white group-hover:bg-white/[0.12] transition-colors">
              <SquaresFour size={15} weight="fill" />
            </div>
            <span className="font-semibold text-[13px] tracking-tight text-white">
              patchplan
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-6 text-[13px] text-neutral-400">
            <Link href="/" className="hover:text-white transition-colors duration-150">Dashboard</Link>
            <Link href="/p/roadmap/demo" className="hover:text-white transition-colors duration-150">Roadmap</Link>
            <Link href="/landing" className="hover:text-white transition-colors duration-150">Landing</Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentVersion} Beta</span>
            </span>
          </div>
        </nav>
      </header>

      {/* ─── Main Content ─── */}
      <main className="relative z-10 pt-32 sm:pt-36 pb-24 px-4 max-w-4xl mx-auto">
        
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={13} weight="bold" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Hero Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-neutral-300 mb-4">
            <GitCommit size={14} className="text-primary" />
            <span>Automatic Version & Changelog Engine</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Changelog & Updates
          </h1>
          <p className="text-base text-neutral-400 max-w-xl leading-relaxed">
            Every studio update and Git commit is tracked, refined, and versioned automatically—starting from beta v0.1 towards v1.0 stable.
          </p>

          {/* Filter Bar */}
          <div className="mt-8 flex flex-wrap items-center gap-2 pt-6 border-t border-white/[0.08]">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeFilter === "all"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
              }`}
            >
              All Updates ({entries.length})
            </button>
            <button
              onClick={() => setActiveFilter("feature")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeFilter === "feature"
                  ? "bg-indigo-500 text-white font-semibold"
                  : "bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
              }`}
            >
              Features
            </button>
            <button
              onClick={() => setActiveFilter("performance")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeFilter === "performance"
                  ? "bg-emerald-500 text-white font-semibold"
                  : "bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
              }`}
            >
              Performance
            </button>
            <button
              onClick={() => setActiveFilter("fix")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeFilter === "fix"
                  ? "bg-amber-500 text-black font-semibold"
                  : "bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
              }`}
            >
              Fixes & Polish
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-6">
            <div className="h-44 bg-white/[0.03] border border-white/[0.06] rounded-2xl animate-pulse" />
            <div className="h-44 bg-white/[0.03] border border-white/[0.06] rounded-2xl animate-pulse" />
          </div>
        )}

        {/* Timeline Entries */}
        {!loading && (
          <div className="relative border-l border-white/[0.1] pl-6 sm:pl-8 ml-3 space-y-12">
            {filteredEntries.map((entry) => {
              const isExpanded = !!expandedCommits[entry.hash];

              return (
                <div key={entry.hash} className="relative group">
                  
                  {/* Timeline Node Dot */}
                  <div className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-3.5 h-3.5 rounded-full border-2 transition-transform group-hover:scale-125 ${
                    entry.isLatest 
                      ? "bg-emerald-400 border-[#050507] ring-4 ring-emerald-500/20" 
                      : "bg-neutral-600 border-[#050507]"
                  }`} />

                  {/* Card Container */}
                  <article className={`rounded-2xl border p-5 sm:p-7 transition-all ${
                    entry.isLatest 
                      ? "bg-[#0d0d11] border-white/[0.14] shadow-[0_8px_32px_rgba(0,0,0,0.6)]" 
                      : "bg-[#09090c] border-white/[0.07] hover:border-white/[0.14]"
                  }`}>
                    
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      
                      {/* Version & Badge */}
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-lg sm:text-xl font-extrabold text-white tracking-tight">
                          {entry.version}
                        </span>

                        {entry.isLatest && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                            Latest Release
                          </span>
                        )}

                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getBadgeStyle(entry.type)}`}>
                          {getBadgeIcon(entry.type)}
                          <span>{entry.badge}</span>
                        </span>
                      </div>

                      {/* Date & Hash */}
                      <div className="flex items-center gap-3 text-xs text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Clock size={13} className="text-neutral-500" />
                          <span>{entry.date} ({entry.relativeTime})</span>
                        </span>

                        <button
                          onClick={() => handleCopyHash(entry.hash)}
                          className="font-mono text-[11px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white transition-colors flex items-center gap-1 text-neutral-300"
                          title="Click to copy commit hash"
                        >
                          <span>#{entry.hash}</span>
                          {copiedHash === entry.hash ? (
                            <CheckCircle size={12} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} className="text-neutral-500" />
                          )}
                        </button>
                      </div>

                    </div>

                    {/* Title */}
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
                      {entry.title}
                    </h2>

                    {/* Summary */}
                    <p className="text-sm text-neutral-300 leading-relaxed mb-6 font-normal">
                      {entry.summary}
                    </p>

                    {/* Highlights Checklist */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 sm:p-5 mb-5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                        Shipped Improvements
                      </h3>
                      <ul className="space-y-2">
                        {entry.highlights.map((highlight, hIdx) => (
                          <li key={hIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-200">
                            <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                              <Check size={11} weight="bold" />
                            </span>
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Expandable Git Inspector */}
                    <div className="pt-3 border-t border-white/[0.06]">
                      <button
                        onClick={() => toggleExpand(entry.hash)}
                        className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1.5"
                      >
                        <Code size={13} />
                        <span>{isExpanded ? "Hide raw Git commit" : "Inspect raw Git commit"}</span>
                        <CaretDown 
                          size={12} 
                          className={`transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`} 
                        />
                      </button>

                      {isExpanded && (
                        <div className="mt-3 p-3.5 rounded-lg bg-black/60 border border-white/[0.08] font-mono text-[11px] text-neutral-400 space-y-1.5 animate-in fade-in duration-150">
                          <div><span className="text-neutral-600">commit:</span> {entry.fullHash}</div>
                          <div><span className="text-neutral-600">message:</span> {entry.rawCommit}</div>
                          {entry.rawBody && (
                            <div><span className="text-neutral-600">body:</span> {entry.rawBody}</div>
                          )}
                          <div><span className="text-neutral-600">author:</span> {entry.author || "developer"}</div>
                        </div>
                      )}
                    </div>

                  </article>
                </div>
              );
            })}
          </div>
        )}

        {/* Automation Info Card */}
        <section className="mt-20 p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#111116] to-[#0a0a0d] border border-white/[0.08] text-center">
          <div className="max-w-xl mx-auto space-y-3">
            <h3 className="text-base font-semibold text-white">
              How does PatchPlan automate this?
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Every time you run <code className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-200 font-mono">git commit</code>, the changelog engine automatically extracts the hash, author, and timestamp. It applies semantic natural language refinement to turn quick commit notes into studio-facing release highlights and increments the beta version sequentially from <code className="text-neutral-200 font-mono">v0.1</code> to <code className="text-neutral-200 font-mono">v1.0</code>.
            </p>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-10 px-4 text-xs text-neutral-500 max-w-4xl mx-auto text-center">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-white">
              <SquaresFour size={12} weight="duotone" />
            </div>
            <span className="font-semibold text-neutral-300">PatchPlan Changelog</span>
          </div>

          <div className="flex items-center gap-5 text-neutral-400">
            <Link href="/" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/p/roadmap/demo" className="hover:text-white transition-colors">Roadmap</Link>
            <Link href="/landing" className="hover:text-white transition-colors">Landing Page</Link>
            <span suppressHydrationWarning>&copy; {currentYear} PatchPlan</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
