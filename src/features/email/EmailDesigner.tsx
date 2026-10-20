"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import {
  ArrowDown, ArrowLeft, ArrowUp, Trash, TextH, TextAlignLeft, Image as ImageIcon, CursorClick, Minus, ArrowsVertical,
  Newspaper, ListChecks, ShareNetwork, DeviceMobile, Desktop, PaperPlaneTilt, Sparkle, EnvelopeSimple, Plus,
} from "@phosphor-icons/react";
import { db } from "@/lib/firebase";
import { aiFetch } from "@/lib/ai/client";
import { emailFetch } from "@/lib/email/client";
import { renderEmail } from "@/lib/email/render";
import { EMAIL_LISTS, newBlockId, type Audience, type Campaign, type EmailBlock, type EmailBlockType, type EmailTheme } from "@/lib/email/types";
import { Button, ErrorNote, Panel, inputClass } from "@/features/ai/ui";
import { Modal } from "@/components/ui/Modal";

const BLOCKS: { type: EmailBlockType; label: string; icon: typeof TextH }[] = [
  { type: "heading", label: "Heading", icon: TextH },
  { type: "text", label: "Text", icon: TextAlignLeft },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "button", label: "Button", icon: CursorClick },
  { type: "articles", label: "News posts", icon: Newspaper },
  { type: "changelog", label: "Changelog", icon: ListChecks },
  { type: "social", label: "Social links", icon: ShareNetwork },
  { type: "divider", label: "Divider", icon: Minus },
  { type: "spacer", label: "Spacer", icon: ArrowsVertical },
];

function blankBlock(type: EmailBlockType): EmailBlock {
  const id = newBlockId();
  switch (type) {
    case "heading": return { id, type, text: "A new update" };
    case "text": return { id, type, text: "" };
    case "image": return { id, type, url: "", alt: "" };
    case "button": return { id, type, label: "Read more", url: "https://" };
    case "articles": return { id, type, items: [] };
    case "changelog": return { id, type, title: "What's new", items: [] };
    case "social": return { id, type };
    case "divider": return { id, type };
    case "spacer": return { id, type, size: 16 };
  }
}

type Props = {
  user: User;
  scopeId: string;
  studioName: string;
  address: string;
  subscriberCounts: Record<Audience, number>;
  campaign: Campaign;
  ready: boolean;
  onClose: () => void;
};

