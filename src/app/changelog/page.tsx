"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { ChangelogEntry } from "@/lib/changelog";

import { Logo } from "@/components/ui/Logo";
function formatReleaseDate(dateStr: string): string {
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [currentVersion, setCurrentVersion] = useState("v0.1.3");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/changelog")
      .then((res) => res.json())
      .then((data) => {
        if (data.entries && data.entries.length > 0) {
          setEntries(data.entries);
          setCurrentVersion(data.currentVersion);
        }
      })
      .catch((err) => {
        console.warn("Could not load changelog:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#121212] text-[#FAFAFA] selection:bg-white/20 selection:text-white font-sans antialiased flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#121212]/85 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center text-white group-hover:bg-white/[0.12] transition-colors">
              <Logo size={15} />
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">
              patchplan
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-zinc-400 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
              {currentVersion}
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={13} weight="bold" />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 pt-16 pb-24">
        {/* Page Header */}
        <div className="pb-12 border-b border-white/[0.08]">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#FAFAFA]">
            Changelog
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            New updates and improvements to PatchPlan.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="divide-y divide-white/[0.08]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="py-12 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 animate-pulse">
                <div className="space-y-2">
                  <div className="h-5 w-16 bg-white/[0.05] rounded" />
                  <div className="h-4 w-24 bg-white/[0.03] rounded" />
                </div>
                <div className="space-y-3">
                  <div className="h-6 w-2/3 bg-white/[0.05] rounded" />
                  <div className="h-4 w-full bg-white/[0.03] rounded" />
                  <div className="h-4 w-4/5 bg-white/[0.03] rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Release List */}
        {!loading && (
          <div className="divide-y divide-white/[0.08]">
            {entries.map((entry) => (
              <article
                key={entry.version}
                className="py-12 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 md:gap-10 items-start"
              >
                {/* Left Column: Version & Date */}
                <div className="md:sticky md:top-24 flex md:flex-col items-baseline md:items-start gap-3 md:gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-[#FAFAFA]">
                      {entry.version}
                    </span>
                    {entry.isLatest && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.07] text-zinc-300 border border-white/[0.1]">
                        Latest
                      </span>
                    )}
                  </div>
                  <time className="text-xs text-zinc-500">
                    {formatReleaseDate(entry.date)}
                  </time>
                </div>

                {/* Right Column: Release Details */}
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[#FAFAFA]">
                    {entry.title}
                  </h2>

                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {entry.summary}
                  </p>

                  {entry.highlights && entry.highlights.length > 0 && (
                    <ul className="pt-1 space-y-2">
                      {entry.highlights.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-sm text-zinc-300 leading-relaxed"
                        >
                          <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-6 px-6 text-xs text-zinc-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-semibold text-[#FAFAFA] tracking-tight">
            Patch<span className="text-zinc-500">plan</span>
          </span>
          <div className="flex items-center gap-4">
            <Link href="/status" className="hover:text-white transition-colors">
              Status
            </Link>
            <span className="text-zinc-700">·</span>
            <Link href="/" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <span className="text-zinc-700">·</span>
            <span suppressHydrationWarning>
              &copy; {currentYear} PatchPlan. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
