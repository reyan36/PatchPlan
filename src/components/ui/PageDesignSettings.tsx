"use client";

import { useEffect, useState } from "react";
import { Check, LinkSimple, X } from "@phosphor-icons/react";
import {
  ACCENT_PRESETS,
  NEWS_THEMES,
  SIGNUP_STYLES,
  designFields,
  designShared,
  onAccent,
  pageDesign,
  type DesignPage,
  type NewsTheme,
  type PageDesign,
  type SignupStyle,
} from "@/lib/newsTheme";

// Shared building blocks for the News and Roadmap page settings drawers.

export const inputCls =
  "w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors";

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[13px] font-semibold text-[#FAFAFA]">{title}</h3>
        {hint && <p className="text-xs text-zinc-400 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

/** Right-hand drawer used by the public page settings. */
export function SettingsDrawer({
  title,
  subtitle,
  onClose,
  onSave,
  saving,
  saved,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
            <h2 className="text-sm font-semibold text-[#FAFAFA]">{title}</h2>
            <p className="text-[11px] text-zinc-400">{subtitle}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            <X size={16} weight="bold" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">{children}</div>
        <footer className="flex items-center justify-end gap-2 px-6 h-16 border-t border-white/10 shrink-0 bg-[#0a0a0a]">
          <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button
            onClick={onSave}
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

/** A row of colour swatches plus a hex field. `empty` adds a first swatch that means "use the default". */
function ColorPicker({ value, onChange, fallback, empty }: { value: string; onChange: (v: string) => void; fallback: string; empty?: string }) {
  const current = (value || fallback).toLowerCase();
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {empty && (
        <button
          type="button"
          onClick={() => onChange("")}
          title={empty}
          className={`h-7 px-2.5 rounded-full border text-[11px] font-medium transition-colors ${!value ? "border-white/50 text-white bg-white/[0.08]" : "border-white/15 text-zinc-400 hover:text-white"}`}
        >
          {empty}
        </button>
      )}
      {ACCENT_PRESETS.map((c) => {
        const active = !!(value || !empty) && current === c.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${active ? "ring-2 ring-white/60 ring-offset-2 ring-offset-[#0a0a0a]" : ""}`}
            style={{ background: c }}
            title={c}
          >
            {active && <Check size={12} weight="bold" color={onAccent(c)} />}
          </button>
        );
      })}
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={fallback} className={`${inputCls} !w-28 font-mono text-xs`} />
    </div>
  );
}

/** Tiny picture of each sign-up style, drawn in the chosen colours. */
function SignupPreview({ style, color, bg, fg }: { style: SignupStyle; color: string; bg: string; fg: string }) {
  const line = (w: string, c = fg, o = 0.7) => <div className="h-1 rounded-full" style={{ width: w, background: c, opacity: o }} />;
  const form = (btn = color) => (
    <div className="flex gap-1 items-center">
      <div className="h-2.5 flex-1 rounded-[3px] border" style={{ borderColor: `color-mix(in srgb, ${fg} 30%, transparent)` }} />
      <div className="h-2.5 w-5 rounded-[3px]" style={{ background: btn }} />
    </div>
  );
  if (style === "bold") {
    const on = onAccent(color);
    return (
      <div className="h-full w-full rounded-md p-2 flex flex-col justify-center gap-1.5" style={{ background: color }}>
        <div className="h-1.5 w-3/4 rounded-full" style={{ background: on }} />
        {line("55%", on, 0.6)}
        <div className="flex gap-1 items-center">
          <div className="h-2.5 flex-1 rounded-[3px] border" style={{ borderColor: `color-mix(in srgb, ${on} 40%, transparent)` }} />
          <div className="h-2.5 w-5 rounded-[3px]" style={{ background: on }} />
        </div>
      </div>
    );
  }
  if (style === "card") {
    return (
      <div className="h-full w-full rounded-md p-1.5 flex items-center justify-center" style={{ background: bg }}>
        <div className="w-[78%] rounded border overflow-hidden" style={{ borderColor: `color-mix(in srgb, ${fg} 18%, transparent)` }}>
          <div className="h-0.5" style={{ background: color }} />
          <div className="p-1.5 flex flex-col items-center gap-1">
            <div className="h-2 w-2 rounded-full" style={{ background: color, opacity: 0.8 }} />
            {line("60%")}
            <div className="w-full">{form()}</div>
          </div>
        </div>
      </div>
    );
  }
  if (style === "minimal") {
    return (
      <div className="h-full w-full rounded-md p-2 flex items-center gap-2" style={{ background: bg }}>
        <div className="w-2/5">{line("100%", fg, 0.45)}</div>
        <div className="flex-1">{form()}</div>
      </div>
    );
  }
  return (
    <div className="h-full w-full rounded-md p-2 flex items-center gap-2" style={{ background: bg }}>
      <div className="w-2/5 space-y-1">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
          {line("70%", fg, 0.9)}
        </div>
        {line("90%", fg, 0.4)}
      </div>
      <div className="flex-1">{form()}</div>
    </div>
  );
}

/**
 * Theme, accent and email sign-up controls, plus the switch that keeps News and Roadmap on one design.
 * While shared, edits from either page's settings apply to both.
 */
export function DesignEditor({
  page,
  design,
  onChange,
  shared,
  onSharedChange,
}: {
  page: DesignPage;
  design: PageDesign;
  onChange: (d: PageDesign) => void;
  shared: boolean;
  onSharedChange: (shared: boolean) => void;
}) {
  const set = <K extends keyof PageDesign>(key: K, value: PageDesign[K]) => onChange({ ...design, [key]: value });
  const theme = NEWS_THEMES[design.theme] || NEWS_THEMES.dark;
  const accent = design.accent || theme.defaultAccent;
  const signupColor = design.signupColor || accent;
  const other = page === "news" ? "Roadmap" : "News";

  return (
    <>
      <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${shared ? "border-white/25 bg-white/[0.05]" : "border-white/10 hover:border-white/20"}`}>
        <input type="checkbox" checked={shared} onChange={(e) => onSharedChange(e.target.checked)} className="mt-0.5 accent-white" />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#FAFAFA]">
            <LinkSimple size={13} weight="bold" /> Same design on News and Roadmap
          </span>
          <span className="block text-xs text-zinc-400 mt-0.5">
            {shared
              ? `Theme, accent and email sign-up changes here also apply to your ${other} page.`
              : `This page has its own design. Tick to match your ${other} page again.`}
          </span>
        </span>
      </label>

      <Section title="Theme">
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(NEWS_THEMES) as NewsTheme[]).map((key) => {
            const t = NEWS_THEMES[key];
            const active = design.theme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => set("theme", key)}
                className={`rounded-lg border p-1.5 transition-all ${active ? "border-white/40" : "border-white/10 hover:border-white/20"}`}
              >
                <div className="h-10 rounded-md flex items-end p-1.5 gap-1" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
                  <div className="h-1.5 w-6 rounded-full" style={{ background: t.fg, opacity: 0.8 }} />
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: design.accent || t.defaultAccent }} />
                </div>
                <div className="text-[11px] font-medium text-[#FAFAFA] mt-1.5 text-center">{t.label}</div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Accent color" hint="Used for links, tags and buttons.">
        <ColorPicker value={design.accent} onChange={(v) => set("accent", v)} fallback={theme.defaultAccent} />
      </Section>

      <Section title="Email sign-up" hint="The “Get updates by email” section at the bottom of the page.">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SIGNUP_STYLES) as SignupStyle[]).map((key) => {
            const active = design.signupStyle === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => set("signupStyle", key)}
                className={`text-left rounded-lg border p-2 transition-all ${active ? "border-white/40 bg-white/[0.06]" : "border-white/10 hover:border-white/20 bg-white/[0.02]"}`}
              >
                <div className="h-14 mb-2">
                  <SignupPreview style={key} color={signupColor} bg={theme.bg} fg={theme.fg} />
                </div>
                <div className="text-xs font-medium text-[#FAFAFA]">{SIGNUP_STYLES[key].label}</div>
                <div className="text-[11px] text-zinc-400 leading-snug">{SIGNUP_STYLES[key].description}</div>
              </button>
            );
          })}
        </div>
        <Field label="Sign-up color">
          <ColorPicker value={design.signupColor} onChange={(v) => set("signupColor", v)} fallback={accent} empty="Accent" />
        </Field>
      </Section>
    </>
  );
}