export function EmailDesigner({ user, scopeId, studioName, address, subscriberCounts, campaign, ready, onClose }: Props) {
  const [subject, setSubject] = useState(campaign.subject);
  const [preheader, setPreheader] = useState(campaign.preheader);
  const [blocks, setBlocks] = useState<EmailBlock[]>(campaign.blocks);
  const [theme, setTheme] = useState<EmailTheme>(campaign.theme);
  const [audience, setAudience] = useState<Audience>(campaign.audience);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saved, setSaved] = useState<"saved" | "saving" | "dirty">("saved");
  const [aiPrompt, setAiPrompt] = useState("");
  const [busy, setBusy] = useState<"ai" | "test" | "send" | null>(null);
  const [error, setError] = useState<string | null>(campaign.error || null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [adding, setAdding] = useState(false);
  const first = useRef(true);
  const readOnly = campaign.status !== "draft";

  // Autosave drafts.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (readOnly) return;
    setSaved("dirty");
    const t = setTimeout(async () => {
      setSaved("saving");
      await updateDoc(doc(db, "campaigns", campaign.id), { subject, preheader, blocks, theme, audience, updatedAt: serverTimestamp() });
      setSaved("saved");
    }, 700);
    return () => clearTimeout(t);
  }, [subject, preheader, blocks, theme, audience]); // eslint-disable-line react-hooks/exhaustive-deps

  const html = useMemo(
    () => renderEmail({ subject, preheader, blocks, theme, studioName, address, unsubscribeUrl: "#unsubscribe", preferencesNote: audience === "all" ? "" : `You're receiving this because you subscribed to ${studioName}'s ${audience} emails.` }),
    [subject, preheader, blocks, theme, studioName, address, audience]
  );

  const update = (id: string, patch: Partial<EmailBlock>) => setBlocks((bs) => bs.map((b) => (b.id === id ? ({ ...b, ...patch } as EmailBlock) : b)));
  const move = (i: number, d: number) => setBlocks((bs) => {
    const next = [...bs];
    const j = i + d;
    if (j < 0 || j >= next.length) return bs;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const flush = () => updateDoc(doc(db, "campaigns", campaign.id), { subject, preheader, blocks, theme, audience, updatedAt: serverTimestamp() });

  const writeWithAI = async () => {
    setError(null);
    setBusy("ai");
    try {
      const context = blocks.map((b) => ("text" in b ? b.text : b.type === "changelog" ? b.items.join("; ") : b.type === "button" ? `${b.label}: ${b.url}` : "")).filter(Boolean).join("\n");
      const r = await aiFetch<{ subject: string; preheader: string; blocks: EmailBlock[] }>("email-draft", { prompt: aiPrompt, studioName, context });
      // Keep news, images and social blocks the studio already placed; replace the copy.
      const kept = blocks.filter((b) => ["articles", "image", "social"].includes(b.type));
      setBlocks([...r.blocks, ...kept]);
      if (r.subject) setSubject(r.subject);
      if (r.preheader) setPreheader(r.preheader);
      setAiPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI couldn't write that.");
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setError(null);
    setNotice(null);
    setBusy("test");
    try {
      await flush();
      const r = await emailFetch<{ sentTo: string }>("send", { campaignId: campaign.id, test: true });
      setNotice(`Test sent to ${r.sentTo}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test send failed.");
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    setConfirmSend(false);
    setError(null);
    setBusy("send");
    try {
      await flush();
      const r = await emailFetch<{ sent: number }>("send", { campaignId: campaign.id });
      setNotice(`Sent to ${r.sent} subscriber${r.sent === 1 ? "" : "s"}.`);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setBusy(null);
    }
  };

  const recipients = subscriberCounts[audience] ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={14} /> Campaigns
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-600 mr-1">{readOnly ? `Sent to ${campaign.recipients ?? 0}` : saved === "saved" ? "Saved" : "Saving…"}</span>
          {!readOnly && (
            <>
              <Button variant="ghost" onClick={sendTest} loading={busy === "test"} disabled={!ready}>Send test</Button>
              <Button onClick={() => setConfirmSend(true)} loading={busy === "send"} disabled={!ready || !subject.trim() || !blocks.length || !recipients}>
                <PaperPlaneTilt size={13} weight="bold" /> Send
              </Button>
            </>
          )}
        </div>
      </div>

      <ErrorNote message={error} />
      {notice && <p className="text-xs text-emerald-400">{notice}</p>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-5 items-start">
        {/* Editor */}
        <fieldset disabled={readOnly} className="space-y-4 min-w-0">
          <Panel className="p-4 space-y-3">
            <label className="block space-y-1">
              <span className="text-[11px] text-zinc-500">Subject</span>
              <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Update 2.2 is live" />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] text-zinc-500">Preview text (shown after the subject in the inbox)</span>
              <input className={inputClass} value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder="New boss, parry tuning and 14 fixes" />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] text-zinc-500">Send to</span>
              <select className={inputClass} value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
                <option value="all">All active subscribers ({subscriberCounts.all ?? 0})</option>
                {EMAIL_LISTS.map((l) => <option key={l.key} value={l.key}>{l.label} list ({subscriberCounts[l.key] ?? 0})</option>)}
              </select>
            </label>
          </Panel>

          {!readOnly && (
            <Panel className="p-3 flex gap-2">
              <Sparkle size={16} weight="fill" className="text-[#c8ff00] shrink-0 mt-2" />
              <input
                className={inputClass}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && aiPrompt.trim() && writeWithAI()}
                placeholder="Write it with AI: “announce our Steam Next Fest demo”"
              />
              <Button variant="ghost" onClick={writeWithAI} loading={busy === "ai"} disabled={!aiPrompt.trim()}>Write</Button>
            </Panel>
          )}

          <div className="space-y-2">
            {blocks.map((b, i) => (
              <BlockEditor key={b.id} block={b} scopeId={scopeId} onChange={(p) => update(b.id, p)} onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => setBlocks((bs) => bs.filter((x) => x.id !== b.id))} />
            ))}
            {!readOnly && (
              adding ? (
                <Panel className="p-2 grid grid-cols-3 gap-1">
                  {BLOCKS.map((t) => (
                    <button key={t.type} onClick={() => { setBlocks((bs) => [...bs, blankBlock(t.type)]); setAdding(false); }} className="flex flex-col items-center gap-1 py-2.5 rounded-md text-[11px] text-zinc-400 hover:bg-white/[0.05] hover:text-white">
                      <t.icon size={16} weight="duotone" />
                      {t.label}
                    </button>
                  ))}
                </Panel>
              ) : (
                <button onClick={() => setAdding(true)} className="w-full rounded-xl border border-dashed border-white/10 py-3 text-xs text-zinc-500 hover:text-zinc-200 hover:border-white/25 inline-flex items-center justify-center gap-1.5">
                  <Plus size={12} weight="bold" /> Add block
                </button>
              )
            )}
          </div>

          <Panel className="p-4 space-y-3">
            <h4 className="text-xs font-semibold text-zinc-300">Style</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="space-y-1">
                <span className="text-[11px] text-zinc-500">Accent</span>
                <div className="flex items-center gap-2">
                  <input type="color" value={theme.accent} onChange={(e) => setTheme({ ...theme, accent: e.target.value })} className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                  <span className="text-xs text-zinc-500 font-mono">{theme.accent}</span>
                </div>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-zinc-500">Background</span>
                <select className={inputClass} value={theme.mode} onChange={(e) => setTheme({ ...theme, mode: e.target.value as EmailTheme["mode"] })}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-zinc-500">Font</span>
                <select className={inputClass} value={theme.font} onChange={(e) => setTheme({ ...theme, font: e.target.value as EmailTheme["font"] })}>
                  <option value="sans">Sans</option>
                  <option value="serif">Serif</option>
                </select>
              </label>
              <label className="space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-zinc-500">Logo URL</span>
                <input className={inputClass} value={theme.logoUrl || ""} onChange={(e) => setTheme({ ...theme, logoUrl: e.target.value })} placeholder="https://…" />
              </label>
            </div>
          </Panel>
        </fieldset>

        {/* Preview */}
        <div className="lg:sticky lg:top-20 space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-500 min-w-0">
              <EnvelopeSimple size={14} />
              <span className="truncate"><span className="text-zinc-300">{subject || "No subject"}</span> · {preheader}</span>
            </div>
            <div className="flex gap-1 shrink-0">
              {(["desktop", "mobile"] as const).map((d) => (
                <button key={d} onClick={() => setDevice(d)} className={`p-1.5 rounded-md ${device === d ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"}`} title={d}>
                  {d === "desktop" ? <Desktop size={14} /> : <DeviceMobile size={14} />}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden flex justify-center">
            <iframe
              title="Email preview"
              srcDoc={html}
              sandbox=""
              className="h-[640px] bg-white transition-all duration-300"
              style={{ width: device === "mobile" ? 375 : "100%" }}
            />
          </div>
        </div>
      </div>

      <Modal isOpen={confirmSend} onClose={() => setConfirmSend(false)} title="Send this email?">
        <p className="text-sm text-zinc-400 mb-1">
          “{subject}” goes to <span className="text-white font-medium">{recipients}</span> {audience === "all" ? "active subscribers" : `subscribers on the ${audience} list`}.
        </p>
        <p className="text-xs text-zinc-500 mb-5">This can&apos;t be undone. Send yourself a test first if you haven&apos;t.</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmSend(false)} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white">Cancel</button>
          <button onClick={send} className="px-3 py-1.5 text-sm rounded-md bg-[#FAFAFA] text-black font-medium hover:bg-zinc-200">Send now</button>
        </div>
      </Modal>
    </div>
  );
}

function BlockEditor({ block: b, scopeId, onChange, onUp, onDown, onRemove }: {
  block: EmailBlock;
  scopeId: string;
  onChange: (p: Partial<EmailBlock>) => void;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const meta = BLOCKS.find((x) => x.type === b.type)!;
  const [loadingNews, setLoadingNews] = useState(false);

  const fillNews = async () => {
    setLoadingNews(true);
    try {
      const [fam, own] = await Promise.all([
        getDocs(query(collection(db, "articles"), where("familyId", "==", scopeId), where("status", "==", "published"))).catch(() => null),
        getDocs(query(collection(db, "articles"), where("userId", "==", scopeId), where("status", "==", "published"))).catch(() => null),
      ]);
      const docs = [...(fam?.docs || []), ...(own?.docs || [])];
      const ms = (t: any) => (t?.toMillis ? t.toMillis() : 0);
      const items = docs
        .map((d) => ({ id: d.id, ...d.data() }) as any)
        .sort((a, z) => ms(z.publishedAt) - ms(a.publishedAt))
        .slice(0, 3)
        .map((a) => ({ title: a.title || "Untitled", excerpt: a.excerpt || "", url: `${window.location.origin}/p/article/${a.id}`, image: a.coverImage || undefined }));
      onChange({ items } as Partial<EmailBlock>);
    } finally {
      setLoadingNews(false);
    }
  };

  return (
    <Panel className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <meta.icon size={14} weight="duotone" className="text-zinc-500" />
        <span className="text-[11px] font-medium text-zinc-400 flex-1">{meta.label}</span>
        <button type="button" onClick={onUp} className="p-1 text-zinc-600 hover:text-zinc-200" title="Move up"><ArrowUp size={12} /></button>
        <button type="button" onClick={onDown} className="p-1 text-zinc-600 hover:text-zinc-200" title="Move down"><ArrowDown size={12} /></button>
        <button type="button" onClick={onRemove} className="p-1 text-zinc-600 hover:text-red-300" title="Remove"><Trash size={12} /></button>
      </div>

      {b.type === "heading" && <input className={inputClass} value={b.text} onChange={(e) => onChange({ text: e.target.value })} />}
      {b.type === "text" && (
        <>
          <textarea className={`${inputClass} min-h-[90px]`} value={b.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Write something…" />
          <p className="text-[10px] text-zinc-600">**bold**, *italic*, [link text](https://…)</p>
        </>
      )}
      {b.type === "image" && (
        <div className="grid sm:grid-cols-2 gap-2">
          <input className={`${inputClass} sm:col-span-2`} value={b.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="Image URL (https://…)" />
          <input className={inputClass} value={b.alt} onChange={(e) => onChange({ alt: e.target.value })} placeholder="Alt text" />
          <input className={inputClass} value={b.href || ""} onChange={(e) => onChange({ href: e.target.value })} placeholder="Link (optional)" />
        </div>
      )}
      {b.type === "button" && (
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <input className={inputClass} value={b.label} onChange={(e) => onChange({ label: e.target.value })} />
          <input className={inputClass} value={b.url} onChange={(e) => onChange({ url: e.target.value })} />
        </div>
      )}
      {b.type === "spacer" && <input type="range" min={4} max={80} value={b.size} onChange={(e) => onChange({ size: Number(e.target.value) })} className="w-full accent-white" />}
      {b.type === "changelog" && (
        <>
          <input className={inputClass} value={b.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Section title" />
          <textarea
            className={`${inputClass} min-h-[90px] text-xs`}
            value={b.items.join("\n")}
            onChange={(e) => onChange({ items: e.target.value.split("\n") })}
            placeholder={"One change per line\nFixed softlock when exiting ladders"}
          />
        </>
      )}
      {b.type === "articles" && (
        <div className="space-y-2">
          {b.items.map((a, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <input className={inputClass} value={a.title} onChange={(e) => onChange({ items: b.items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                <input className={`${inputClass} text-xs`} value={a.url} onChange={(e) => onChange({ items: b.items.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
              </div>
              <button type="button" onClick={() => onChange({ items: b.items.filter((_, j) => j !== i) })} className="p-1.5 text-zinc-600 hover:text-red-300"><Trash size={12} /></button>
            </div>
          ))}
          <Button variant="ghost" onClick={fillNews} loading={loadingNews}>Use latest 3 news posts</Button>
        </div>
      )}
      {b.type === "social" && (
        <div className="grid sm:grid-cols-2 gap-2">
          {(["website", "discord", "x", "steam"] as const).map((k) => (
            <input key={k} className={inputClass} value={b[k] || ""} onChange={(e) => onChange({ [k]: e.target.value })} placeholder={`${k[0].toUpperCase()}${k.slice(1)} URL`} />
          ))}
        </div>
      )}
    </Panel>
  );
}
