"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { X, Check } from "@phosphor-icons/react";
import {
  NEWS_THEMES,
  NEWS_TEMPLATES,
  NEWS_LAYOUTS,
  ACCENT_PRESETS,
  type NewsTheme,
  type NewsTemplate,
  type NewsLayout,
} from "@/lib/newsTheme";

type NewsSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
};

type SettingsData = {
  newsLayout: NewsLayout;
  newsTemplate: NewsTemplate;
  newsTheme: NewsTheme;
  newsAccent: string;
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
  newsTheme: "dark",
  newsAccent: "",
  newsStudioName: "",
  newsLogoUrl: "",
  newsHeading: "",
  newsDescription: "",
  newsWebsiteUrl: "",
  newsDiscordUrl: "",
  newsXUrl: "",
};

const inputCls =
  "w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[13px] font-semibold text-[#FAFAFA]">{title}</h3>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen || !scopeId) return;
    setSaved(false);
    getDoc(doc(db, "public_configs", scopeId)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      setData(prev => {
        const next = { ...prev };
        (Object.keys(DEFAULTS) as (keyof SettingsData)[]).forEach(k => {
          if (d[k] !== undefined && d[k] !== null) (next as any)[k] = d[k];
        });
        return next;
      });
    });
  }, [isOpen, scopeId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const set = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) =>
    setData(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "public_configs", scopeId), data, { merge: true });
      setSaved(true);
      setTimeout(onClose, 500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const theme = NEWS_THEMES[data.newsTheme] || NEWS_THEMES.dark;
  const accent = data.newsAccent || theme.defaultAccent;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-150" onClick={onClose} />

      <aside
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[460px] h-full bg-[#0a0a0a] border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
      >
        <header className="flex items-center justify-between px-6 h-14 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Press page settings</h2>
            <p className="text-[11px] text-zinc-500">How your public news hub looks to players</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            <X size={16} weight="bold" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
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
                    <div className="text-[10px] text-zinc-500 leading-snug mt-0.5">{NEWS_TEMPLATES[key].description}</div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Theme */}
          <Section title="Theme">
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(NEWS_THEMES) as NewsTheme[]).map(key => {
                const t = NEWS_THEMES[key];
                const active = data.newsTheme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set("newsTheme", key)}
                    className={`rounded-lg border p-1.5 transition-all ${active ? "border-white/40" : "border-white/10 hover:border-white/20"}`}
                  >
                    <div className="h-10 rounded-md flex items-end p-1.5 gap-1" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
                      <div className="h-1.5 w-6 rounded-full" style={{ background: t.fg, opacity: 0.8 }} />
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: data.newsAccent || t.defaultAccent }} />
                    </div>
                    <div className="text-[11px] font-medium text-[#FAFAFA] mt-1.5 text-center">{t.label}</div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Accent */}
          <Section title="Accent color" hint="Used for links, tags and buttons.">
            <div className="flex items-center gap-2 flex-wrap">
              {ACCENT_PRESETS.map(c => {
                const active = accent.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("newsAccent", c)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${active ? "ring-2 ring-white/60 ring-offset-2 ring-offset-[#0a0a0a]" : ""}`}
                    style={{ background: c }}
                    title={c}
                  >
                    {active && <Check size={12} weight="bold" color={c === "#FAFAFA" || c === "#facc15" ? "#000" : "#fff"} />}
                  </button>
                );
              })}
              <input
                type="text"
                value={data.newsAccent}
                onChange={e => set("newsAccent", e.target.value)}
                placeholder={theme.defaultAccent}
                className={`${inputCls} !w-28 font-mono text-xs`}
              />
            </div>
          </Section>

          <div className="h-px bg-white/10" />

          {/* Branding */}
          <Section title="Branding">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Studio name">
                <input className={inputCls} value={data.newsStudioName} onChange={e => set("newsStudioName", e.target.value)} placeholder="Ramjet Studios" />
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
                    <span className="text-[10px] text-zinc-600">Logo</span>
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
        </div>

        <footer className="flex items-center justify-end gap-2 px-6 h-16 border-t border-white/10 shrink-0 bg-[#0a0a0a]">
          <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#FAFAFA] text-black hover:bg-white transition-colors disabled:opacity-50"
          >
            {saved ? <><Check size={13} weight="bold" /> Saved</> : saving ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </aside>
    </div>
  );
}
