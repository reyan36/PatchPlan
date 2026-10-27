"use client";

import { useState } from "react";
import { PublicFooter } from "@/components/email/PublicFooter";
import { resolveTheme, themeVars, type SignupStyle } from "@/lib/newsTheme";
import { Globe, MagnifyingGlass } from "@phosphor-icons/react";

export type RoadmapItem = {
  id: string;
  title: string;
  column: string;
  category: string;
  bullets: string[];
};

export type RoadmapConfig = {
  roadmapHeading: string;
  roadmapDescription: string;
  logoUrl: string;
  websiteUrl: string;
  discordUrl: string;
  theme: string;
  accent: string;
  signupStyle: SignupStyle;
  signupColor: string;
};

export type RoadmapData = { items: RoadmapItem[]; columns: string[]; familyName: string; config: RoadmapConfig };

/** The public roadmap. Data comes from the server (cached), so the browser never loads Firestore. */
export function RoadmapView({ familyId, data }: { familyId: string; data: RoadmapData }) {
  const { items, columns, familyName, config } = data;
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tokens = resolveTheme(config.theme);
  const accent = config.accent || tokens.defaultAccent;
  const vars = themeVars(config.theme, accent) as React.CSSProperties;
  const pageClasses = "bg-[var(--pp-bg)] text-[var(--pp-fg)]";
  const cardClasses = "bg-[var(--pp-surface)] border border-[var(--pp-border)] shadow-sm";
  // Category tags in the accent colour (they used to be fixed green).
  const tagStyle = {
    color: "var(--pp-accent)",
    background: "color-mix(in srgb, var(--pp-accent) 14%, transparent)",
    borderColor: "color-mix(in srgb, var(--pp-accent) 32%, transparent)",
  };

  if (familyName === "Expired") {
    return (
      <div style={vars} className={`min-h-screen ${pageClasses} flex flex-col items-center justify-center`}>
        <h1 className="text-3xl font-bold mb-2">Link Expired</h1>
        <p>This public roadmap link has expired.</p>
      </div>
    );
  }

  const headerText = config.roadmapHeading || `${familyName} Roadmap`;
  const descText = config.roadmapDescription || "Last updated recently. Cards are arranged by milestone. This list is not exhaustive.";

  return (
    <div style={vars} className={`min-h-screen flex flex-col font-sans ${pageClasses}`}>
      <header className="px-8 md:px-12 py-12 border-b border-[var(--pp-border)] shrink-0 w-full flex flex-col md:flex-row md:items-center justify-between gap-8 bg-[var(--pp-surface)]">
        <div className="flex items-center gap-6">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
          ) : (
            <Globe className="text-[var(--pp-accent)] w-12 h-12" weight="duotone" />
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
            className={`pl-9 pr-4 py-2 rounded-full focus:outline-none focus:ring-1 text-sm w-64 transition-colors ${tokens.isLight ? 'bg-black/[0.05] focus:bg-white focus:ring-black/40' : 'bg-white/10 focus:bg-white/15 focus:ring-white/30'}`}
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
                <div className="flex items-center gap-2 mb-6 shrink-0 border-b border-[var(--pp-border)] pb-4">
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
                    <div key={item.id} className={`${cardClasses} rounded-lg p-5`}>
                      <h4 className="font-bold mb-3 text-lg leading-tight">{item.title}</h4>
                      <span className="inline-block px-2 py-0.5 rounded border text-xs font-semibold tracking-wide uppercase mb-4" style={tagStyle}>
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

      {/* Email sign-up lives in the footer, in the style and colour the studio picked. */}
      <PublicFooter
        scopeId={familyId}
        source="roadmap"
        studioName={familyName}
        links={[
          ...(config.websiteUrl ? [{ label: "Website", href: config.websiteUrl.startsWith("http") ? config.websiteUrl : `https://${config.websiteUrl}` }] : []),
          ...(config.discordUrl ? [{ label: "Discord", href: config.discordUrl.startsWith("http") ? config.discordUrl : `https://${config.discordUrl}` }] : []),
        ]}
        design={{ signupStyle: config.signupStyle, signupColor: config.signupColor, accent }}
      />
    </div>
  );
}

