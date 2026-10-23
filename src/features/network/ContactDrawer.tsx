"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOut, Trash, X } from "@phosphor-icons/react";
import { NICHES, PLATFORM_KEYS, STAGES, TIERS, contactHref, platformOf, type Contact } from "./networkMeta";

type Draft = Omit<Contact, "id" | "scopeId" | "createdAt" | "updatedAt">;
const EMPTY: Draft = { name: "", role: "YouTube", tier: "<10K", niche: "", contact: "", status: "New", notes: "" };

const field = "w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/25";
const label = "block text-xs font-medium text-zinc-500 mb-1.5";

type Props = {
  contact: Contact | null; // null = new contact
  onClose: () => void;
  onSave: (draft: Draft) => Promise<void>;
  onDelete?: () => Promise<void>;
};

/** Side panel to add or edit one contact. Writes once on Save instead of on every keystroke. */
export function ContactDrawer({ contact, onClose, onSave, onDelete }: Props) {
  const [d, setD] = useState<Draft>(contact ? { ...EMPTY, ...contact } : EMPTY);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setD(contact ? { ...EMPTY, ...contact } : EMPTY), [contact]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v }));
  const href = contactHref(d.contact);
  const P = platformOf(d.role);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.name.trim()) return;
    setBusy(true);
    try {
      await onSave({ ...d, name: d.name.trim(), contact: d.contact.trim(), niche: (d.niche || "").trim(), notes: d.notes.trim() });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <form onSubmit={save} className="relative w-full max-w-md h-full overflow-y-auto bg-[#111114] border-l border-white/10 shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#111114]/95 backdrop-blur">
          <p className="text-sm font-medium text-white">{contact ? "Edit contact" : "New contact"}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06]" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          <div>
            <label className={label}>Name</label>
            <input className={field} value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Creator, outlet or studio" autoFocus required maxLength={120} />
          </div>

          <div>
            <label className={label}>Platform</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_KEYS.map((k) => {
                const p = platformOf(k);
                const on = d.role === k;
                return (
                  <button
                    type="button"
                    key={k}
                    onClick={() => set("role", k)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors ${on ? p.badge : "border-white/10 text-zinc-400 hover:text-zinc-200"}`}
                  >
                    <p.icon size={13} weight={on ? "fill" : "regular"} /> {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Audience</label>
              <select className={field} value={d.tier} onChange={(e) => set("tier", e.target.value)}>
                {TIERS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Niche</label>
              <input className={field} list="pp-niches" value={d.niche} onChange={(e) => set("niche", e.target.value)} placeholder="e.g. Roguelike" maxLength={60} />
              <datalist id="pp-niches">
                {NICHES.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className={label}>Email, link or handle</label>
            <div className="flex gap-2">
              <input className={field} value={d.contact} onChange={(e) => set("contact", e.target.value)} placeholder="name@studio.com or https://…" maxLength={300} />
              {href && (
                <a href={href} target={href.startsWith("mailto:") ? "_self" : "_blank"} rel="noopener noreferrer" className="shrink-0 inline-flex items-center px-2.5 rounded-md border border-white/10 text-zinc-400 hover:text-white" title="Open">
                  <ArrowSquareOut size={15} />
                </a>
              )}
            </div>
          </div>

          <div>
            <label className={label}>Stage</label>
            <div className="grid grid-cols-3 gap-1.5">
              {STAGES.map((s) => (
                <button
                  type="button"
                  key={s.key}
                  onClick={() => set("status", s.key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-colors ${d.status === s.key ? s.tone : "border-white/10 text-zinc-400 hover:text-zinc-200"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={label}>Notes</label>
            <textarea className={`${field} min-h-[120px] resize-y`} value={d.notes} onChange={(e) => set("notes", e.target.value)} placeholder={`What you talked about, rates, deadlines…`} maxLength={2000} />
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 px-5 py-3 border-t border-white/10 bg-[#111114]">
          {onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-400">Delete {d.name || "this contact"}?</span>
                <button type="button" onClick={() => onDelete().then(onClose)} className="px-2 py-1 rounded-md bg-red-500/90 text-white font-medium hover:bg-red-500">
                  Delete
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-zinc-400 hover:text-white">
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-300">
                <Trash size={14} /> Delete
              </button>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
              <P.icon size={13} /> {P.label}
            </span>
          )}
          <button type="submit" disabled={busy || !d.name.trim()} className="px-4 py-2 rounded-md bg-[#FAFAFA] text-black text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50">
            {busy ? "Saving…" : contact ? "Save" : "Add contact"}
          </button>
        </div>
      </form>
    </div>
  );
}
