"use client";

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { CaretDown } from "@phosphor-icons/react";

type RoadmapSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
};

export function RoadmapSettingsModal({ isOpen, onClose, scopeId }: RoadmapSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    roadmapHeading: "",
    roadmapDescription: "",
    roadmapStudioName: "",
    roadmapLogoUrl: "",
    roadmapWebsiteUrl: "",
    roadmapDiscordUrl: "",
    roadmapTheme: "dark"
  });

  useEffect(() => {
    if (!isOpen || !scopeId) return;
    const load = async () => {
      const docSnap = await getDoc(doc(db, "public_configs", scopeId));
      if (docSnap.exists()) {
        setData(prev => ({ ...prev, ...docSnap.data() }));
      }
    };
    load();
  }, [isOpen, scopeId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, "public_configs", scopeId), data, { merge: true });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Roadmap Page Settings">
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Global branding */}
        <div className="space-y-4 border-b border-border pb-6">
          <h3 className="font-semibold text-foreground">Global Branding</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Theme (Color Scheme)</label>
            <div className="relative">            <select 
              value={data.roadmapTheme || 'dark'} 
              onChange={e => setData({...data, roadmapTheme: e.target.value})}
              className="w-full bg-background border border-border rounded-md pl-4 pr-10 py-2 focus:border-primary focus:outline-none appearance-none"
            >
              <option value="dark">Classic Dark</option>
              <option value="midnight">Deep Midnight (Blueish)</option>
              <option value="cyberpunk">Cyberpunk (Neon/Yellow)</option>
              <option value="minimal">Minimal Light</option>
            </select>            <CaretDown size={14} weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />          </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Studio Name</label>
            <input 
              type="text" 
              value={data.roadmapStudioName || ""} 
              onChange={e => setData({...data, roadmapStudioName: e.target.value})}
              placeholder="e.g. Your Studio"
              className="w-full bg-background border border-border rounded-md pl-4 pr-10 py-2 focus:border-primary focus:outline-none appearance-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Studio Logo URL</label>
            <input 
              type="text" 
              value={data.roadmapLogoUrl || ""} 
              onChange={e => setData({...data, roadmapLogoUrl: e.target.value})}
              placeholder="https://..."
              className="w-full bg-background border border-border rounded-md pl-4 pr-10 py-2 focus:border-primary focus:outline-none appearance-none" 
            />
          </div>
        </div>

        {/* Links */}
        <div className="space-y-4 border-b border-border pb-6">
          <h3 className="font-semibold text-foreground">Footer Links</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Website URL</label>
            <input type="text" value={data.roadmapWebsiteUrl || ""} onChange={e => setData({...data, roadmapWebsiteUrl: e.target.value})} placeholder="e.g. yourstudio.com" className="w-full bg-background border border-border rounded-md pl-4 pr-10 py-2 focus:border-primary focus:outline-none appearance-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Discord URL</label>
            <input type="text" value={data.roadmapDiscordUrl || ""} onChange={e => setData({...data, roadmapDiscordUrl: e.target.value})} placeholder="e.g. discord.gg/..." className="w-full bg-background border border-border rounded-md pl-4 pr-10 py-2 focus:border-primary focus:outline-none appearance-none" />
          </div>
        </div>

        {/* Headings */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Page Text</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Custom Roadmap Heading</label>
            <input type="text" value={data.roadmapHeading || ""} onChange={e => setData({...data, roadmapHeading: e.target.value})} placeholder="e.g. Your Game Roadmap" className="w-full bg-background border border-border rounded-md pl-4 pr-10 py-2 focus:border-primary focus:outline-none appearance-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Roadmap Description</label>
            <textarea value={data.roadmapDescription || ""} onChange={e => setData({...data, roadmapDescription: e.target.value})} placeholder="Short description underneath roadmap heading..." className="w-full bg-background border border-border rounded-md px-4 py-2 focus:border-primary focus:outline-none h-20" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90">{loading ? 'Saving...' : 'Save Settings'}</button>
        </div>
      </form>
    </Modal>
  );
}




