"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowSquareOut, CheckCircle, Columns, FileArrowDown, FileArrowUp, List, MagnifyingGlass, Plus, ShareNetwork, Tag } from "@phosphor-icons/react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { Login } from "@/components/auth/LazyLogin";
import { db } from "@/lib/firebase";
import { CsvImportModal, type ParsedContact } from "@/components/network/CsvImportModal";
import { PageLoader } from "@/components/ui/PageLoader";
import { PillSelect } from "@/components/ui/PillSelect";
import { ContactDrawer } from "@/features/network/ContactDrawer";
import { PLATFORM_KEYS, STAGES, contactHref, initials, normalizeRole, platformOf, stageOf, type Contact } from "@/features/network/networkMeta";

type View = "list" | "pipeline";
const VIEW_KEY = "pp-network-view";

const csvCell = (val: string) => {
  const s = (val ?? "").toString();
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function NetworkPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeFamily, loading: familyLoading } = useFamily();
  const scopeId = activeFamily ? activeFamily.id : user?.uid;

  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("All");
  const [stage, setStage] = useState("All");
  const [view, setView] = useState<View>("list");
  const [editing, setEditing] = useState<Contact | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "list" || v === "pipeline") setView(v);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user || !scopeId) return;
    setContacts(null);
    return onSnapshot(
      query(collection(db, "contacts"), where("scopeId", "==", scopeId)),
      (snap) =>
        setContacts(
          snap.docs.map((d) => {
            const x = d.data();
            return {
              id: d.id,
              name: x.name || "",
              role: normalizeRole(x.role),
              tier: x.tier || "<10K",
              niche: x.niche || "",
              contact: x.contact || "",
              status: x.status || "New",
              notes: x.notes || "",
              scopeId: x.scopeId,
              createdAt: x.createdAt,
              updatedAt: x.updatedAt,
            };
          })
        ),
      (err) => {
        console.warn("Contacts listener:", err.message);
        setContacts([]);
      }
    );
  }, [user, scopeId]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (contacts || [])
      .filter(
        (c) =>
          (platform === "All" || c.role === platform) &&
          (stage === "All" || c.status === stage) &&
          (!q || [c.name, c.contact, c.niche, c.notes].some((v) => (v || "").toLowerCase().includes(q)))
      )
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [contacts, search, platform, stage]);

  const stageCounts = useMemo(() => {
    const m: Record<string, number> = {};
    (contacts || []).forEach((c) => (m[c.status] = (m[c.status] || 0) + 1));
    return m;
  }, [contacts]);

  if (authLoading || familyLoading) return <PageLoader label="Loading network" />;
  if (!user) return <Login />;

  const pickView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  const saveContact = async (draft: Omit<Contact, "id" | "scopeId" | "createdAt" | "updatedAt">) => {
    if (!scopeId) return;
    if (editing && editing !== "new") await updateDoc(doc(db, "contacts", editing.id), { ...draft, updatedAt: serverTimestamp() });
    else await addDoc(collection(db, "contacts"), { ...draft, scopeId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  };

  const moveTo = (id: string, status: string) => {
    setContacts((cur) => cur && cur.map((c) => (c.id === id ? { ...c, status } : c)));
    updateDoc(doc(db, "contacts", id), { status, updatedAt: serverTimestamp() }).catch(() => flash("Couldn't update. Check your connection."));
  };

  const exportCsv = () => {
    const list = shown.length ? shown : contacts || [];
    if (!list.length) return flash("No contacts to export.");
    const rows = [["Name", "Platform", "Tier", "Niche", "Contact", "Status", "Notes"], ...list.map((c) => [c.name, c.role, c.tier || "", c.niche || "", c.contact, c.status, c.notes])];
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patchplan_network_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    flash(`Exported ${list.length} contacts.`);
  };

  const importCsv = async (parsed: ParsedContact[]) => {
    if (!scopeId || !parsed.length) return;
    // Batches cap at 500 writes.
    for (let i = 0; i < parsed.length; i += 400) {
      const batch = writeBatch(db);
      parsed.slice(i, i + 400).forEach((p) => batch.set(doc(collection(db, "contacts")), { ...p, scopeId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
      await batch.commit();
    }
    flash(`Imported ${parsed.length} contacts.`);
  };

  const filtersActive = search || platform !== "All" || stage !== "All";
  const total = contacts?.length || 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 border border-white/15 text-white text-xs shadow-xl pp-pop">
          <CheckCircle size={15} weight="fill" className="text-emerald-400" /> {toast}
        </div>
      )}

      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShareNetwork size={26} weight="duotone" /> Network
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Streamers, press, publishers and freelancers, and where each conversation stands.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button onClick={() => setImporting(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.04]">
            <FileArrowUp size={14} /> Import
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.04]">
            <FileArrowDown size={14} /> Export
          </button>
          <button onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#FAFAFA] text-black text-xs font-semibold hover:bg-zinc-200">
            <Plus size={14} weight="bold" /> Add contact
          </button>
        </div>
      </header>

      {/* Outreach pipeline: counts per stage, click to filter */}
      <section className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {STAGES.map((s) => {
          const on = stage === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setStage(on ? "All" : s.key)}
              className={`text-left rounded-xl border px-3.5 py-3 transition-colors ${on ? "border-white/30 bg-white/[0.06]" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}
            >
              <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
              </span>
              <span className="mt-1 block text-xl font-semibold text-white tabular-nums">{stageCounts[s.key] || 0}</span>
            </button>
          );
        })}
      </section>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative lg:w-72">
          <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, niche, notes" className="w-full bg-black/30 border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/25" />
        </div>
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          <button onClick={() => setPlatform("All")} className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium ${platform === "All" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"}`}>
            All
          </button>
          {PLATFORM_KEYS.map((k) => {
            const p = platformOf(k);
            return (
              <button key={k} onClick={() => setPlatform(platform === k ? "All" : k)} className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${platform === k ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"}`}>
                <p.icon size={13} /> {p.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          {filtersActive && (
            <button
              onClick={() => {
                setSearch("");
                setPlatform("All");
                setStage("All");
              }}
              className="text-xs text-zinc-500 hover:text-white"
            >
              Clear filters
            </button>
          )}
          <div className="flex p-0.5 rounded-md border border-white/10">
            <button onClick={() => pickView("list")} className={`p-1.5 rounded ${view === "list" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"}`} aria-label="List view" title="List">
              <List size={14} />
            </button>
            <button onClick={() => pickView("pipeline")} className={`p-1.5 rounded ${view === "pipeline" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"}`} aria-label="Pipeline view" title="Pipeline">
              <Columns size={14} />
            </button>
          </div>
        </div>
      </div>

      {contacts === null ? (
        <PageLoader label="Loading contacts" />
      ) : total === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
          <ShareNetwork size={28} weight="duotone" className="mx-auto text-zinc-500" />
          <p className="mt-3 text-white font-medium">Build your launch network</p>
          <p className="mt-1 text-sm text-zinc-500 max-w-md mx-auto">Keep track of the streamers, press and publishers you reach out to, and move them through your outreach pipeline.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#FAFAFA] text-black text-xs font-semibold hover:bg-zinc-200">
              <Plus size={14} weight="bold" /> Add contact
            </button>
            <button onClick={() => setImporting(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border border-white/10 text-zinc-300 hover:text-white">
              <FileArrowUp size={14} /> Import CSV
            </button>
          </div>
        </div>
      ) : view === "list" ? (
        shown.length ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/[0.06] overflow-hidden">
            {shown.map((c) => {
              const p = platformOf(c.role);
              const s = stageOf(c.status);
              const href = contactHref(c.contact);
              return (
                <div key={c.id} role="button" tabIndex={0} onClick={() => setEditing(c)} onKeyDown={(e) => e.key === "Enter" && setEditing(c)} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ background: `${p.color}33`, boxShadow: `inset 0 0 0 1px ${p.color}55` }}>
                    {initials(c.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{c.name || <span className="text-zinc-500 italic">Unnamed</span>}</p>
                    <p className="text-xs text-zinc-500 truncate">{c.contact || c.notes || "No contact details yet"}</p>
                  </div>
                  <span className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] ${p.badge}`}>
                    <p.icon size={12} /> {p.label}
                  </span>
                  <span className="hidden lg:inline text-xs text-zinc-400 w-20 tabular-nums">{c.tier}</span>
                  <span className="hidden lg:inline-flex items-center gap-1 text-xs text-zinc-500 w-28 truncate">{c.niche ? <><Tag size={12} /> {c.niche}</> : null}</span>
                  {/* Quick stage change without opening the panel */}
                  <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <PillSelect
                      value={c.status}
                      options={STAGES.map((x) => ({ value: x.key, label: x.label }))}
                      onChange={(v) => moveTo(c.id, v)}
                      tone={s.tone}
                      dot={s.dot}
                      ariaLabel={`Stage for ${c.name}`}
                    />
                  </span>
                  {href ? (
                    <a href={href} onClick={(e) => e.stopPropagation()} target={href.startsWith("mailto:") ? "_self" : "_blank"} rel="noopener noreferrer" className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-white/[0.06]" aria-label="Open contact link">
                      <ArrowSquareOut size={14} />
                    </a>
                  ) : (
                    <span className="w-[26px]" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 py-10 text-center">No contacts match.</p>
        )
      ) : (
        /* Pipeline: drag cards between stages */
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.filter((s) => stage === "All" || stage === s.key).map((s) => {
            const cards = shown.filter((c) => c.status === s.key);
            return (
              <div
                key={s.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropStage(s.key);
                }}
                onDragLeave={() => setDropStage((cur) => (cur === s.key ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) moveTo(dragId, s.key);
                  setDragId(null);
                  setDropStage(null);
                }}
                className={`w-64 shrink-0 rounded-xl border p-2.5 transition-colors ${dropStage === s.key ? "border-white/30 bg-white/[0.05]" : "border-white/10 bg-white/[0.02]"}`}
              >
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
                  </span>
                  <span className="text-[11px] text-zinc-500 tabular-nums">{cards.length}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {cards.map((c) => {
                    const p = platformOf(c.role);
                    return (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={() => setDragId(c.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setDropStage(null);
                        }}
                        onClick={() => setEditing(c)}
                        className={`rounded-lg border border-white/10 bg-[#141418] p-3 cursor-grab active:cursor-grabbing hover:border-white/20 transition-colors ${dragId === c.id ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0" style={{ background: `${p.color}33` }}>
                            {initials(c.name)}
                          </span>
                          <p className="text-sm text-white truncate">{c.name || "Unnamed"}</p>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                          <span className="inline-flex items-center gap-1">
                            <p.icon size={12} style={{ color: p.color }} /> {p.label}
                          </span>
                          <span>{c.tier}</span>
                          {c.niche && <span className="truncate">· {c.niche}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {!cards.length && <p className="text-[11px] text-zinc-600 px-1 py-3">Drop contacts here</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ContactDrawer
          contact={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (d) => {
            await saveContact(d);
            flash(editing === "new" ? "Contact added." : "Saved.");
          }}
          onDelete={editing === "new" ? undefined : async () => {
            await deleteDoc(doc(db, "contacts", editing.id));
            flash("Contact deleted.");
          }}
        />
      )}

      <CsvImportModal isOpen={importing} onClose={() => setImporting(false)} onImport={importCsv} />
    </div>
  );
}
