"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { ArrowLeft, ShareNetwork, Check, ArrowSquareOut } from "@phosphor-icons/react";

type ArticleData = {
  id: string;
  title: string;
  excerpt: string;
  coverImage: string;
  content: string;
  familyId: string;
  authorName: string;
  authorRole: string;
  socialX: string;
  socialLabel?: string;
  createdAt: number;
  expired?: boolean;
}

export default function PublicArticlePage({ params }: { params: { articleId: string } }) {
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [config, setConfig] = useState<any>({ theme: 'dark', logoUrl: '' });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const docSnap = await getDoc(doc(db, "articles", params.articleId));
        if (docSnap.exists() && docSnap.data().status === "published") {
          const data = docSnap.data();
          const famId = data.familyId || data.userId;

          const configDoc = await getDoc(doc(db, "public_configs", famId));
          if (configDoc.exists()) {
            const cData = configDoc.data();
            setConfig(cData);
            if (cData.newsExpiresAt !== undefined && cData.newsExpiresAt !== -1 && cData.newsExpiresAt > 0 && Date.now() > cData.newsExpiresAt) {
              setArticle({ expired: true } as any);
              setLoading(false);
              return;
            }
          }

          setArticle({
            id: docSnap.id,
            title: data.title,
            excerpt: data.excerpt,
            coverImage: data.coverImage,
            content: data.content,
            familyId: famId,
            authorName: data.authorName,
            authorRole: data.authorRole,
            socialX: data.socialX,
            socialLabel: data.socialLabel,
            createdAt: data.createdAt?.toMillis() || Date.now()
          } as ArticleData);
          document.title = data.title;
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.articleId]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getThemeClasses = () => {
    switch (config.theme) {
      case 'midnight': return 'bg-[#0a0f1c] text-gray-200';
      case 'cyberpunk': return 'bg-[#000] text-yellow-500';
      case 'minimal': return 'bg-[#fcfcfc] text-gray-900';
      default: return 'bg-[#141414] text-gray-200';
    }
  };

  const getTitleClasses = () => {
    switch (config.theme) {
      case 'minimal': return 'text-black';
      case 'cyberpunk': return 'text-yellow-400';
      default: return 'text-white';
    }
  };

  if (loading) return <div className={`min-h-screen ${getThemeClasses()} flex items-center justify-center`}>Loading...</div>;

  if (article?.expired) {
    return (
      <div className={`min-h-screen ${getThemeClasses()} flex flex-col items-center justify-center`}>
        <h1 className="text-2xl font-bold mb-4">Link Expired</h1>
        <p className="opacity-60">This news link is no longer available.</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className={`min-h-screen ${getThemeClasses()} flex flex-col items-center justify-center`}>
        <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
        <p className="opacity-60">This article may have been unpublished or deleted.</p>
      </div>
    );
  }

  const readingTime = Math.max(1, Math.ceil((article.content?.length || 0) / 1000));

  return (
    <div className={`min-h-screen font-sans selection:bg-red-500/30 ${getThemeClasses()}`}>
      {/* Mini header for navigation back to hub */}
      <header className={`px-6 py-4 flex items-center justify-between border-b ${config.theme === 'minimal' ? 'border-gray-200' : 'border-white/5 bg-black/20'}`}>
         <Link href={`/p/news/${article.familyId}`} className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity font-medium text-sm">
           <ArrowLeft className="w-4 h-4" /> Back to Hub
         </Link>
         {config.logoUrl && (
           <img src={config.logoUrl} alt="Logo" className="h-8 object-contain" />
         )}
      </header>

      <main className="max-w-[900px] mx-auto px-6 py-12 md:py-24">
        
        <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-10 leading-tight ${getTitleClasses()}`}>
          {article.title}
        </h1>
        
        {/* Meta Info */}
        <div className="flex flex-wrap items-center justify-between gap-6 mb-12 text-sm opacity-80 border-y py-6 border-current border-opacity-10">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold ${config.theme === 'minimal' ? 'bg-gray-200 text-gray-700' : 'bg-white/10 text-gray-300'}`}>
               {article.authorName ? article.authorName[0].toUpperCase() : 'S'}
            </div>
            <div className="flex flex-col">
              <span className={`font-bold text-base leading-tight ${getTitleClasses()}`}>
                {article.authorName || 'Studio Developer'}
              </span>
              <span className="text-xs font-medium opacity-70 mb-1">{article.authorRole || 'Developer'}</span>
              <div className="flex items-center gap-2 text-xs opacity-70">
                {article.createdAt && (
                  <time>
                    {new Date(article.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </time>
                )}
                <span>•</span>
                <span>{readingTime} min read</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleShare}
            className={`px-4 py-2 rounded-full border transition-colors font-medium text-sm flex items-center gap-2 ${config.theme === 'minimal' ? 'border-gray-300 hover:bg-gray-100 text-black' : 'border-white/20 hover:bg-white/10 text-white'}`}
          >
            {copied ? <Check className="w-4 h-4 text-green-500" weight="bold" /> : <ShareNetwork className="w-4 h-4" weight="duotone" />}
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>

        {article.coverImage && (
          <div className="w-full aspect-video bg-black/20 mb-16 shadow-2xl rounded-xl overflow-hidden">
            <img 
              src={article.coverImage} 
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {article.excerpt && (
          <p className="text-xl md:text-2xl font-medium leading-relaxed mb-12 border-l-4 pl-6 opacity-80" style={{ borderColor: 'currentColor' }}>
            {article.excerpt}
          </p>
        )}

        {/* Content Rendered by Tiptap (Prose config) */}
        <div 
          className={`prose ${config.theme === 'minimal' ? '' : 'prose-invert'} prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-red-500 hover:prose-a:text-red-400 prose-img:rounded-xl prose-img:shadow-lg`}
          dangerouslySetInnerHTML={{ __html: article.content || '' }} 
        />
        
        {/* Footer info for Article */}
        <div className="mt-24 pt-8 border-t border-current border-opacity-10 opacity-70 flex flex-col items-center justify-center gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold ${config.theme === 'minimal' ? 'bg-gray-200 text-gray-700' : 'bg-white/10 text-gray-300'}`}>
               {article.authorName ? article.authorName[0].toUpperCase() : 'S'}
            </div>
            <div>
              <div className={`font-bold text-lg ${getTitleClasses()}`}>{article.authorName || 'Studio Developer'}</div>
              <div className="text-sm opacity-80">{article.authorRole || 'Developer'}</div>
            </div>
          </div>
          
          {article.socialX && (
            <a 
              href={article.socialX.startsWith('http') ? article.socialX : `https://${article.socialX}`} 
              target="_blank" 
              rel="noreferrer"
              className="hover:underline transition-colors font-medium flex items-center gap-2"
            >
              {article.socialLabel || "Author Link"} <ArrowSquareOut className="w-4 h-4" />
            </a>
          )}
        </div>
      </main>

      <footer className="border-t border-current border-opacity-10 py-10 px-6 shrink-0 text-center text-xs opacity-60">
        <div suppressHydrationWarning>
          &copy; {new Date().getFullYear()} {config.newsStudioName || article.authorName || 'Studio'}. Powered by PatchPlan.
        </div>
      </footer>
    </div>
  );
}


