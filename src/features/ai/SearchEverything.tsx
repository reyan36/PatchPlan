"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { MagnifyingGlass, Kanban, FileText, Newspaper, Compass, AddressBook, Megaphone, Sparkle } from "@phosphor-icons/react";
import { aiFetch, loadSearchCorpus } from "@/lib/ai/client";
import type { SearchDoc, SearchDocType, SearchResult } from "@/lib/ai/types";
import { Button, ErrorNote, Panel } from "./ui";

const TYPE_META: Record<SearchDocType, { label: string; icon: typeof Kanban }> = {
  task: { label: "Task", icon: Kanban },
  doc: { label: "Design doc", icon: FileText },
  devlog: { label: "News", icon: Newspaper },
  roadmap: { label: "Roadmap", icon: Compass },
  contact: { label: "Contact", icon: AddressBook },
  signal: { label: "Player signal", icon: Megaphone },
};

const EXAMPLES = ["What's left before the boss fight is done?", "Which streamers cover roguelikes?", "Did we already write about the parry changes?"];

export function SearchEverything({ user, familyId, enabled, initialQuery = "" }: { user: User; familyId: string | null; enabled: boolean; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const autoRan = useRef(false);
  const [corpus, setCorpus] = useState<SearchDoc[] | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCorpus(null);
    loadSearchCorpus(user, familyId).then(setCorpus).catch(() => setCorpus([]));
    inputRef.current?.focus();
  }, [user, familyId]);

  // Questions asked from the dashboard run as soon as the workspace is indexed.
  useEffect(() => {
    if (initialQuery && corpus && enabled && !autoRan.current) {
      autoRan.current = true;
      run(initialQuery);
    }
  }, [corpus, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (question = q) => {
    if (!question.trim()) return;
    setQ(question);
    setError(null);
    setLoading(true);
    try {
      const docs = corpus ?? (await loadSearchCorpus(user, familyId));
      setResult(await aiFetch<SearchResult>("search", { query: question, docs }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="relative"
      >
        <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask anything about your studio…"
          className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-28 py-3.5 text-[15px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
        />
        <Button type="submit" loading={loading} disabled={!enabled || !q.trim()} className="absolute right-2 top-1/2 -translate-y-1/2">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span>{corpus ? `${corpus.length} items indexed` : "Indexing workspace…"}</span>
        {!result &&
          EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => run(ex)} disabled={!enabled} className="px-2.5 py-1 rounded-full border border-white/10 hover:border-white/25 hover:text-zinc-300 disabled:opacity-40">
              {ex}
            </button>
          ))}
      </div>

      <ErrorNote message={error} />

      {result && (
        <div className="space-y-3">
          {result.answer && (
            <Panel className="p-4 flex gap-3">
              <Sparkle size={16} weight="fill" className="text-[#c8ff00] shrink-0 mt-0.5" />
              <p className="text-sm text-zinc-200 leading-relaxed">{result.answer}</p>
            </Panel>
          )}
          {result.hits.length === 0 ? (
            <p className="text-sm text-zinc-600 px-1">No matching items.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/10 overflow-hidden">
              {result.hits.map((h) => {
                const meta = TYPE_META[h.type];
                return (
                  <li key={`${h.type}-${h.id}`}>
                    <Link href={h.href} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                      <meta.icon size={16} weight="duotone" className="text-zinc-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white truncate">{h.title}</span>
                          <span className="text-[10px] uppercase tracking-wide text-zinc-600 shrink-0">{meta.label}</span>
                        </div>
                        {h.reason && <p className="text-xs text-zinc-500 mt-0.5">{h.reason}</p>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
