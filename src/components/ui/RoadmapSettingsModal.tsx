"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { refreshPublicPages } from "@/lib/publicRefresh";
import { DesignEditor, Field, Section, SettingsDrawer, inputCls, usePageDesign } from "./PageDesignSettings";

type RoadmapSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
};

// Theme, accent and email sign-up live in the shared design (see PageDesignSettings).
type SettingsData = {
  roadmapHeading: string;
  roadmapDescription: string;
  roadmapStudioName: string;
  roadmapLogoUrl: string;
  roadmapWebsiteUrl: string;
  roadmapDiscordUrl: string;
};

const DEFAULTS: SettingsData = {
  roadmapHeading: "",
  roadmapDescription: "",
  roadmapStudioName: "",
  roadmapLogoUrl: "",
  roadmapWebsiteUrl: "",
  roadmapDiscordUrl: "",
};

export function RoadmapSettingsModal({ isOpen, onClose, scopeId }: RoadmapSettingsModalProps) {
  const [data, setData] = useState<SettingsData>(DEFAULTS);
  const [cfg, setCfg] = useState<Record<string, any> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { design, setDesign, shared, setShared, fields } = usePageDesign("roadmap", cfg);

  useEffect(() => {
    if (!isOpen || !scopeId) return;
    setSaved(false);
    getDoc(doc(db, "public_configs", scopeId)).then((snap) => {
      const d = snap.exists() ? snap.data() : {};
      setCfg(d);
      setData((prev) => {
        const next = { ...prev };
        (Object.keys(DEFAULTS) as (keyof SettingsData)[]).forEach((k) => {
          if (typeof d[k] === "string") next[k] = d[k];
        });
        return next;
      });
    });
  }, [isOpen, scopeId]);

  const set = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => setData((prev) => ({ ...prev, [key]: value }));

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

  return (
    <SettingsDrawer title="Roadmap page settings" subtitle="How your public roadmap looks to players" onClose={onClose} onSave={handleSave} saving={saving} saved={saved}>
      <DesignEditor page="roadmap" design={design} onChange={setDesign} shared={shared} onSharedChange={setShared} />

      <div className="h-px bg-white/10" />

      <Section title="Branding">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Studio name">
            <input className={inputCls} value={data.roadmapStudioName} onChange={(e) => set("roadmapStudioName", e.target.value)} placeholder="Your Studio" />
          </Field>
          <Field label="Page heading">
            <input className={inputCls} value={data.roadmapHeading} onChange={(e) => set("roadmapHeading", e.target.value)} placeholder="Your Game Roadmap" />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            className={`${inputCls} resize-none h-16`}
            value={data.roadmapDescription}
            onChange={(e) => set("roadmapDescription", e.target.value)}
            placeholder="What we're working on next. This list isn't final."
          />
        </Field>
        <Field label="Logo URL">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.03] shrink-0 overflow-hidden flex items-center justify-center">
              {data.roadmapLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.roadmapLogoUrl} alt="" className="w-full h-full object-contain" />
              ) : (
                <span className="text-[10px] text-zinc-500">Logo</span>
              )}
            </div>
            <input className={inputCls} value={data.roadmapLogoUrl} onChange={(e) => set("roadmapLogoUrl", e.target.value)} placeholder="https://…/logo.png" />
          </div>
        </Field>
      </Section>

      <Section title="Footer links">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Website">
            <input className={inputCls} value={data.roadmapWebsiteUrl} onChange={(e) => set("roadmapWebsiteUrl", e.target.value)} placeholder="yourgame.com" />
          </Field>
          <Field label="Discord">
            <input className={inputCls} value={data.roadmapDiscordUrl} onChange={(e) => set("roadmapDiscordUrl", e.target.value)} placeholder="discord.gg/…" />
          </Field>
        </div>
      </Section>
    </SettingsDrawer>
  );
}
