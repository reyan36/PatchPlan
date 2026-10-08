"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, doc, deleteDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Newspaper, Plus, Trash2, Globe, ArrowRight, Share2 } from "lucide-react";
import { Login } from "@/components/auth/Login";
import { Modal } from "@/components/ui/Modal";
import { NewsSettingsModal } from "@/components/ui/NewsSettingsModal";
import { ShareModal } from "@/components/ui/ShareModal";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Article = {
  id: string;
  title: string;
  excerpt: string;
  familyId: string;
  status: "draft" | "published";
  createdAt: any;
};

export default function NewsPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeFamily, loading: familyLoading } = useFamily();
  const router = useRouter();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newsHeading, setNewsHeading] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [discordUrl, setDiscordUrl] = useState('');
  const [layoutSetting, setLayoutSetting] = useState("grid");

  useEffect(() => {
    if (!user) return;
    const scopeId = activeFamily ? activeFamily.id : user.uid;
    
    // Fetch Layout Settings
    const configUnsub = onSnapshot(doc(db, "public_configs", scopeId), (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        if (d.newsLayout) setLayoutSetting(d.newsLayout);
        if (d.newsHeading) setNewsHeading(d.newsHeading);
        if (d.websiteUrl) setWebsiteUrl(d.websiteUrl);
        if (d.discordUrl) setDiscordUrl(d.discordUrl);
      }
    });

    const q = activeFamily
      ? query(collection(db, "articles"), where("familyId", "==", scopeId))
      : query(collection(db, "articles"), where("userId", "==", scopeId));

    const unsub = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Article[];
      if (!activeFamily) {
        data = data.filter((i: any) => !i.familyId);
      }
      setArticles(data.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
      setLoading(false);
    });
    return () => {
      unsub();
      configUnsub();
    };
  }, [user, activeFamily]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const scopeId = activeFamily ? activeFamily.id : user.uid;
    await setDoc(doc(db, "public_configs", scopeId), { newsHeading, websiteUrl, discordUrl }, { merge: true });
    setIsSettingsOpen(false);
  };

  const handleLayoutChange = async (val: string) => {
    if (!user) return;
    const scopeId = activeFamily ? activeFamily.id : user.uid;
    setLayoutSetting(val);
    await setDoc(doc(db, "public_configs", scopeId), { newsLayout: val }, { merge: true });
  };

  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;

    const docRef = await addDoc(collection(db, "articles"), {
      userId: user.uid,
      familyId: activeFamily ? activeFamily.id : null,
      title: newTitle.trim(),
      excerpt: "A new update from the studio...",
      content: "",
      coverImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070",
      status: "draft",
      createdAt: serverTimestamp()
    });

    setIsAdding(false);
    setNewTitle("");
    router.push(`/news/${docRef.id}`);
  };

  const deleteArticle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this article?")) {
      await deleteDoc(doc(db, "articles", id));
    }
  };

  if (authLoading || familyLoading || loading) return <div className="p-8 text-muted-foreground animate-pulse">Loading News...</div>;
  if (!user) return <Login />;
  
  const scopeId = activeFamily ? activeFamily.id : user.uid;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in py-8">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Newspaper className="text-primary" /> 
            Studio News
          </h1>
          <p className="text-muted-foreground mt-1">Write devlogs, patch notes, and announcements to share with your community.</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={layoutSetting}
            onChange={(e) => handleLayoutChange(e.target.value)}
            className="px-4 py-2 bg-muted hover:bg-muted/80 border border-border rounded-md text-sm font-medium transition-colors cursor-pointer outline-none"
          >
            <option value="grid">Layout: Grid (Default)</option>
            <option value="list">Layout: List View</option>
            <option value="featured">Layout: Featured Article</option>
          </select>
          <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 border border-border rounded-md text-sm font-medium transition-colors whitespace-nowrap">Settings</button><button onClick={() => setIsSharing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 border border-border rounded-md text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Share2 className="w-4 h-4" />
            Share Press Page
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Write Article
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map(article => (
          <div 
            key={article.id}
            onClick={() => router.push(`/news/${article.id}`)}
            className="group bg-card border border-border hover:border-primary/50 rounded-xl overflow-hidden shadow-sm transition-all cursor-pointer flex flex-col h-64 relative"
          >
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${article.status === 'published' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                  {article.status}
                </span>
                <button 
                  onClick={(e) => deleteArticle(e, article.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-xl font-bold mb-2 line-clamp-2">{article.title}</h2>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{article.excerpt}</p>
              <div className="mt-auto text-sm text-primary flex items-center gap-1 font-medium group-hover:translate-x-1 transition-transform">
                Edit Article <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}

        {articles.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-border rounded-xl">
            <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No articles written yet</h3>
            <p className="text-muted-foreground mt-1">Start writing devlogs and announcements.</p>
          </div>
        )}
      </div>

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Create New Article">
        <form onSubmit={handleAddArticle} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Article Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. Patch 1.2: The Combat Update"
              className="w-full bg-background border border-border rounded-md px-4 py-2 focus:border-primary focus:outline-none"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90">Create Draft</button>
          </div>
        </form>
      </Modal>

      <NewsSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} scopeId={scopeId} />
      <ShareModal 
        isOpen={isSharing} 
        onClose={() => setIsSharing(false)} 
        scopeId={scopeId} 
        sharePath="/p/news" 
        title="Share Press Page" 
      />
    </div>
  );
}







