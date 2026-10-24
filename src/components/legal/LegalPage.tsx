import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/ui/Logo";

export const LEGAL = {
  contact: "privacy@patchplan.net",
  updated: "October 24, 2026",
};

/** Shared layout for /privacy and /terms: same header as the status page, a summary and a contents list. */
export function LegalPage({
  title,
  crumb,
  summary,
  sections,
  children,
}: {
  title: string;
  crumb: string;
  summary: ReactNode;
  sections: { id: string; title: string }[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#121212] text-[#FAFAFA]">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#121212]/85 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center group-hover:bg-white/[0.12] transition-colors">
              <Logo size={15} />
            </div>
            <span className="font-semibold text-sm tracking-tight">patchplan</span>
            <span className="text-zinc-600">/</span>
            <span className="text-sm text-zinc-400">{crumb}</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg bg-white text-black text-xs font-semibold px-3 py-1.5 hover:bg-zinc-200 transition-colors">
            Open PatchPlan <ArrowRight size={12} weight="bold" />
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-5 sm:px-6 pt-10 sm:pt-14 pb-24">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-zinc-500 mt-2">Last updated {LEGAL.updated}</p>

        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c8ff00] mb-3">The short version</p>
          <div className="text-sm text-zinc-300 leading-relaxed [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">{summary}</div>
        </div>

        <nav aria-label="Contents" className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-3">Contents</p>
          <ol className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm list-decimal pl-5 marker:text-zinc-600">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-zinc-400 hover:text-white transition-colors">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div
          className="mt-12 space-y-12 text-[15px] leading-7 text-zinc-400
            [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-4 [&_h2]:scroll-mt-24
            [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-zinc-200 [&_h3]:mt-6 [&_h3]:mb-2
            [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mt-3 [&_li]:mt-1.5 [&_strong]:text-zinc-200 [&_strong]:font-medium
            [&_a]:text-[#d9ff4d] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-white
            [&_table]:w-full [&_table]:mt-4 [&_table]:text-sm [&_th]:text-left [&_th]:text-zinc-300 [&_th]:font-medium [&_th]:py-2 [&_th]:pr-4 [&_th]:border-b [&_th]:border-white/10
            [&_td]:py-2.5 [&_td]:pr-4 [&_td]:align-top [&_td]:border-b [&_td]:border-white/[0.05]"
        >
          {children}
        </div>
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
          <span>&copy; {new Date().getFullYear()} PatchPlan</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/status" className="hover:text-white transition-colors">
              Status
            </Link>
            <a href={`mailto:${LEGAL.contact}`} className="hover:text-white transition-colors">
              {LEGAL.contact}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
