"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { NEWS_THEMES, NEWS_TEMPLATES, NEWS_LAYOUTS, type NewsTemplate, type NewsLayout } from "@/lib/newsTheme";
import { refreshPublicPages } from "@/lib/publicRefresh";
import { DesignEditor, Field, Section, SettingsDrawer, inputCls, usePageDesign } from "./PageDesignSettings";

type NewsSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
};

// Theme, accent and email sign-up live in the shared design (see PageDesignSettings).
type SettingsData = {
  newsLayout: NewsLayout;
  newsTemplate: NewsTemplate;
  newsStudioName: string;
  newsLogoUrl: string;
  newsHeading: string;
  newsDescription: string;
  newsWebsiteUrl: string;
  newsDiscordUrl: string;
  newsXUrl: string;
};

const DEFAULTS: SettingsData = {
  newsLayout: "grid",
  newsTemplate: "standard",
  newsStudioName: "",
  newsLogoUrl: "",
  newsHeading: "",
  newsDescription: "",
  newsWebsiteUrl: "",
  newsDiscordUrl: "",
  newsXUrl: "",
};

/** Tiny wireframe previews so users can see what each layout looks like. */
function LayoutPreview({ layout }: { layout: NewsLayout }) {
  const block = "bg-white/15 rounded-[2px]";
  if (layout === "list") {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex gap-1.5 items-center">
            <div className={`${block} w-5 h-3`} />
            <div className="flex-1 space-y-0.5">
              <div className={`${block} h-1 w-4/5`} />
              <div className="bg-white/10 rounded-[2px] h-1 w-3/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (layout === "featured") {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className={`${block} h-6 w-full`} />
        <div className="grid grid-cols-3 gap-1">
          {[0, 1, 2].map(i => <div key={i} className="bg-white/10 rounded-[2px] h-3" />)}
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1 w-full">
      {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className={`${block} h-4`} />)}
    </div>
  );
}

export function NewsSettingsModal({ isOpen, onClose, scopeId }: NewsSettingsModalProps) {
  const [data, setData] = useState<SettingsData>(DEFAULTS);
  const [cfg, setCfg] = useState<Record<string, any> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { design, setDesign, shared, setShared, fields } = usePageDesign("news", cfg);

  useEffect(() => {
    if (!isOpen || !scopeId) return;
    setSaved(false);
    getDoc(doc(db, "public_configs", scopeId)).then(snap => {
      const d = snap.exists() ? snap.data() : {};
      setCfg(d);
      setData(prev => {
        const next = { ...prev };
        (Object.keys(DEFAULTS) as (keyof SettingsData)[]).forEach(k => {
          if (d[k] !== undefined && d[k] !== null) (next as any)[k] = d[k];
        });
        return next;
      });
    });
  }, [isOpen, scopeId]);

  const set = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) =>
    setData(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "public_configs", scopeId), { ...data, ...fields() }, { merge: true });
      refreshPublicPages(scopeId);
      setSaved(true);
      setTimeout(onClose, 500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const accent = design.accent || (NEWS_THEMES[design.theme] || NEWS_THEMES.dark).defaultAccent;

  return (
    <SettingsDrawer title="Press page settings" subtitle="How your public news hub looks to players" onClose={onClose} onSave={handleSave} saving={saving} saved={saved}>
      {/* Layout */}
      <Section title="Layout" hint="How articles are arranged on the hub.">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(NEWS_LAYOUTS) as NewsLayout[]).map(key => {
            const active = data.newsLayout === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => set("newsLayout", key)}
                className={`group text-left rounded-lg border p-2.5 transition-all ${active ? "border-white/40 bg-white/[0.06]" : "border-white/10 hover:border-white/20 bg-white/[0.02]"}`}
              >
                <div className="h-12 flex items-center px-1 mb-2">
                  <LayoutPreview layout={key} />
                </div>
                <div className="text-xs font-medium text-[#FAFAFA]">{NEWS_LAYOUTS[key].label}</div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Template */}
      <Section title="Style" hint="Typography and personality of headlines.">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(NEWS_TEMPLATES) as NewsTemplate[]).map(key => {
            const active = data.newsTemplate === key;
            const sample =
              key === "gaming" ? "font-extrabold uppercase tracking-wide" : key === "editorial" ? "font-serif font-normal" : "font-semibold tracking-tight";
            return (
              <button
                key={key}
                type="button"
                onClick={() => set("newsTemplate", key)}
                className={`text-left rounded-lg border p-3 transition-all ${active ? "border-white/40 bg-white/[0.06]" : "border-white/10 hover:border-white/20 bg-white/[0.02]"}`}
              >
                <div className={`text-2xl leading-none mb-2 text-[#FAFAFA] ${sample}`} style={key === "gaming" ? { color: accent } : undefined}>
                  Aa
                </div>
                <div className="text-xs font-medium text-[#FAFAFA]">{NEWS_TEMPLATES[key].label}</div>
                <div className="text-[11px] text-zinc-400 leading-snug mt-0.5">{NEWS_TEMPLATES[key].description}</div>
              </button>
            );
          })}
        </div>
      </Section>

      <div className="h-px bg-white/10" />

      <DesignEditor page="news" design={design} onChange={setDesign} shared={shared} onSharedChange={setShared} />

      <div className="h-px bg-white/10" />

      {/* Branding */}
      <Section title="Branding">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Studio name">
            <input className={inputCls} value={data.newsStudioName} onChange={e => set("newsStudioName", e.target.value)} placeholder="Your Studio" />
          </Field>
          <Field label="Page heading">
            <input className={inputCls} value={data.newsHeading} onChange={e => set("newsHeading", e.target.value)} placeholder="Studio News" />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            className={`${inputCls} resize-none h-16`}
            value={data.newsDescription}
            onChange={e => set("newsDescription", e.target.value)}
            placeholder="Devlogs, patch notes and announcements from the team."
          />
        </Field>
        <Field label="Logo URL">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.03] shrink-0 overflow-hidden flex items-center justify-center">
              {data.newsLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.newsLogoUrl} alt="" className="w-full h-full object-contain" />
              ) : (
                <span className="text-[10px] text-zinc-500">Logo</span>
              )}
            </div>
            <input className={inputCls} value={data.newsLogoUrl} onChange={e => set("newsLogoUrl", e.target.value)} placeholder="https://…/logo.png" />
          </div>
        </Field>
      </Section>

      {/* Links */}
      <Section title="Links" hint="Shown in the hub's navigation bar.">
        <Field label="Website">
          <input className={inputCls} value={data.newsWebsiteUrl} onChange={e => set("newsWebsiteUrl", e.target.value)} placeholder="yourgame.com" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Discord">
            <input className={inputCls} value={data.newsDiscordUrl} onChange={e => set("newsDiscordUrl", e.target.value)} placeholder="discord.gg/…" />
          </Field>
          <Field label="X / Twitter">
            <input className={inputCls} value={data.newsXUrl} onChange={e => set("newsXUrl", e.target.value)} placeholder="x.com/…" />
          </Field>
        </div>
      </Section>
    </SettingsDrawer>
  );
}
