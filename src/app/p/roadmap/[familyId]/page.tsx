"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Globe, MagnifyingGlass } from "@phosphor-icons/react";

type RoadmapItem = {
  id: string;
  title: string;
  column: string;
  category: string;
  bullets: string[];
};

type ConfigData = {
  roadmapHeading: string;
  roadmapDescription: string;
  logoUrl: string;
  websiteUrl: string;
  discordUrl: string;
  theme: string;
}

export default function PublicRoadmapPage({ params }: { params: { familyId: string } }) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [columns, setColumns] = useState<string[]>(["Far Future", "Future", "Later", "Soon", "Done for next update"]);
  const [familyName, setFamilyName] = useState("Studio");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [config, setConfig] = useState<ConfigData>({
    roadmapHeading: "",
    roadmapDescription: "",
    logoUrl: "",
    websiteUrl: "",
    discordUrl: "",
    theme: "dark"
  });

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        let familyId = params.familyId;
        const configQuery = query(collection(db, 'public_configs'), where('roadmapSlug', '==', params.familyId));
        const configSnap = await getDocs(configQuery);
        if (!configSnap.empty) {
          familyId = configSnap.docs[0].id;
        }

        // Fetch configs, family, user profile, and roadmap items concurrently in parallel
        const [configDoc, pubConfigDoc, familyDoc, userDoc, famSnap, userSnap] = await Promise.all([
          getDoc(doc(db, "roadmap_configs", familyId)),
          getDoc(doc(db, "public_configs", familyId)),
          getDoc(doc(db, "families", familyId)),
          getDoc(doc(db, "user_profiles", familyId)),
          getDocs(query(collection(db, "roadmap"), where("familyId", "==", familyId))),
          getDocs(query(collection(db, "roadmap"), where("userId", "==", familyId)))
        ]);

        if (configDoc.exists()) {
          setColumns(configDoc.data().columns || []);
        }

        let fetchedFamilyName = "Studio";
        if (pubConfigDoc.exists()) {
          const d = pubConfigDoc.data();
          if (d.roadmapExpiresAt !== undefined && d.roadmapExpiresAt !== -1 && d.roadmapExpiresAt > 0 && Date.now() > d.roadmapExpiresAt) {
            setLoading(false);
            setItems([]);
            setFamilyName("Expired");
            return;
          }
          setConfig(prev => ({ 
            ...prev, 
            ...d,
            theme: d.roadmapTheme || prev.theme,
            logoUrl: d.roadmapLogoUrl || prev.logoUrl,
            websiteUrl: d.roadmapWebsiteUrl || prev.websiteUrl,
            discordUrl: d.roadmapDiscordUrl || prev.discordUrl
          }));
          if (d.roadmapStudioName) {
            fetchedFamilyName = d.roadmapStudioName;
          }
        }

        if (fetchedFamilyName === "Studio") {
          if (familyDoc.exists() && familyDoc.data().name) {
            fetchedFamilyName = familyDoc.data().name;
          } else if (userDoc.exists()) {
            fetchedFamilyName = userDoc.data().displayName || userDoc.data().name || "Studio";
          }
        }
        
        setFamilyName(fetchedFamilyName);

        const snap = !famSnap.empty ? famSnap : userSnap;
        const fetchedItems = snap.docs.map(d => ({ id: d.id, ...d.data() })) as RoadmapItem[];
        setItems(fetchedItems);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicData();
  }, [params.familyId]);

  useEffect(() => {
    document.title = config.roadmapHeading || `${familyName} Roadmap`;
  }, [config.roadmapHeading, familyName]);

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getThemeClasses = () => {
    switch (config.theme) {
      case 'midnight': return 'bg-[#0a0f1c] text-gray-200';
      case 'cyberpunk': return 'bg-[#000] text-yellow-500';
      case 'minimal': return 'bg-[#fcfcfc] text-gray-900';
      default: return 'bg-[#111111] text-gray-200';
    }
  };
  const getCardClasses = () => {
    switch (config.theme) {
      case 'minimal': return 'bg-white border border-gray-200 shadow-sm text-gray-900';
      default: return 'bg-[#202020] border border-white/5 shadow-sm text-gray-200';
    }
  };

  if (loading) {
    return <div className={`min-h-screen ${getThemeClasses()} flex items-center justify-center`}>Loading Roadmap...</div>;
  }

  if (familyName === "Expired") {
    return (
      <div className={`min-h-screen ${getThemeClasses()} flex flex-col items-center justify-center`}>
        <h1 className="text-3xl font-bold mb-2">Link Expired</h1>
        <p>This public roadmap link has expired.</p>
      </div>
    );
  }

  const headerText = config.roadmapHeading || `${familyName} Roadmap`;
  const descText = config.roadmapDescription || "Last updated recently. Cards are arranged by milestone. This list is not exhaustive.";

  return (
    <div className={`min-h-screen flex flex-col font-sans ${getThemeClasses()}`}>
      <header className="px-8 md:px-12 py-12 border-b border-white/5 shrink-0 w-full flex flex-col md:flex-row md:items-center justify-between gap-8 bg-black/10">
        <div className="flex items-center gap-6">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
          ) : (
            <Globe className="text-red-500 w-12 h-12" weight="duotone" />
          )}
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              {headerText}
            </h1>
            <p className="text-sm opacity-60 max-w-xl">{descText}</p>
          </div>
        </div>
        <div className="relative">
          <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            placeholder="Search milestones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-9 pr-4 py-2 rounded-full focus:outline-none focus:ring-1 text-sm w-64 transition-colors ${config.theme === 'minimal' ? 'bg-gray-100 focus:bg-white focus:ring-black' : 'bg-white/10 focus:bg-white/15 focus:ring-white/30'}`}
          />
        </div>
      </header>

      <div className="flex-1 overflow-x-auto p-8 md:p-12 custom-scrollbar w-full flex flex-col">
        <div className="flex gap-8 h-full min-w-max flex-1 pb-12">
          {columns.map(column => {
            const columnItems = filteredItems.filter(i => i.column === column);
            return (
              <div key={column} className="w-80 flex flex-col h-full">
                {/* Column Header */}
                <div className="flex items-center gap-2 mb-6 shrink-0 border-b border-white/10 pb-4">
                  <div className={`w-3 h-3 rounded-full ${
                    column === "Far Future" ? "bg-gray-500" :
                    column === "Future" ? "bg-red-500/50" :
                    column === "Later" ? "bg-orange-500/50" :
                    column === "Soon" ? "bg-emerald-500/50" : "bg-blue-500/50"
                  }`} />
                  <h3 className="font-semibold opacity-90">{column}</h3>
                  <span className="ml-auto text-xs opacity-40">{columnItems.length}</span>
                </div>

                {/* Column Items */}
                <div className="flex-1 space-y-4">
                  {columnItems.map(item => (
                    <div key={item.id} className={`${getCardClasses()} rounded-lg p-5`}>
                      <h4 className="font-bold mb-3 text-lg leading-tight">{item.title}</h4>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold tracking-wide uppercase mb-4 ${config.theme === 'minimal' ? 'bg-gray-200 text-gray-700' : 'bg-green-900/30 text-green-400 border border-green-800/50'}`}>
                        {item.category}
                      </span>
                      <ul className="text-sm opacity-70 space-y-3 list-disc pl-4 marker:opacity-50">
                        {item.bullets?.length > 0 ? (
                          item.bullets.map((b, i) => <li key={i}>{b}</li>)
                        ) : (
                          <li className="italic opacity-50">Details pending.</li>
                        )}
                      </ul>
                    </div>
                  ))}
                  {columnItems.length === 0 && (
                    <div className="text-sm italic opacity-40 py-4">No items scheduled.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="border-t border-white/5 py-12 px-6 shrink-0 text-center text-sm flex flex-col items-center gap-6 opacity-60 bg-black/20">
        <div className="flex items-center justify-center gap-6">
          {config.websiteUrl && (
            <a href={config.websiteUrl.startsWith('http') ? config.websiteUrl : `https://${config.websiteUrl}`} target="_blank" rel="noreferrer" className="hover:underline transition-colors">Website</a>
          )}
          {config.discordUrl && (
            <a href={config.discordUrl.startsWith('http') ? config.discordUrl : `https://${config.discordUrl}`} target="_blank" rel="noreferrer" className="hover:underline transition-colors">Discord</a>
          )}
        </div>
        <div suppressHydrationWarning>&copy; {new Date().getFullYear()} {familyName}. Powered by PatchPlan.</div>
      </footer>
    </div>
  );
}

