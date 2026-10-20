import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { MagnifyingGlass, DiscordLogo, XLogo, Globe, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { cache } from "react";
import { SubscribeForm } from "@/components/email/SubscribeForm";
import { themeVars, resolveTheme, normalizeUrl, readingStats, formatDate } from "@/lib/newsTheme";

// Always serve fresh data when articles or settings are updated
export const dynamic = "force-dynamic";

type Article = {
  id: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  authorName: string;
  minutes: number;
  date: number;
};

type ConfigData = {
  layout: string;
  template: string;
  theme: string;
  accent: string;
  websiteUrl: string;
  discordUrl: string;
  xUrl: string;
  newsHeading: string;
  description: string;
  logoUrl: string;
};

const getNewsData = cache(async (slug: string) => {
  let familyId = slug;
  try {
    const configSnap = await getDocs(query(collection(db, "public_configs"), where("newsSlug", "==", slug)));
    if (!configSnap.empty) familyId = configSnap.docs[0].id;
  } catch (e) {}

  let familyName = "Studio";
  let expired = false;
  let articles: Article[] = [];
  const config: ConfigData = {
    layout: "grid",
    template: "standard",
    theme: "dark",
    accent: "",
    websiteUrl: "",
    discordUrl: "",
    xUrl: "",
    newsHeading: "",
    description: "",
    logoUrl: "",
  };

  try {
    // Only query public-accessible collections; isolate each promise so one failure never breaks the page
    const [configDoc, snapFam, snapUser] = await Promise.all([
      getDoc(doc(db, "public_configs", familyId)).catch(() => null),
      getDocs(query(collection(db, "articles"), where("familyId", "==", familyId), where("status", "==", "published"))).catch(() => null),
      getDocs(query(collection(db, "articles"), where("userId", "==", familyId), where("status", "==", "published"))).catch(() => null),
    ]);

    if (configDoc && configDoc.exists()) {
      const d = configDoc.data();
      if (d.newsLayout) config.layout = d.newsLayout;
      if (d.newsTemplate) config.template = d.newsTemplate;
      if (d.newsTheme || d.theme) config.theme = d.newsTheme || d.theme;
      if (d.newsAccent) config.accent = d.newsAccent;
      if (d.newsWebsiteUrl || d.websiteUrl) config.websiteUrl = d.newsWebsiteUrl || d.websiteUrl;
      if (d.newsDiscordUrl || d.discordUrl) config.discordUrl = d.newsDiscordUrl || d.discordUrl;
      if (d.newsXUrl) config.xUrl = d.newsXUrl;
      if (d.newsHeading) config.newsHeading = d.newsHeading;
      if (d.newsDescription) config.description = d.newsDescription;
      if (d.newsLogoUrl || d.logoUrl) config.logoUrl = d.newsLogoUrl || d.logoUrl;
      if (d.newsStudioName || d.studioName || d.roadmapStudioName) {
        familyName = d.newsStudioName || d.studioName || d.roadmapStudioName;
      }

      const expiresAt = d.newsExpiresAt;
      if (expiresAt !== undefined && expiresAt !== -1 && expiresAt > 0 && Date.now() > expiresAt) {
        expired = true;
      }
    }

    if (!expired) {
      const famDocs = snapFam && !snapFam.empty ? snapFam.docs : [];
      const userDocs = snapUser && !snapUser.empty ? snapUser.docs : [];
      // Merge both familyId and userId matches (deduplicated by id)
      const seen = new Set<string>();
      const allDocs = [...famDocs, ...userDocs].filter(d => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      });
      articles = allDocs
        .map(d => {
          const a = d.data();
          return {
            id: d.id,
            title: a.title || "Untitled",
            excerpt: a.excerpt || "",
            coverImage: a.coverImage || "",
            category: a.category || "",
            authorName: a.authorName || "",
            minutes: readingStats(a.content).minutes,
            date: a.publishedAt?.toMillis?.() || a.createdAt?.toMillis?.() || Date.now(),
          };
        })
        .sort((a, b) => b.date - a.date);

      if (familyName === "Studio" && articles[0]?.authorName) {
        familyName = articles[0].authorName;
      }
    }
  } catch (err) {
    console.error(err);
  }

  return { familyName, articles, config, expired };
});

export async function generateMetadata({ params }: { params: { familyId: string } }): Promise<Metadata> {
  const { familyName, config } = await getNewsData(params.familyId);
  return {
    title: config.newsHeading || `${familyName} News`,
    description: config.description || `Devlogs, patch notes and announcements from ${familyName}.`,
  };
}

function titleClass(template: string) {
  if (template === "gaming") return "font-extrabold uppercase tracking-wide group-hover:text-[var(--pp-accent)]";
  if (template === "editorial") return "font-serif font-normal tracking-tight group-hover:underline decoration-1 underline-offset-[6px]";
  return "font-semibold tracking-tight group-hover:opacity-80";
}

