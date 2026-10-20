"use client";

import { useMemo, useState } from "react";
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { DownloadSimple, MagnifyingGlass, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import { db } from "@/lib/firebase";
import { randomToken, subscriberId } from "@/lib/email/client";
import { EMAIL_LISTS, type EmailList, type Subscriber } from "@/lib/email/types";
import { Button, ErrorNote, Panel, Pill, inputClass } from "@/features/ai/ui";
import { Modal } from "@/components/ui/Modal";

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i;
const ALL_LISTS = EMAIL_LISTS.map((l) => l.key);

const toMs = (t: any) => (t?.toMillis ? t.toMillis() : 0);

export function Subscribers({ scopeId, subscribers }: { scopeId: string; subscribers: Subscriber[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"active" | "unsubscribed" | "all">("active");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Subscriber | null>(null);

  const shown = useMemo(
    () =>
      subscribers
        .filter((s) => filter === "all" || s.status === filter)
        .filter((s) => !search || `${s.email} ${s.name || ""}`.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)),
    [subscribers, filter, search]
  );

  const exportCsv = () => {
    const rows = [["email", "name", "status", "lists", "source"], ...subscribers.map((s) => [s.email, s.name || "", s.status, s.lists.join(";"), s.source])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "subscribers.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const toggleList = (s: Subscriber, list: EmailList) => {
    const lists = s.lists.includes(list) ? s.lists.filter((l) => l !== list) : [...s.lists, list];
    updateDoc(doc(db, "subscribers", s.id), { lists });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input className={`${inputClass} pl-8`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subscribers" />
          </div>
          <select className={`${inputClass} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={exportCsv} disabled={!subscribers.length}><DownloadSimple size={13} /> Export</Button>
          <Button variant="ghost" onClick={() => setImporting(true)}><UploadSimple size={13} /> Import</Button>
          <Button onClick={() => setAdding(true)}><Plus size={13} weight="bold" /> Add</Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-600">
          {subscribers.length ? "No subscribers match." : "No subscribers yet. Share your sign-up page to start collecting emails."}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2 font-medium">Subscriber</th>
                <th className="px-4 py-2 font-medium">Lists</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id} className="group border-b border-white/[0.05] last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="text-zinc-100">{s.email}</div>
                    {(s.name || s.status === "unsubscribed") && (
                      <div className="text-xs text-zinc-500">{s.name}{s.status === "unsubscribed" && <span className="text-red-300/80">{s.name ? " · " : ""}unsubscribed</span>}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {EMAIL_LISTS.map((l) => (
                        <button key={l.key} onClick={() => toggleList(s, l.key)} title={`Toggle ${l.label}`}>
                          <Pill className={s.lists.includes(l.key) ? "border-white/20 text-zinc-200" : "border-white/[0.06] text-zinc-600 line-through"}>{l.key}</Pill>
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{s.source}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{toMs(s.createdAt) ? new Date(toMs(s.createdAt)).toLocaleDateString() : "—"}</td>
                  <td className="pr-3">
                    <button onClick={() => setConfirmDelete(s)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-300 p-1" title="Remove">
                      <Trash size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddSubscriberModal open={adding} onClose={() => setAdding(false)} scopeId={scopeId} existing={subscribers} />
      <ImportModal open={importing} onClose={() => setImporting(false)} scopeId={scopeId} existing={subscribers} />
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove subscriber?">
        <p className="text-sm text-zinc-400 mb-5">
          {confirmDelete?.email} is deleted from your list. To keep a record that they opted out, leave them as unsubscribed instead.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white">Cancel</button>
          <button
            onClick={async () => {
              if (confirmDelete) await deleteDoc(doc(db, "subscribers", confirmDelete.id));
              setConfirmDelete(null);
            }}
            className="px-3 py-1.5 text-sm rounded-md bg-red-500/90 text-white hover:bg-red-500"
          >
            Remove
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ConsentNote() {
  return <p className="text-[11px] text-zinc-500">Only add people who asked to hear from you. Every email includes an unsubscribe link.</p>;
}

function AddSubscriberModal({ open, onClose, scopeId, existing }: { open: boolean; onClose: () => void; scopeId: string; existing: Subscriber[] }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) return setError("Enter a valid email address.");
    const known = existing.find((s) => s.email === clean);
    // Never re-subscribe someone who opted out; they can sign up again themselves.
    if (known) return setError(known.status === "unsubscribed" ? "This person unsubscribed. Only they can sign up again." : "Already subscribed.");
    setBusy(true);
    try {
      await setDoc(doc(db, "subscribers", await subscriberId(scopeId, clean)), {
        scopeId, email: clean, name: name.trim(), status: "active", lists: ALL_LISTS, source: "manual", token: randomToken(), createdAt: serverTimestamp(),
      });
      setEmail("");
      setName("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add subscriber.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Add subscriber">
      <div className="space-y-3">
        <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="player@example.com" type="email" autoFocus />
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" />
        <ConsentNote />
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy}>Add</Button>
        </div>
      </div>
    </Modal>
  );
}

function ImportModal({ open, onClose, scopeId, existing }: { open: boolean; onClose: () => void; scopeId: string; existing: Subscriber[] }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const known = new Set(existing.map((s) => s.email));
      // Accepts "email", "email,name" or "name <email>" per line.
      const parsed = text
        .split(/\n+/)
        .map((line) => {
          const angle = line.match(/^(.*)<([^>]+)>/);
          const [a, b] = angle ? [angle[2], angle[1]] : line.split(/[,;\t]/);
          return { email: String(a || "").trim().toLowerCase(), name: String(b || "").trim().replace(/^"|"$/g, "") };
        })
        .filter((r) => EMAIL_RE.test(r.email) && !known.has(r.email))
        .slice(0, 2000);

      for (let i = 0; i < parsed.length; i += 400) {
        const batch = writeBatch(db);
        for (const r of parsed.slice(i, i + 400)) {
          batch.set(doc(db, "subscribers", await subscriberId(scopeId, r.email)), {
            scopeId, email: r.email, name: r.name, status: "active", lists: ALL_LISTS, source: "import", token: randomToken(), createdAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }
      setResult(`Imported ${parsed.length} new subscriber${parsed.length === 1 ? "" : "s"}.`);
      setText("");
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={() => { setResult(null); onClose(); }} title="Import subscribers">
      <div className="space-y-3">
        <textarea className={`${inputClass} min-h-[140px] font-mono text-xs`} value={text} onChange={(e) => setText(e.target.value)} placeholder={"One per line:\nplayer@example.com\nalex@example.com, Alex\nSam <sam@example.com>"} />
        <ConsentNote />
        {result && <p className="text-xs text-zinc-300">{result}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={run} loading={busy} disabled={!text.trim()}>Import</Button>
        </div>
      </div>
    </Modal>
  );
}
