"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, doc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  Newspaper,
  Plus,
  Trash,
  ShareNetwork,
  SlidersHorizontal,
  MagnifyingGlass,
  Rows,
  SquaresFour,
  DotsThree,
  Copy,
  ArrowSquareOut,
  PencilSimple,
  ImageSquare,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { Login } from "@/components/auth/LazyLogin";
import { NewsSettingsModal } from "@/components/ui/NewsSettingsModal";
import { ShareModal } from "@/components/ui/ShareModal";
import { useRouter } from "next/navigation";
import { readingStats } from "@/lib/newsTheme";
import { PageLoader } from "@/components/ui/PageLoader";

type Article = {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  coverImage?: string;
  category?: string;
  authorName?: string;
  authorRole?: string;
  socialX?: string;
  socialLabel?: string;
  familyId: string | null;
  userId: string;
  status: "draft" | "published";
  createdAt: any;
  updatedAt?: any;
  publishedAt?: any;
};

type Tab = "all" | "published" | "draft";

const toMs = (ts: any): number => (ts?.toMillis ? ts.toMillis() : typeof ts === "number" ? ts : 0);

function relativeTime(ms: number) {
  if (!ms) return "just now";
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusPill({ status }: { status: Article["status"] }) {
  const published = status === "published";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
        published ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/[0.04] text-zinc-400 border-white/10"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${published ? "bg-emerald-400" : "bg-zinc-500"}`} />
      {published ? "Published" : "Draft"}
    </span>
  );
}

