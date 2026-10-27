"use client";

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { db } from "@/lib/firebase";
import { refreshPublicPages } from "@/lib/publicRefresh";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { LinkSimple, Globe, Clock, CheckCircle, Trash } from "@phosphor-icons/react";

type ShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
  sharePath: string; // e.g. "/p/roadmap"
  title: string;
};

export function ShareModal({ isOpen, onClose, scopeId, sharePath, title }: ShareModalProps) {
  const [expiresIn, setExpiresIn] = useState<string>("never");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // State for tracking active link
  const [activeExpiry, setActiveExpiry] = useState<number | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const fieldName = sharePath.includes('roadmap') ? 'roadmapExpiresAt' : 'newsExpiresAt';
  const slugField = sharePath.includes('roadmap') ? 'roadmapSlug' : 'newsSlug';

  // Dynamic URL based on activeSlug or scopeId fallback
  const fullUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${sharePath}/${activeSlug || scopeId}` 
    : '';

  useEffect(() => {
    if (!isOpen || !scopeId) return;
    const fetchStatus = async () => {
      setIsFetching(true);
      const docSnap = await getDoc(doc(db, "public_configs", scopeId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const expiresAt = data[fieldName];
        const slug = data[slugField];

        if (slug) setActiveSlug(slug);

        if (expiresAt === null || expiresAt === -1 || expiresAt > Date.now()) {
           setActiveExpiry(expiresAt); 
        } else {
           setActiveExpiry(0); 
        }
      } else {
        setActiveExpiry(0);
      refreshPublicPages(scopeId);
      }
      setIsFetching(false);
    };
    fetchStatus();
  }, [isOpen, scopeId, fieldName, slugField]);

  const generateLink = async () => {
    setLoading(true);
    try {
      let expiresAt = -1; // -1 for permanent
      if (expiresIn === '24h') expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      if (expiresIn === '7d') expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      
      const newSlug = Math.random().toString(36).substring(2, 10);
      
      await setDoc(doc(db, "public_configs", scopeId), {
        [fieldName]: expiresAt,
        [slugField]: newSlug
      }, { merge: true });

      setActiveExpiry(expiresAt);
      refreshPublicPages(scopeId);
      setActiveSlug(newSlug);

      const newUrl = `${window.location.origin}${sharePath}/${newSlug}`;
      navigator.clipboard.writeText(newUrl);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const revokeLink = async () => {
    setLoading(true);
    try {
      // Set to 0 to instantly expire it
      await setDoc(doc(db, "public_configs", scopeId), {
        [fieldName]: 0
      }, { merge: true });
      setActiveExpiry(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const hasActive = activeExpiry === -1 || activeExpiry === null || (activeExpiry > Date.now());

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <div className="bg-muted/30 p-4 rounded-lg flex items-center gap-3">
          <Globe size={20} weight="duotone" className="text-primary shrink-0" />
          <div className="text-sm font-medium text-foreground truncate select-all">{fullUrl}</div>
        </div>
        
        {isFetching ? (
          <div className="text-sm text-muted-foreground animate-pulse">Checking link status...</div>
        ) : hasActive ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md text-sm text-green-500 flex flex-col gap-1">
              <span className="font-semibold flex items-center gap-2"><CheckCircle size={18} weight="fill" /> Link is currently active</span>
              {activeExpiry === -1 || activeExpiry === null ? (
                <span>It is set to permanent.</span>
              ) : (
                <span>Expires on {new Date(activeExpiry).toLocaleString()}</span>
              )}
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => { navigator.clipboard.writeText(fullUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                {copied ? <CheckCircle size={16} weight="fill" /> : <LinkSimple size={16} weight="bold" />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button 
                onClick={revokeLink}
                disabled={loading}
                className="flex-1 py-2 px-4 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Trash size={16} weight="duotone" />
                Revoke Link
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-sm font-medium">Link Expiration</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setExpiresIn('never')}
                className={`p-3 rounded-md border text-sm font-medium transition-colors whitespace-nowrap ${expiresIn === 'never' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card hover:bg-muted'}`}
              >
                Permanent
              </button>
              <button
                onClick={() => setExpiresIn('7d')}
                className={`p-3 rounded-md border text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${expiresIn === '7d' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card hover:bg-muted'}`}
              >
                <Clock size={16} weight="duotone" /> 7 Days
              </button>
              <button
                onClick={() => setExpiresIn('24h')}
                className={`p-3 rounded-md border text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${expiresIn === '24h' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card hover:bg-muted'}`}
              >
                <Clock size={16} weight="duotone" /> 24 Hrs
              </button>
            </div>
            
            <div className="pt-4 flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 py-2 px-4 rounded-md border border-border hover:bg-muted text-sm font-medium transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button 
                onClick={generateLink}
                disabled={loading}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {copied ? <CheckCircle size={16} weight="fill" /> : <LinkSimple size={16} weight="bold" />}
                {copied ? "Copied!" : "Generate Link"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
