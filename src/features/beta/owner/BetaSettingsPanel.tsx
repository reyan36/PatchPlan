"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOut, Check, Copy, Globe, LockSimple } from "@phosphor-icons/react";
import { Button, ErrorNote, Panel, inputClass } from "@/features/ai/ui";
import { betaApi } from "@/lib/beta/client";
import { LIMITS } from "@/lib/beta/types";

export type BetaSettings = { open: boolean; intro: string; instructions: string; build: string; slug: string };

export function betaLink(slug: string) {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/p/beta/${encodeURIComponent(slug)}`;
}

export function CopyLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = betaLink(slug);
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 min-w-0 truncate rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-300">{url}</code>
      <Button
        variant="ghost"
        onClick={() => {
          navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
      </Button>
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.04]">
        <ArrowSquareOut size={13} /> Open
      </a>
    </div>
  );
}

export function BetaSettingsPanel({ scopeId, settings, onSaved }: { scopeId: string; settings: BetaSettings; onSaved: (s: BetaSettings) => void }) {
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setForm(settings), [settings]);

  const dirty = JSON.stringify(form) !== JSON.stringify(settings);
  const set = <K extends keyof BetaSettings>(k: K, v: BetaSettings[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await betaApi("POST", { action: "settings", scopeId, ...form });
      onSaved(form);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <Panel className="p-5 space-y-6">
        <label className="flex items-start justify-between gap-4 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-white">Accept new testers</p>
            <p className="text-xs text-zinc-500 mt-0.5">When off, the beta page stops taking requests. Approved testers can still sign in and report issues.</p>
          </div>
          <input type="checkbox" checked={form.open} onChange={(e) => set("open", e.target.checked)} className="mt-1 h-4 w-4 accent-[#c8ff00]" />
        </label>

        <div>
          <p className="text-sm font-medium text-white flex items-center gap-1.5">
            <Globe size={14} className="text-zinc-500" /> Intro (public)
          </p>
          <p className="text-xs text-zinc-500 mt-0.5 mb-2">Shown to everyone on the beta page. Say what you&apos;re testing and who you&apos;re looking for.</p>
          <textarea
            className={`${inputClass} min-h-[90px]`}
            maxLength={LIMITS.intro}
            placeholder="We're testing the first two chapters. Looking for players on PC and Steam Deck who can play for an hour a week."
            value={form.intro}
            onChange={(e) => set("intro", e.target.value)}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-white flex items-center gap-1.5">
            <LockSimple size={14} className="text-zinc-500" /> Instructions for approved testers
          </p>
          <p className="text-xs text-zinc-500 mt-0.5 mb-2">Only approved testers see this: how to get the build (Steam playtest, itch.io link, TestFlight), what to focus on, known issues.</p>
          <textarea
            className={`${inputClass} min-h-[120px]`}
            maxLength={LIMITS.instructions}
            placeholder={"Download: https://…\nPassword: …\nFocus on: the new crafting menu and chapter 2 boss."}
            value={form.instructions}
            onChange={(e) => set("instructions", e.target.value)}
          />
        </div>

        <div className="max-w-xs">
          <p className="text-sm font-medium text-white">Current build</p>
          <p className="text-xs text-zinc-500 mt-0.5 mb-2">Pre-filled on new reports so you know which version they&apos;re about.</p>
          <input className={inputClass} maxLength={LIMITS.build} placeholder="0.4.2" value={form.build} onChange={(e) => set("build", e.target.value)} />
        </div>

        <ErrorNote message={error} />
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={busy} disabled={!dirty}>
            Save
          </Button>
          {saved && !dirty && <span className="text-xs text-emerald-400">Saved</span>}
        </div>
      </Panel>

      <Panel className="p-5 space-y-3">
        <p className="text-sm font-medium text-white">Beta page</p>
        <p className="text-xs text-zinc-500">Share this link on Discord, Steam or your newsletter. Testers sign up there and you approve them in Testers.</p>
        <CopyLink slug={settings.slug} />
        {!settings.open && <p className="text-xs text-amber-300/90">Turn on &quot;Accept new testers&quot; and save so people can request access.</p>}
      </Panel>
    </div>
  );
}
