import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from 'next';
import { cache } from 'react';

// Next.js ISR: Cache rendered news page at edge/server for 60 seconds
export const revalidate = 60;

type Article = {
  id: string;
  title: string;
  excerpt: string;
  coverImage: string;
  createdAt: any;
};

type ConfigData = {
  layout: string;
  websiteUrl: string;
  discordUrl: string;
  newsHeading: string;
  theme: string;
  logoUrl: string;
  template: string;
}

const getNewsData = cache(async (slug: string) => {
  let familyId = slug;
  try {
    const configQuery = query(collection(db, 'public_configs'), where('newsSlug', '==', slug));
    const configSnap = await getDocs(configQuery);
    if (!configSnap.empty) {
      familyId = configSnap.docs[0].id;
    }
  } catch(e) {}
  let familyName = "Studio";
  let articles: Article[] = [];
  let config: ConfigData = { layout: "grid", websiteUrl: "", discordUrl: "", newsHeading: "", theme: "dark", logoUrl: "", template: "standard" };

  try {
    // Run config, family, user profile, and article queries in parallel for high speed
    const [configDoc, familyDoc, userDoc, snapFam, snapUser] = await Promise.all([
      getDoc(doc(db, "public_configs", familyId)),
      getDoc(doc(db, "families", familyId)),
      getDoc(doc(db, "user_profiles", familyId)),
      getDocs(query(collection(db, "articles"), where("familyId", "==", familyId), where("status", "==", "published"))),
      getDocs(query(collection(db, "articles"), where("userId", "==", familyId), where("status", "==", "published")))
    ]);

    if (configDoc.exists()) {
      const d = configDoc.data();
      if (d.newsLayout) config.layout = d.newsLayout;
      if (d.newsWebsiteUrl) config.websiteUrl = d.newsWebsiteUrl;
      if (d.newsDiscordUrl) config.discordUrl = d.newsDiscordUrl;
      if (d.newsHeading) config.newsHeading = d.newsHeading;
      if (d.newsTheme) config.theme = d.newsTheme;
      if (d.newsLogoUrl) config.logoUrl = d.newsLogoUrl;
      if (d.newsTemplate) config.template = d.newsTemplate;
      if (d.newsStudioName) familyName = d.newsStudioName;
      
      const expiresAt = d.newsExpiresAt;
      if (expiresAt !== undefined && expiresAt !== -1 && expiresAt > 0 && Date.now() > expiresAt) {
        return { familyName: "Expired", articles: [], config };
      }
    }

    if (familyName === "Studio") {
      if (familyDoc.exists() && familyDoc.data().name) {
        familyName = familyDoc.data().name;
      } else if (userDoc.exists()) {
        familyName = userDoc.data().displayName || userDoc.data().name || "Studio";
      }
    }

    const snap = !snapFam.empty ? snapFam : snapUser;
    articles = snap.docs.map(d => ({
      id: d.id,
      title: d.data().title,
      excerpt: d.data().excerpt,
      coverImage: d.data().coverImage,
      createdAt: d.data().createdAt?.toMillis() || Date.now()
    })).sort((a, b) => b.createdAt - a.createdAt);
    
  } catch (err) {
    console.error(err);
  }

  return { familyName, articles, config };
});

export async function generateMetadata({ params }: { params: { familyId: string } }): Promise<Metadata> {
  const { familyName, config } = await getNewsData(params.familyId);
  const title = config.newsHeading || `${familyName} News`;
  return { title };
}