/**
 * Design state for one page's settings drawer, loaded from its public_configs doc (`cfg`).
 * `fields()` returns what to save, keeping the News/Roadmap link consistent.
 */
export function usePageDesign(page: DesignPage, cfg: Record<string, any> | null) {
  const [design, setDesign] = useState<PageDesign>(() => pageDesign({}, page));
  const [shared, setSharedState] = useState(true);

  useEffect(() => {
    if (!cfg) return;
    setDesign(pageDesign(cfg, page));
    setSharedState(designShared(cfg));
  }, [cfg, page]);

  const setShared = (on: boolean) => {
    setSharedState(on);
    // Re-linking the roadmap shows the News design it will now use.
    if (on && page === "roadmap") setDesign(pageDesign({ ...(cfg || {}), designShared: true }, "roadmap"));
  };

  const fields = (): Record<string, unknown> => {
    // While shared, the News fields are the one design both pages read.
    if (shared) return { designShared: true, ...designFields("news", design) };
    const wasShared = !cfg || designShared(cfg);
    // Unlinking from News: the roadmap keeps looking the way it did, News takes the new design.
    if (wasShared && page === "news") return { designShared: false, ...designFields("news", design), ...designFields("roadmap", pageDesign(cfg || {}, "news")) };
    return { designShared: false, ...designFields(page, design) };
  };

  return { design, setDesign, shared, setShared, fields };
}
