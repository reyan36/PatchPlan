"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { ArrowLeft, ShareNetwork, Check, ArrowUpRight } from "@phosphor-icons/react";
import { themeVars, resolveTheme, normalizeUrl, readingStats, formatDate } from "@/lib/newsTheme";

type ArticleData = {
  id: string;
  title: string;
  excerpt: string;
  coverImage: string;
  content: string;
  category: string;
  familyId: string;
  authorName: string;
  authorRole: string;
  socialX: string;
  socialLabel?: string;
  date: number;
};

type State = { kind: "loading" } | { kind: "missing" } | { kind: "expired" } | { kind: "ok"; article: ArticleData };

export default function PublicArticlePage({ params }: { params: { articleId: string } }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [config, setConfig] = useState<any>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "articles", params.articleId));
        if (!snap.exists() || snap.data().status !== "published") {
          setState({ kind: "missing" });
          return;
        }
        const data = snap.data();
        const famId = data.familyId || data.userId;

        const configDoc = await getDoc(doc(db, "public_configs", famId)).catch(() => null);
        if (configDoc && configDoc.exists()) {
          const c = configDoc.data();
          setConfig(c);
          if (c.newsExpiresAt !== undefined && c.newsExpiresAt !== -1 && c.newsExpiresAt > 0 && Date.now() > c.newsExpiresAt) {
            setState({ kind: "expired" });
            return;
          }
        }

        setState({
          kind: "ok",
          article: {
            id: snap.id,
            title: data.title || "Untitled",
            excerpt: data.excerpt || "",
            coverImage: data.coverImage || "",
            content: data.content || "",
            category: data.category || "",
            familyId: famId,
            authorName: data.authorName || "",
            authorRole: data.authorRole || "",
            socialX: data.socialX || "",
            socialLabel: data.socialLabel,
            date: data.publishedAt?.toMillis?.() || data.createdAt?.toMillis?.() || Date.now(),
          },
        });
        document.title = data.title || "Article";
      } catch (err) {
        console.error(err);
        setState({ kind: "missing" });
      }
    })();
  }, [params.articleId]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({ url, title: document.title });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resolvedThemeKey = config.newsTheme || config.theme;
  const theme = resolveTheme(resolvedThemeKey);
  const vars = themeVars(resolvedThemeKey, config.newsAccent);
  const tpl: string = config.newsTemplate || "standard";
  const studio: string = config.newsStudioName || config.studioName || config.roadmapStudioName || "";
  const logoUrl: string = config.newsLogoUrl || config.logoUrl || "";

  const shell = (children: React.ReactNode) => (
    <div style={vars} className="min-h-screen bg-[var(--pp-bg)] text-[var(--pp-fg)] antialiased">{children}</div>
  );

  if (state.kind === "loading") {
    return shell(
      <div className="max-w-[720px] mx-auto px-6 pt-32 space-y-5 animate-pulse">
        <div className="h-3 w-40 rounded bg-[var(--pp-surface)]" />
        <div className="h-10 w-full rounded bg-[var(--pp-surface)]" />
        <div className="h-10 w-2/3 rounded bg-[var(--pp-surface)]" />
        <div className="h-72 w-full rounded-2xl bg-[var(--pp-surface)] mt-10" />
      </div>
    );
  }

  if (state.kind !== "ok") {
    return shell(
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">{state.kind === "expired" ? "This link has expired" : "Article not found"}</h1>
        <p className="text-sm text-[var(--pp-muted)]">
          {state.kind === "expired" ? "Ask the studio for an updated news link." : "It may have been unpublished or deleted."}
        </p>
      </div>
    );
  }

  const article = state.article;
  const { minutes } = readingStats(article.content);
  const hubHref = `/p/news/${config.newsSlug || article.familyId}`;
  const studioName = studio || article.authorName || "Studio";
  const initial = (article.authorName || studioName)[0]?.toUpperCase() || "S";

  const titleFont = tpl === "editorial" ? "font-serif font-normal" : tpl === "gaming" ? "font-extrabold uppercase tracking-wide" : "font-semibold tracking-tight";

  // Map Tailwind Typography's color tokens onto the page theme so prose works for light and dark themes alike
  const proseVars = {
    ["--tw-prose-body" as any]: `color-mix(in srgb, ${theme.fg} 80%, transparent)`,
    ["--tw-prose-headings" as any]: "var(--pp-fg)",
    ["--tw-prose-lead" as any]: "var(--pp-muted)",
    ["--tw-prose-links" as any]: "var(--pp-accent)",
    ["--tw-prose-bold" as any]: "var(--pp-fg)",
    ["--tw-prose-counters" as any]: "var(--pp-muted)",
    ["--tw-prose-bullets" as any]: "var(--pp-muted)",
    ["--tw-prose-hr" as any]: "var(--pp-border)",
    ["--tw-prose-quotes" as any]: "var(--pp-fg)",
    ["--tw-prose-quote-borders" as any]: "var(--pp-accent)",
    ["--tw-prose-captions" as any]: "var(--pp-muted)",
    ["--tw-prose-code" as any]: "var(--pp-fg)",
    ["--tw-prose-pre-code" as any]: "var(--pp-fg)",
    ["--tw-prose-pre-bg" as any]: "var(--pp-surface)",
    ["--tw-prose-th-borders" as any]: "var(--pp-border)",
    ["--tw-prose-td-borders" as any]: "var(--pp-border)",
  };

  return shell(
    <>
      {/* Nav */}
      <nav className="sticky top-0 z-20 border-b border-[var(--pp-border)] backdrop-blur-md" style={{ background: `color-mix(in srgb, ${theme.bg} 85%, transparent)` }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href={hubHref} className="flex items-center gap-2 text-sm text-[var(--pp-muted)] hover:text-[var(--pp-fg)] transition-colors">
            <ArrowLeft size={15} weight="bold" /> All updates
          </Link>
          <Link href={hubHref} className="flex items-center gap-2 font-semibold tracking-tight">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-7 w-7 object-contain rounded-md" />
            ) : null}
            <span className="hidden sm:inline">{studioName}</span>
          </Link>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm border border-[var(--pp-border)] text-[var(--pp-fg)] hover:bg-[var(--pp-surface)] transition-colors"
          >
            {copied ? <Check size={14} weight="bold" className="text-[var(--pp-accent)]" /> : <ShareNetwork size={14} />}
            {copied ? "Copied" : "Share"}
          </button>
        </div>
      </nav>

      <article>
        {/* Header */}
        <header className="max-w-[720px] mx-auto px-6 pt-16 md:pt-24">
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-[var(--pp-muted)] mb-5">
            {article.category && <span className="font-medium text-[var(--pp-accent)]">{article.category}</span>}
            {article.category && <span className="opacity-50">·</span>}
            <time>{formatDate(article.date)}</time>
            <span className="opacity-50">·</span>
            <span>{minutes} min read</span>
          </div>
          <h1 className={`text-4xl md:text-[3.25rem] leading-[1.1] ${titleFont}`}>{article.title}</h1>
          {article.excerpt && <p className="mt-5 text-xl leading-relaxed text-[var(--pp-muted)]">{article.excerpt}</p>}

          <div className="mt-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-[var(--pp-surface)] border border-[var(--pp-border)]">{initial}</div>
            <div className="leading-tight">
              <div className="text-sm font-medium">{article.authorName || studioName}</div>
              {article.authorRole && <div className="text-xs text-[var(--pp-muted)] mt-0.5">{article.authorRole}</div>}
            </div>
          </div>
        </header>

        {/* Cover */}
        {article.coverImage && (
          <div className="max-w-[1040px] mx-auto px-6 mt-12">
            <div className="relative aspect-[16/8] rounded-2xl overflow-hidden border border-[var(--pp-border)] bg-[var(--pp-surface)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.coverImage} alt={article.title} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="max-w-[720px] mx-auto px-6 mt-12 md:mt-16">
          <div
            style={proseVars}
            className={`prose prose-lg max-w-none prose-headings:tracking-tight prose-headings:font-semibold prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-pre:border prose-pre:border-[var(--pp-border)] prose-code:before:content-none prose-code:after:content-none prose-blockquote:font-normal prose-blockquote:not-italic ${tpl === "editorial" ? "prose-headings:font-serif prose-headings:font-normal" : ""}`}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>

        {/* Author card */}
        <footer className="max-w-[720px] mx-auto px-6 mt-20 mb-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 rounded-2xl border border-[var(--pp-border)] bg-[var(--pp-surface)]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold border border-[var(--pp-border)] bg-[var(--pp-bg)]">{initial}</div>
              <div className="leading-tight">
                <div className="text-xs text-[var(--pp-muted)] mb-1">Written by</div>
                <div className="font-medium">{article.authorName || studioName}</div>
                {article.authorRole && <div className="text-sm text-[var(--pp-muted)] mt-0.5">{article.authorRole}</div>}
              </div>
            </div>
            {article.socialX && (
              <a
                href={normalizeUrl(article.socialX)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-[var(--pp-border)] hover:border-[var(--pp-accent)] hover:text-[var(--pp-accent)] transition-colors self-start sm:self-auto"
              >
                {article.socialLabel || "Follow"} <ArrowUpRight size={14} weight="bold" />
              </a>
            )}
          </div>

          <div className="mt-10 text-center">
            <Link href={hubHref} className="inline-flex items-center gap-1.5 text-sm text-[var(--pp-muted)] hover:text-[var(--pp-fg)] transition-colors">
              <ArrowLeft size={14} weight="bold" /> More updates from {studioName}
            </Link>
          </div>
        </footer>
      </article>

      <div className="border-t border-[var(--pp-border)]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--pp-muted)]">
          <span suppressHydrationWarning>&copy; {new Date().getFullYear()} {studioName}</span>
          <span>
            Powered by <span className="font-medium text-[var(--pp-fg)]">PatchPlan</span>
          </span>
        </div>
      </div>
    </>
  );
}
