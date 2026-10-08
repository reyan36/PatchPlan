"use client";

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ChevronDown } from "lucide-react";

type NewsSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
};

export function NewsSettingsModal({ isOpen, onClose, scopeId }: NewsSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    newsHeading: "",
    newsStudioName: "",
    newsLogoUrl: "",
    newsWebsiteUrl: "",
    newsDiscordUrl: "",
    newsTheme: "dark",
    newsTemplate: "standard"
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
    <Modal isOpen={isOpen} onClose={onClose} title="News Page Settings">
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Global branding */}
        <div className="space-y-4 border-b border-border pb-6">
          <h3 className="font-semibold text-foreground">Global Branding</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Theme (Color Scheme)</label>
            <div className="relative">
            <select 
              value={data.newsTheme || 'dark'} 
              onChange={e => setData({...data, newsTheme: e.target.value})}
              className="w-full bg-background border border-border rounded-md pl-4 pr-10 py-2 focus:border-primary focus:outline-none appearance-none"
            >
              <option value="dark">Classic Dark</option>
              <option value="midnight">Deep Midnight (Blueish)</option>
              <option value="cyberpunk">Cyberpunk (Neon/Yellow)</option>
              <option value="minimal">Minimal Light</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Webpage Template</label>
            <div className="relative">
            <select 
              value={data.newsTemplate || 'standard'} 
              onChange={e => setData({...data, newsTemplate: e.target.value})}
              className="w-full bg-background border border-border rounded-md pl-4 pr-10 py-2 focus:border-primary focus:outline-none appearance-none"
            >
              <option value="standard">Standard Modern</option>
              <option value="gaming">Gaming Blog (Zomboid Style)</option>
              <option value="editorial">Editorial (Minimal Text-heavy)</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Studio Name</label>
            <input 
              type="text" 
              value={data.newsStudioName || ""} 
              onChange={e => setData({...data, newsStudioName: e.target.value})}
              placeholder="e.g. Ramjet Studios"
              className="w-full bg-background border border-border rounded-md pl-4 pr-10 py-2 focus:border-primary focus:outline-none appearance-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Studio Logo URL</label>
            <input 
              type="text" 
              value={data.newsLogoUrl || ""} 
              onChange={e => setData({...data, newsLogoUrl: e.target.value})}
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
            <input type="text" value={data.newsWebsiteUrl || ""} onChange={e => setData({...data, newsWebsiteUrl: e.target.value})} placeholder="e.g. ramjetstudios.com" className="w-full bg-background border border-border rounded-md pl-4 pr-10 py-2 focus:border-primary focus:outline-none appearance-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Discord URL</label>
            <input type="text" value={data.newsDiscordUrl || ""} onChange={e => setData({...data, newsDiscordUrl: e.target.value})} placeholder="e.g. discord.gg/..." className="w-full bg-background border border-border rounded-md pl-4 pr-10 py-2 focus:border-primary focus:outline-none appearance-none" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Page Text</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Custom News Heading</label>
            <input type="text" value={data.newsHeading || ""} onChange={e => setData({...data, newsHeading: e.target.value})} placeholder="e.g. VEIN News" className="w-full bg-background border border-border rounded-md pl-4 pr-10 py-2 focus:border-primary focus:outline-none appearance-none" />
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







