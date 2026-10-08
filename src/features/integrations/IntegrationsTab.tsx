"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { MessageSquare, Save, CheckCircle } from "lucide-react";

export function IntegrationsTab() {
  const { user } = useAuth();
  const { activeFamily } = useFamily();
  const scopeId = activeFamily ? activeFamily.id : user?.uid;

  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!scopeId) return;
    const fetchIntegrations = async () => {
      const docSnap = await getDoc(doc(db, "integrations", scopeId));
      if (docSnap.exists()) {
        setWebhookUrl(docSnap.data().discordWebhookUrl || "");
      }
      setLoading(false);
    };
    fetchIntegrations();
  }, [scopeId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scopeId) return;
    
    setSaving(true);
    try {
      await setDoc(doc(db, "integrations", scopeId), {
        discordWebhookUrl: webhookUrl
      }, { merge: true });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl) return;
    
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: "✅ Discord Integration Connected!",
            description: "PatchPlan will now send updates to this channel.",
            color: 3447003, // Blue
            footer: {
              text: "PatchPlan Integration System"
            }
          }]
        })
      });
    } catch (err) {
      console.error("Test failed", err);
    }
  };

  if (loading) return <div className="p-6 animate-pulse bg-card rounded-lg border border-border h-32" />;

  return (
    <section className="bg-card border border-border rounded-lg p-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#5865F2]/10 flex items-center justify-center text-[#5865F2]">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Discord Integration</h2>
          <p className="text-sm text-muted-foreground">Send automated notifications to a Discord channel.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Discord Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="flex-1 bg-background border border-border rounded-md px-4 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Create a Webhook in your Discord Server Settings {`>`} Integrations {`>`} Webhooks, and paste the URL here.
          </p>
        </div>

        <div className="pt-4 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 flex items-center gap-2"
          >
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Webhook"}
          </button>

          {webhookUrl && (
            <button
              type="button"
              onClick={testWebhook}
              className="px-4 py-2 border border-[#5865F2]/50 text-[#5865F2] hover:bg-[#5865F2]/10 rounded-md text-sm font-medium transition-colors"
            >
              Send Test Message
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
