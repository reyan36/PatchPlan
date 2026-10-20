"use client";

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { Copy, Check } from "@phosphor-icons/react";
import { db } from "@/lib/firebase";
import { EMAIL_LISTS, type EmailSettings } from "@/lib/email/types";
import { Button, Panel, inputClass } from "@/features/ai/ui";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Sender identity, footer address and automatic digest schedule. Also used on the Settings page. */
export function EmailSettingsForm({ scopeId, settings, defaults, onSaved }: {
  scopeId: string;
  settings: EmailSettings;
  /** Pre-filled when the studio hasn't chosen yet: workspace name and the signed-in user's email. */
  defaults: { name: string; replyTo: string };
  onSaved?: () => void;
}) {
  const [s, setS] = useState<EmailSettings>({ ...settings, fromName: settings.fromName || defaults.name, replyTo: settings.replyTo || defaults.replyTo });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        setDoc(doc(db, "email_settings", scopeId), s, { merge: true }),
        // The public sign-up page can read public_configs (email_settings is private).
        setDoc(doc(db, "public_configs", scopeId), { emailStudioName: s.fromName.trim() }, { merge: true }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[11px] text-zinc-500">Studio name (on your emails and sign-up page)</span>
          <input className={inputClass} value={s.fromName} onChange={(e) => setS({ ...s, fromName: e.target.value })} placeholder="Your Studio" />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-zinc-500">Player replies go to</span>
          <input className={inputClass} value={s.replyTo} onChange={(e) => setS({ ...s, replyTo: e.target.value })} placeholder="hello@yourgame.com" type="email" />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-[11px] text-zinc-500">Business address for the footer (recommended; some anti-spam laws require one)</span>
          <input className={inputClass} value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} placeholder="Your Studio, 123 Main St, City, Country" />
        </label>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-zinc-300">Automatic updates</h4>
        <div className="flex items-start gap-3 rounded-lg border border-white/[0.08] p-3">
          <input type="checkbox" className="mt-1 accent-white" checked={s.weekly.enabled} onChange={(e) => setS({ ...s, weekly: { ...s.weekly, enabled: e.target.checked } })} />
          <div className="flex-1">
            <div className="text-sm text-zinc-100">{EMAIL_LISTS[0].label}</div>
            <div className="text-xs text-zinc-500">{EMAIL_LISTS[0].hint}. Sent to the weekly list on</div>
            <select className={`${inputClass} mt-2 w-auto`} value={s.weekly.day} onChange={(e) => setS({ ...s, weekly: { ...s.weekly, day: Number(e.target.value) } })}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-white/[0.08] p-3 cursor-pointer">
          <input type="checkbox" className="mt-1 accent-white" checked={s.daily.enabled} onChange={(e) => setS({ ...s, daily: { enabled: e.target.checked } })} />
          <div>
            <div className="text-sm text-zinc-100">{EMAIL_LISTS[1].label}</div>
            <div className="text-xs text-zinc-500">{EMAIL_LISTS[1].hint}. Skipped on days with nothing new.</div>
          </div>
        </label>
        <label className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer">
          <input type="checkbox" className="accent-white" checked={s.aiIntro} onChange={(e) => setS({ ...s, aiIntro: e.target.checked })} />
          Let the AI write a short intro for automatic updates
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={saving}>Save</Button>
        {saved && <span className="text-xs text-emerald-400">Saved</span>}
      </div>
    </div>
  );
}

/** Links and embed code for collecting sign-ups. */
export function SignupShare({ scopeId }: { scopeId: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const page = `${origin}/p/subscribe/${scopeId}`;
  const embed = `<iframe src="${page}?embed=1" width="100%" height="300" style="border:0;max-width:480px" title="Subscribe"></iframe>`;
  return (
    <Panel className="p-4 sm:p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Collect sign-ups</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Players can also subscribe from your public News and Roadmap pages. Share the page, or embed the form on your website or Steam page links.
        </p>
      </div>
      <CopyField label="Sign-up page" value={page} />
      <CopyField label="Embed on your website" value={embed} mono />
    </Panel>
  );
}

function CopyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <label className="block space-y-1">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <div className="flex gap-2">
        <input readOnly value={value} className={`${inputClass} ${mono ? "font-mono text-xs" : ""}`} onFocus={(e) => e.target.select()} />
        <Button
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </Button>
      </div>
    </label>
  );
}