export default async function PublicNewsPage({ params, searchParams }: { params: { familyId: string }, searchParams?: { q?: string } }) {
  const { familyName, articles, config } = await getNewsData(params.familyId);
  
  const getThemeClasses = () => {
    switch (config.theme) {
      case 'midnight': return 'bg-[#0a0f1c] text-gray-200';
      case 'cyberpunk': return 'bg-[#000] text-yellow-500';
      case 'minimal': return 'bg-[#fcfcfc] text-gray-900';
      default: return 'bg-[#141414] text-gray-200';
    }
  };

  const getTextTitleClasses = () => {
    switch (config.theme) {
      case 'minimal': return 'text-black group-hover:text-gray-600';
      case 'cyberpunk': return 'text-yellow-400 group-hover:text-yellow-200';
      default: return 'text-white group-hover:text-gray-300';
    }
  };
  
  const getTextBodyClasses = () => {
    switch (config.theme) {
      case 'minimal': return 'text-gray-600';
      default: return 'text-gray-400';
    }
  };

  if (familyName === "Expired") {
    return (
      <div className={`min-h-screen ${getThemeClasses()} flex flex-col items-center justify-center`}>
        <h1 className="text-3xl font-bold mb-2">Link Expired</h1>
        <p>This public news link has expired.</p>
      </div>
    );
  }

  const queryParam = searchParams?.q?.toLowerCase() || "";
  const filteredArticles = articles.filter(a => a.title.toLowerCase().includes(queryParam) || a.excerpt.toLowerCase().includes(queryParam));

  const renderArticle = (article: Article, isFeatured = false) => {
    const isList = config.layout === 'list';
    
    // Gaming Template Styles (Zomboid)
    if (config.template === 'gaming') {
      return (
        <Link 
          key={article.id} 
          href={`/p/article/${article.id}`}
          className={`group flex ${isFeatured ? 'flex-col gap-4 mb-16' : (isList ? 'flex-row items-center gap-6 mb-10' : 'flex-col gap-3')} outline-none`}
        >
          {article.coverImage && (
            <div className={`${isFeatured ? 'w-full aspect-video' : (isList ? 'w-64 aspect-video shrink-0' : 'w-full aspect-[16/9]')} overflow-hidden bg-black`}>
              <img 
                src={article.coverImage} 
                alt={article.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              />
            </div>
          )}
          <div className="flex flex-col flex-1">
            <h2 className={`${isFeatured ? 'text-3xl' : 'text-xl'} font-bold uppercase tracking-wider mb-2 text-red-500 group-hover:text-red-400 transition-colors`}>
              {article.title} 
              <span className="text-red-600 ml-1">›</span>
            </h2>
            <p className="text-gray-300 text-sm line-clamp-2 mb-3 font-medium">
              {article.excerpt}
            </p>
            <div className="text-xs mt-auto font-medium tracking-wide">
              <span className="text-red-500">News & Dev</span> <span className="text-gray-500 mx-2">|</span> <span className="text-white">{new Date(article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </Link>
      );
    }

    // Editorial Template
    if (config.template === 'editorial') {
      return (
        <Link 
          key={article.id} 
          href={`/p/article/${article.id}`}
          className={`group flex ${isFeatured ? 'flex-col gap-8 mb-20' : (isList ? 'flex-col md:flex-row items-center gap-8 mb-16' : 'flex-col gap-6')} outline-none`}
        >
          {article.coverImage && (
            <div className={`${isFeatured ? 'w-full aspect-[21/9]' : (isList ? 'w-full md:w-1/2 aspect-[4/3] shrink-0' : 'w-full aspect-[4/3]')} overflow-hidden`}>
              <img 
                src={article.coverImage} 
                alt={article.title} 
                className="w-full h-full object-cover group-hover:opacity-80 transition-opacity duration-300 grayscale group-hover:grayscale-0" 
              />
            </div>
          )}
          <div className={`flex flex-col flex-1 ${isFeatured ? 'items-center text-center px-4' : ''}`}>
            <div className="text-xs font-serif uppercase tracking-widest text-muted-foreground mb-4">
              {new Date(article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <h2 className={`${isFeatured ? 'text-4xl lg:text-5xl' : 'text-2xl'} font-serif font-light mb-4 leading-tight group-hover:underline decoration-1 underline-offset-4`}>
              {article.title}
            </h2>
            <p className="text-muted-foreground font-serif leading-relaxed line-clamp-3">
              {article.excerpt}
            </p>
          </div>
        </Link>
      );
    }

    // Standard Template
    return (
      <Link 
        key={article.id} 
        href={`/p/article/${article.id}`}
        className={`group flex ${isFeatured ? 'flex-col md:flex-row gap-8 mb-16' : (isList ? 'flex-row items-center gap-8 mb-10 border-b border-white/10 pb-10' : 'flex-col gap-4')} outline-none`}
      >
        {article.coverImage && (
          <div className={`${isFeatured ? 'w-full md:w-2/3 aspect-video' : (isList ? 'w-48 md:w-64 aspect-video shrink-0' : 'w-full aspect-video')} overflow-hidden bg-black/20 rounded-lg`}>
            <img 
              src={article.coverImage} 
              alt={article.title} 
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500" 
            />
          </div>
        )}
        <div className={`flex flex-col flex-1 ${isFeatured ? 'justify-center' : ''}`}>
          <h2 className={`${isFeatured ? 'text-4xl lg:text-5xl' : 'text-2xl'} font-black mb-3 leading-tight transition-colors tracking-tight ${getTextTitleClasses()}`}>
            {article.title}
          </h2>
          <p className={`${getTextBodyClasses()} ${isFeatured ? 'line-clamp-4 text-lg' : 'line-clamp-2'} mb-4 leading-relaxed`}>
            {article.excerpt}
          </p>
          <div className={`text-xs font-semibold uppercase tracking-widest mt-auto ${config.theme === 'minimal' ? 'text-gray-400' : 'text-gray-500'}`}>
            {new Date(article.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} — {Math.max(1, Math.ceil(article.excerpt.length / 100))} min read
          </div>
        </div>
      </Link>
    );
  };

  const headerText = config.newsHeading || `${familyName} News`;

  return (
    <div className={`min-h-screen font-sans flex flex-col ${getThemeClasses()}`}>
      <header className={`px-6 py-12 md:py-20 flex flex-col items-center justify-center shrink-0 border-b ${config.theme === 'minimal' ? 'border-gray-200 bg-white' : 'border-white/5 bg-black/40'}`}>
        {config.logoUrl && (
          <img src={config.logoUrl} alt="Logo" className="w-20 h-20 object-contain mb-6" />
        )}
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 text-center drop-shadow-md">
          {headerText}
        </h1>
        
        {/* Search Bar */}
        <form className="relative w-full max-w-md mx-auto" action={`/p/news/${params.familyId}`}>
          <MagnifyingGlass className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            name="q"
            defaultValue={searchParams?.q || ""}
            placeholder="Search updates..."
            className={`w-full pl-12 pr-4 py-3 rounded-full focus:outline-none focus:ring-1 text-sm transition-colors ${config.theme === 'minimal' ? 'bg-gray-100 hover:bg-gray-200 focus:bg-gray-200 ring-black text-black' : 'bg-white/5 hover:bg-white/10 focus:bg-white/10 ring-white/50 text-white border border-white/10'}`}
          />
        </form>
      </header>

      <main className="max-w-[1400px] w-full mx-auto px-6 py-16 flex-1">
        <div className={config.layout === 'grid' || config.layout === 'featured' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12' : 'max-w-4xl mx-auto'}>
          {config.layout === 'featured' && filteredArticles.length > 0 && (
            <div className="col-span-full">
              {renderArticle(filteredArticles[0], true)}
            </div>
          )}
          
          {(config.layout === 'featured' ? filteredArticles.slice(1) : filteredArticles).map(article => renderArticle(article))}
          
          {filteredArticles.length === 0 && (
            <div className="col-span-full py-20 text-center opacity-50">
              No articles found.
            </div>
          )}
        </div>
      </main>

      <footer className={`border-t py-16 px-6 shrink-0 flex flex-col items-center gap-10 opacity-80 ${config.theme === 'minimal' ? 'bg-gray-50 border-gray-200' : 'bg-black/80 border-white/5'}`}>
        
        <div className="w-full max-w-md text-center">
           <h4 className="font-bold mb-3">Join the Mailing List</h4>
           <div className="flex gap-2">
             <input type="email" placeholder="Enter your email" className={`flex-1 px-4 py-2 rounded-md focus:outline-none ${config.theme === 'minimal' ? 'bg-white border border-gray-300' : 'bg-white/10 border border-white/10'}`} />
             <button type="submit" className={`px-4 py-2 rounded-md font-bold ${config.theme === 'minimal' ? 'bg-black text-white' : 'bg-white text-black'}`}>Subscribe</button>
           </div>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm">
          {config.websiteUrl && (
            <a href={config.websiteUrl.startsWith('http') ? config.websiteUrl : `https://${config.websiteUrl}`} target="_blank" rel="noreferrer" className="hover:underline transition-colors">Website</a>
          )}
          {config.discordUrl && (
            <a href={config.discordUrl.startsWith('http') ? config.discordUrl : `https://${config.discordUrl}`} target="_blank" rel="noreferrer" className="hover:underline transition-colors">Discord</a>
          )}
        </div>
        <div className="text-xs" suppressHydrationWarning>&copy; {new Date().getFullYear()} {familyName}. Powered by PatchPlan.</div>
      </footer>
    </div>
  );
}