function Cover({ src, alt, initial, className = "" }: { src: string; alt: string; initial: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-[var(--pp-border)] bg-[var(--pp-surface)] ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-4xl font-semibold opacity-40"
          style={{ background: "radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--pp-accent) 25%, transparent), transparent 60%)" }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}

function Meta({ a, showAuthor = false }: { a: Article; showAuthor?: boolean }) {
  return (
    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-[var(--pp-muted)]">
      {a.category && <span className="font-medium text-[var(--pp-accent)]">{a.category}</span>}
      {a.category && <span className="opacity-50">·</span>}
      <time>{formatDate(a.date)}</time>
      <span className="opacity-50">·</span>
      <span>{a.minutes} min read</span>
      {showAuthor && a.authorName && (
        <>
          <span className="opacity-50">·</span>
          <span>{a.authorName}</span>
        </>
      )}
    </div>
  );
}

export default async function PublicNewsPage({ params, searchParams }: { params: { familyId: string }; searchParams?: { q?: string; c?: string } }) {
  const { familyName, articles, config, expired } = await getNewsData(params.familyId);
  const theme = resolveTheme(config.theme);
  const vars = themeVars(config.theme, config.accent);
  const base = `/p/news/${params.familyId}`;

  if (expired) {
    return (
      <div style={vars} className="min-h-screen flex flex-col items-center justify-center bg-[var(--pp-bg)] text-[var(--pp-fg)] px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">This link has expired</h1>
        <p className="text-sm text-[var(--pp-muted)]">Ask the studio for an updated news link.</p>
      </div>
    );
  }

  const q = (searchParams?.q || "").toLowerCase();
  const activeCategory = searchParams?.c || "";
  const categories = Array.from(new Set(articles.map(a => a.category).filter(Boolean)));

  const filtered = articles.filter(a => {
    if (activeCategory && a.category !== activeCategory) return false;
    if (!q) return true;
    return a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q);
  });

  const initial = (familyName[0] || "S").toUpperCase();
  const heading = config.newsHeading || `${familyName} News`;
  const tpl = config.template;
  const headingFont = tpl === "editorial" ? "font-serif font-normal" : tpl === "gaming" ? "font-extrabold uppercase tracking-wide" : "font-semibold tracking-tight";

  const hrefWith = (params: { q?: string; c?: string }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.c) sp.set("c", params.c);
    const s = sp.toString();
    return s ? `${base}?${s}` : base;
  };

  const GridCard = ({ a }: { a: Article }) => (
    <Link href={`/p/article/${a.id}`} className="group flex flex-col gap-4 outline-none">
      <Cover src={a.coverImage} alt={a.title} initial={initial} className="aspect-[16/10]" />
      <div className="space-y-2">
        <Meta a={a} />
        <h2 className={`text-xl leading-snug transition-colors ${titleClass(tpl)}`}>{a.title}</h2>
        {a.excerpt && <p className="text-sm leading-relaxed text-[var(--pp-muted)] line-clamp-2">{a.excerpt}</p>}
      </div>
    </Link>
  );

  const ListRow = ({ a }: { a: Article }) => (
    <Link href={`/p/article/${a.id}`} className="group flex flex-col sm:flex-row gap-5 sm:gap-8 py-8 border-b border-[var(--pp-border)] outline-none first:pt-0">
      <Cover src={a.coverImage} alt={a.title} initial={initial} className="w-full sm:w-64 aspect-[16/10] shrink-0" />
      <div className="flex-1 flex flex-col justify-center space-y-2.5">
        <Meta a={a} showAuthor />
        <h2 className={`text-2xl leading-snug transition-colors ${titleClass(tpl)}`}>{a.title}</h2>
        {a.excerpt && <p className="text-[15px] leading-relaxed text-[var(--pp-muted)] line-clamp-2">{a.excerpt}</p>}
      </div>
    </Link>
  );

  const Featured = ({ a }: { a: Article }) => (
    <Link href={`/p/article/${a.id}`} className="group grid md:grid-cols-5 gap-8 items-center outline-none mb-16 pb-16 border-b border-[var(--pp-border)]">
      <Cover src={a.coverImage} alt={a.title} initial={initial} className="md:col-span-3 aspect-[16/10]" />
      <div className="md:col-span-2 space-y-4">
        <Meta a={a} showAuthor />
        <h2 className={`text-3xl md:text-4xl leading-[1.15] transition-colors ${titleClass(tpl)}`}>{a.title}</h2>
        {a.excerpt && <p className="text-base leading-relaxed text-[var(--pp-muted)] line-clamp-4">{a.excerpt}</p>}
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--pp-accent)]">
          Read article <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );

  const layout = config.layout;
  const showFeatured = layout === "featured" && filtered.length > 0 && !q && !activeCategory;
  const rest = showFeatured ? filtered.slice(1) : filtered;

  return (
    <div style={vars} className="min-h-screen flex flex-col bg-[var(--pp-bg)] text-[var(--pp-fg)] antialiased">
      {/* Nav */}
      <nav className="sticky top-0 z-20 border-b border-[var(--pp-border)] backdrop-blur-md" style={{ background: `color-mix(in srgb, ${theme.bg} 85%, transparent)` }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href={base} className="flex items-center gap-2.5 font-semibold tracking-tight">
            {config.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logoUrl} alt="" className="h-7 w-7 object-contain rounded-md" />
            ) : (
              <span className="h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold bg-[var(--pp-surface)] border border-[var(--pp-border)]">{initial}</span>
            )}
            <span>{familyName}</span>
          </Link>
          <div className="flex items-center gap-1">
            {config.websiteUrl && (
              <a href={normalizeUrl(config.websiteUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-[var(--pp-muted)] hover:text-[var(--pp-fg)] transition-colors">
                <Globe size={15} /> <span className="hidden sm:inline">Website</span>
              </a>
            )}
            {config.discordUrl && (
              <a href={normalizeUrl(config.discordUrl)} target="_blank" rel="noreferrer" className="p-2 rounded-full text-[var(--pp-muted)] hover:text-[var(--pp-fg)] transition-colors" aria-label="Discord">
                <DiscordLogo size={17} />
              </a>
            )}
            {config.xUrl && (
              <a href={normalizeUrl(config.xUrl)} target="_blank" rel="noreferrer" className="p-2 rounded-full text-[var(--pp-muted)] hover:text-[var(--pp-fg)] transition-colors" aria-label="X">
                <XLogo size={16} />
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-6xl w-full mx-auto px-6 pt-16 md:pt-24 pb-10">
        <h1 className={`text-4xl md:text-6xl leading-[1.05] ${headingFont}`}>{heading}</h1>
        {config.description && <p className="mt-4 text-lg text-[var(--pp-muted)] max-w-2xl leading-relaxed">{config.description}</p>}

        <div className="mt-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.length > 1 && (
              <>
                <Link
                  href={hrefWith({ q: searchParams?.q })}
                  className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${!activeCategory ? "bg-[var(--pp-fg)] text-[var(--pp-bg)] border-transparent" : "border-[var(--pp-border)] text-[var(--pp-muted)] hover:text-[var(--pp-fg)]"}`}
                >
                  All
                </Link>
                {categories.map(c => (
                  <Link
                    key={c}
                    href={hrefWith({ q: searchParams?.q, c })}
                    className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${activeCategory === c ? "bg-[var(--pp-fg)] text-[var(--pp-bg)] border-transparent" : "border-[var(--pp-border)] text-[var(--pp-muted)] hover:text-[var(--pp-fg)]"}`}
                  >
                    {c}
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* Search */}
          <form action={base} className="relative w-full md:w-72">
            {activeCategory && <input type="hidden" name="c" value={activeCategory} />}
            <MagnifyingGlass size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--pp-muted)]" />
            <input
              type="text"
              name="q"
              defaultValue={searchParams?.q || ""}
              placeholder="Search updates"
              className="w-full pl-10 pr-4 py-2 rounded-full text-sm bg-[var(--pp-surface)] border border-[var(--pp-border)] text-[var(--pp-fg)] placeholder:text-[var(--pp-muted)] focus:outline-none focus:border-[var(--pp-accent)] transition-colors"
            />
          </form>
        </div>
      </header>

      {/* Articles */}
      <main className="max-w-6xl w-full mx-auto px-6 pb-24 flex-1">
        {showFeatured && <Featured a={filtered[0]} />}

        {rest.length > 0 && (
          layout === "list" ? (
            <div className="max-w-4xl">
              {rest.map(a => <ListRow key={a.id} a={a} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
              {rest.map(a => <GridCard key={a.id} a={a} />)}
            </div>
          )
        )}

        {filtered.length === 0 && (
          <div className="py-24 text-center">
            <p className="text-base font-medium">{articles.length === 0 ? "No updates yet" : "No matching updates"}</p>
            <p className="text-sm text-[var(--pp-muted)] mt-1">
              {articles.length === 0 ? "Check back soon — the team is working on it." : "Try a different search or category."}
            </p>
            {articles.length > 0 && (
              <Link href={base} className="inline-block mt-5 text-sm text-[var(--pp-accent)] hover:underline underline-offset-4">Clear filters</Link>
            )}
          </div>
        )}
      </main>

      <section className="max-w-6xl w-full mx-auto px-6 pb-16">
        <SubscribeForm scopeId={params.familyId} source="news" studioName={familyName} className="bg-[var(--pp-surface)] max-w-2xl mx-auto" />
      </section>

      <footer className="border-t border-[var(--pp-border)]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--pp-muted)]">
          <span suppressHydrationWarning>&copy; {new Date().getFullYear()} {familyName}</span>
          <span>
            Powered by <span className="font-medium text-[var(--pp-fg)]">PatchPlan</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