function Thumb({ src, className = "" }: { src?: string; className?: string }) {
  return (
    <div className={`bg-white/[0.03] border border-white/10 overflow-hidden flex items-center justify-center shrink-0 ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <ImageSquare size={18} weight="duotone" className="text-zinc-600" />
      )}
    </div>
  );
}

export default function NewsPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeFamily, loading: familyLoading } = useFamily();
  const router = useRouter();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"rows" | "grid">("rows");

  const [isSharing, setIsSharing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Article | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Persist the dashboard view preference locally
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("pp-news-view") : null;
    if (saved === "grid" || saved === "rows") setView(saved);
  }, []);
  const changeView = (v: "rows" | "grid") => {
    setView(v);
    localStorage.setItem("pp-news-view", v);
  };

  useEffect(() => {
    if (!user) return;
    const scopeId = activeFamily ? activeFamily.id : user.uid;

    const q = activeFamily
      ? query(collection(db, "articles"), where("familyId", "==", scopeId))
      : query(collection(db, "articles"), where("userId", "==", scopeId));

    const unsub = onSnapshot(
      q,
      snapshot => {
        let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Article[];
        if (!activeFamily) data = data.filter(i => !i.familyId);
        data.sort((a, b) => (toMs(b.updatedAt) || toMs(b.createdAt)) - (toMs(a.updatedAt) || toMs(a.createdAt)));
        setArticles(data);
        setLoading(false);
      },
      err => {
        console.warn("News articles listener:", err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, activeFamily]);

  // Close the row action menu on outside click
  useEffect(() => {
    if (!menuFor) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuFor(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuFor]);

  const counts = useMemo(
    () => ({
      all: articles.length,
      published: articles.filter(a => a.status === "published").length,
      draft: articles.filter(a => a.status !== "published").length,
    }),
    [articles]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter(a => {
      if (tab === "published" && a.status !== "published") return false;
      if (tab === "draft" && a.status === "published") return false;
      if (!q) return true;
      return (
        (a.title || "").toLowerCase().includes(q) ||
        (a.excerpt || "").toLowerCase().includes(q) ||
        (a.category || "").toLowerCase().includes(q) ||
        (a.authorName || "").toLowerCase().includes(q)
      );
    });
  }, [articles, tab, search]);

  if (authLoading || familyLoading || (loading && user)) {
    return <PageLoader label="Loading news" />;
  }
  if (!user) return <Login />;

  const scopeId = activeFamily ? activeFamily.id : user.uid;

  const createArticle = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const ref = await addDoc(collection(db, "articles"), {
        userId: user.uid,
        familyId: activeFamily ? activeFamily.id : null,
        title: "",
        excerpt: "",
        content: "",
        coverImage: "",
        category: "Devlog",
        authorName: user.displayName || "",
        authorRole: "",
        status: "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.push(`/news/${ref.id}`);
    } finally {
      setCreating(false);
    }
  };

  const duplicateArticle = async (a: Article) => {
    setMenuFor(null);
    const { id, createdAt, updatedAt, publishedAt, ...rest } = a;
    await addDoc(collection(db, "articles"), {
      ...rest,
      title: a.title ? `${a.title} (copy)` : "",
      status: "draft",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const toggleStatus = async (a: Article) => {
    setMenuFor(null);
    const publishing = a.status !== "published";
    await updateDoc(doc(db, "articles", a.id), {
      status: publishing ? "published" : "draft",
      updatedAt: serverTimestamp(),
      ...(publishing && !a.publishedAt ? { publishedAt: serverTimestamp() } : {}),
    });
  };

  const performDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setConfirmDelete(null);
    setArticles(prev => prev.filter(a => a.id !== id));
    await deleteDoc(doc(db, "articles", id));
  };

  const publicArticleUrl = (id: string) => `/p/article/${id}`;

  const ActionMenu = ({ a }: { a: Article }) => (
    <div className="relative" ref={menuFor === a.id ? menuRef : undefined}>
      <button
        onClick={e => {
          e.stopPropagation();
          setMenuFor(menuFor === a.id ? null : a.id);
        }}
        className={`p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors ${menuFor === a.id ? "bg-white/10 text-white" : ""}`}
        title="More actions"
      >
        <DotsThree size={18} weight="bold" />
      </button>
      {menuFor === a.id && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 w-44 z-30 rounded-lg border border-white/10 bg-[#111] shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
        >
          <MenuItem icon={PencilSimple} label="Edit" onClick={() => router.push(`/news/${a.id}`)} />
          {a.status === "published" && (
            <MenuItem icon={ArrowSquareOut} label="View live" onClick={() => window.open(publicArticleUrl(a.id), "_blank")} />
          )}
          <MenuItem icon={a.status === "published" ? EyeSlash : Eye} label={a.status === "published" ? "Unpublish" : "Publish"} onClick={() => toggleStatus(a)} />
          <MenuItem icon={Copy} label="Duplicate" onClick={() => duplicateArticle(a)} />
          <div className="h-px bg-white/10 my-1" />
          <MenuItem
            icon={Trash}
            label="Delete"
            danger
            onClick={() => {
              setMenuFor(null);
              setConfirmDelete(a);
            }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6 animate-in fade-in">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">News</h1>
          <p className="text-sm text-zinc-500 mt-1">Write devlogs, patch notes and announcements for your players.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 transition-colors"
          >
            <SlidersHorizontal size={14} weight="bold" />
            Page settings
          </button>
          <button
            onClick={() => setIsSharing(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 transition-colors"
          >
            <ShareNetwork size={14} weight="bold" />
            Share
          </button>
          <button
            onClick={createArticle}
            disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#FAFAFA] text-black hover:bg-white transition-colors disabled:opacity-60 active:scale-[0.98]"
          >
            <Plus size={14} weight="bold" />
            {creating ? "Creating…" : "New article"}
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10">
        <nav className="flex items-center gap-5 -mb-px">
          {(["all", "published", "draft"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === t ? "border-[#FAFAFA] text-[#FAFAFA]" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t === "all" ? "All" : t === "published" ? "Published" : "Drafts"}
              <span className="text-[11px] text-zinc-500 tabular-nums">{counts[t]}</span>
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2 pb-3">
          <div className="relative">
            <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search articles"
              className="w-56 bg-white/[0.03] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>
          <div className="flex items-center p-0.5 rounded-lg border border-white/10 bg-white/[0.02]">
            <button
              onClick={() => changeView("rows")}
              className={`p-1.5 rounded-md transition-colors ${view === "rows" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              title="List view"
            >
              <Rows size={14} weight="bold" />
            </button>
            <button
              onClick={() => changeView("grid")}
              className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              title="Grid view"
            >
              <SquaresFour size={14} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {visible.length === 0 && (
        <div className="py-24 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center mb-4">
            <Newspaper size={22} weight="duotone" className="text-zinc-400" />
          </div>
          <h3 className="text-sm font-semibold text-[#FAFAFA]">
            {articles.length === 0 ? "No articles yet" : search ? "No matching articles" : tab === "published" ? "Nothing published yet" : "No drafts"}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs">
            {articles.length === 0
              ? "Your first devlog or patch note is one click away. Drafts stay private until you publish."
              : "Try a different search or switch tabs."}
          </p>
          {articles.length === 0 && (
            <button
              onClick={createArticle}
              className="mt-5 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#FAFAFA] text-black hover:bg-white transition-colors"
            >
              <Plus size={14} weight="bold" /> Write your first article
            </button>
          )}
        </div>
      )}

      {/* Rows view */}
      {visible.length > 0 && view === "rows" && (
        <div className="divide-y divide-white/[0.06]">
          {visible.map(a => {
            const { minutes } = readingStats(a.content);
            const updated = toMs(a.updatedAt) || toMs(a.createdAt);
            return (
              <div
                key={a.id}
                onClick={() => router.push(`/news/${a.id}`)}
                className="group flex items-center gap-4 py-3.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.025] cursor-pointer transition-colors"
              >
                <Thumb src={a.coverImage} className="w-24 aspect-video rounded-md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-medium truncate ${a.title ? "text-[#FAFAFA]" : "text-zinc-500 italic"}`}>{a.title || "Untitled article"}</h3>
                  </div>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">{a.excerpt || "No summary yet"}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 mt-1.5">
                    {a.category && <span className="text-zinc-400">{a.category}</span>}
                    {a.category && <span>·</span>}
                    {a.authorName && <span>{a.authorName}</span>}
                    {a.authorName && <span>·</span>}
                    <span>{minutes} min read</span>
                    <span>·</span>
                    <span>Edited {relativeTime(updated)}</span>
                  </div>
                </div>
                <StatusPill status={a.status} />
                <div className="w-8 flex justify-end">
                  <ActionMenu a={a} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid view */}
      {visible.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map(a => {
            const updated = toMs(a.updatedAt) || toMs(a.createdAt);
            return (
              <div
                key={a.id}
                onClick={() => router.push(`/news/${a.id}`)}
                className="group rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.035] cursor-pointer transition-all overflow-hidden flex flex-col"
              >
                <div className="relative">
                  <Thumb src={a.coverImage} className="w-full aspect-video border-0 border-b rounded-none" />
                  <div className="absolute top-2.5 left-2.5">
                    <StatusPill status={a.status} />
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  {a.category && <span className="text-[11px] text-zinc-500 mb-1.5">{a.category}</span>}
                  <h3 className={`text-sm font-medium line-clamp-2 ${a.title ? "text-[#FAFAFA]" : "text-zinc-500 italic"}`}>{a.title || "Untitled article"}</h3>
                  <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{a.excerpt || "No summary yet"}</p>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-600">Edited {relativeTime(updated)}</span>
                    <ActionMenu a={a} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-sm rounded-xl border border-white/10 bg-[#0d0d0d] p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-semibold text-[#FAFAFA]">Delete article?</h3>
            <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
              <span className="text-zinc-300">{confirmDelete.title || "Untitled article"}</span> will be permanently removed
              {confirmDelete.status === "published" ? " and taken off your public news page" : ""}. This can&apos;t be undone.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmDelete(null)} className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={performDelete} className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-500/90 hover:bg-red-500 text-white transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <NewsSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} scopeId={scopeId} />
      <ShareModal isOpen={isSharing} onClose={() => setIsSharing(false)} scopeId={scopeId} sharePath="/p/news" title="Share press page" />
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${
        danger ? "text-red-400 hover:bg-red-500/10" : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
      }`}
    >
      <Icon size={14} weight="regular" />
      {label}
    </button>
  );
}
