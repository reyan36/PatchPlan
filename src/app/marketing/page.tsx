"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  MagnifyingGlass, 
  Plus, 
  Trash, 
  Funnel, 
  Users, 
  YoutubeLogo, 
  TwitchLogo, 
  TiktokLogo, 
  Newspaper, 
  Palette, 
  Buildings, 
  GameController, 
  SpeakerHigh, 
  FileArrowUp, 
  FileArrowDown, 
  ArrowSquareOut,
  Tag,
  CheckCircle
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { Login } from "@/components/auth/Login";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { CsvImportModal, ParsedContact } from "@/components/network/CsvImportModal";
import { PageLoader } from "@/components/ui/PageLoader";

type Contact = {
  id: string;
  name: string;
  role: string;       // Platform or role
  tier?: string;      // Follower / subscriber tier
  niche?: string;     // Specific niche or genre
  contact: string;    // Email, handle, or link
  status: string;     // New, Contacted, In Talks, Hired, etc.
  notes: string;
  scopeId?: string;
  createdAt?: any;
};

// Platform definitions with icons and brand accent colors
const PLATFORM_CONFIG: Record<string, { label: string; icon: any; badgeClass: string; textClass: string }> = {
  "YouTube": {
    label: "YouTube",
    icon: YoutubeLogo,
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/25",
    textClass: "text-red-400"
  },
  "Twitch": {
    label: "Twitch",
    icon: TwitchLogo,
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/25",
    textClass: "text-purple-400"
  },
  "TikTok": {
    label: "TikTok",
    icon: TiktokLogo,
    badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
    textClass: "text-cyan-400"
  },
  "Press": {
    label: "Press / Media",
    icon: Newspaper,
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    textClass: "text-amber-400"
  },
  "Freelance Artist": {
    label: "Freelance Artist",
    icon: Palette,
    badgeClass: "bg-pink-500/10 text-pink-400 border-pink-500/25",
    textClass: "text-pink-400"
  },
  "Publisher": {
    label: "Publisher",
    icon: Buildings,
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/25",
    textClass: "text-blue-400"
  },
  "Developer": {
    label: "Developer",
    icon: GameController,
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    textClass: "text-emerald-400"
  },
  "Sound Designer": {
    label: "Sound Designer",
    icon: SpeakerHigh,
    badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25",
    textClass: "text-indigo-400"
  },
  "Other": {
    label: "Other",
    icon: Users,
    badgeClass: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25",
    textClass: "text-zinc-400"
  }
};

const PLATFORMS = Object.keys(PLATFORM_CONFIG);

const TIERS = [
  { value: "<10K", label: "<10K", style: "bg-zinc-800/60 text-zinc-300 border-zinc-700/60" },
  { value: "10K–50K", label: "10K–50K", style: "bg-blue-500/10 text-blue-300 border-blue-500/25" },
  { value: "50K–100K", label: "50K–100K", style: "bg-violet-500/10 text-violet-300 border-violet-500/25" },
  { value: "100K–500K", label: "100K–500K", style: "bg-amber-500/10 text-amber-300 border-amber-500/25" },
  { value: "500K+", label: "500K+", style: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30 font-semibold" },
  { value: "N/A", label: "N/A", style: "bg-zinc-900/40 text-zinc-500 border-zinc-800" },
];

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  "New": { label: "New", style: "bg-zinc-800 text-zinc-300 border-zinc-700/60" },
  "Contacted": { label: "Contacted", style: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  "In Talks": { label: "In Talks", style: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  "Hired": { label: "Hired", style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  "Rejected": { label: "Rejected", style: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
  "Completed": { label: "Completed", style: "bg-purple-500/15 text-purple-400 border-purple-500/30" }
};

const STATUSES = Object.keys(STATUS_CONFIG);

const COMMON_NICHES = [
  "Roguelike",
  "Co-op",
  "Speedrunner",
  "Horror",
  "RPG",
  "Strategy",
  "Action",
  "Retro / Pixel",
  "Cozy / Sim",
  "Card Battler",
  "Platformer",
  "Indie Showcase"
];

// Helper to escape CSV cell contents
function escapeCsvCell(val: string): string {
  const str = (val ?? "").toString();
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function MarketingPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeFamily, loading: familyLoading } = useFamily();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [fetching, setFetching] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  
  // Modals & Feedback
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const scopeId = activeFamily ? activeFamily.id : user?.uid;

  // Real-time Firestore sync
  useEffect(() => {
    if (!user || !scopeId) {
      setContacts([]);
      setFetching(false);
      return;
    }

    setFetching(true);
    const q = query(collection(db, "contacts"), where("scopeId", "==", scopeId));

    const unsub = onSnapshot(q, (snapshot) => {
      const loaded: Contact[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        
        // Backward-compatibility normalization
        let normalizedRole = data.role || "YouTube";
        if (normalizedRole === "YouTuber") normalizedRole = "YouTube";
        if (normalizedRole === "Twitch Streamer") normalizedRole = "Twitch";
        if (normalizedRole === "Animator" || normalizedRole === "Logo Designer") normalizedRole = "Freelance Artist";

        loaded.push({
          id: d.id,
          name: data.name || "",
          role: normalizedRole,
          tier: data.tier || "<10K",
          niche: data.niche || "",
          contact: data.contact || "",
          status: data.status || "New",
          notes: data.notes || "",
          scopeId: data.scopeId
        });
      });
      setContacts(loaded);
      setFetching(false);
    }, (err) => {
      console.warn("Contacts Firestore listener error:", err.message);
      setFetching(false);
    });

    return () => unsub();
  }, [user, scopeId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  if (authLoading || familyLoading) {
    return <PageLoader label="Loading network" />;
  }
  
  if (!user) return <Login />;

  const addContact = async () => {
    if (!scopeId) return;

    const newContactData: Omit<Contact, "id"> = {
      name: "",
      role: "YouTube",
      tier: "<10K",
      niche: "",
      contact: "",
      status: "New",
      notes: "",
      scopeId,
    };

    try {
      await addDoc(collection(db, "contacts"), {
        ...newContactData,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      // Local fallback in case of Firestore network error or offline
      setContacts(prev => [
        { id: Date.now().toString(), ...newContactData },
        ...prev
      ]);
    }
  };

  const updateContact = async (id: string, field: keyof Contact, value: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));

    try {
      const docRef = doc(db, "contacts", id);
      await updateDoc(docRef, { [field]: value });
    } catch (err) {
      // Handled silently for offline tolerance
    }
  };

  const deleteContact = async (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));

    try {
      await deleteDoc(doc(db, "contacts", id));
    } catch (err) {
      // Handled silently
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const listToExport = filteredContacts.length > 0 ? filteredContacts : contacts;
    if (listToExport.length === 0) {
      showToast("No contacts to export.");
      return;
    }

    const headers = ["Name", "Platform", "Tier", "Niche", "Contact", "Status", "Notes"];
    const rows = listToExport.map(c => [
      escapeCsvCell(c.name),
      escapeCsvCell(c.role),
      escapeCsvCell(c.tier || "<10K"),
      escapeCsvCell(c.niche || ""),
      escapeCsvCell(c.contact || ""),
      escapeCsvCell(c.status || "New"),
      escapeCsvCell(c.notes || "")
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `patchplan_network_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${listToExport.length} contacts to CSV.`);
  };

  // Batch CSV Import via Firestore
  const handleBatchImport = async (parsed: ParsedContact[]) => {
    if (!scopeId || parsed.length === 0) return;

    const batch = writeBatch(db);
    const newLocalContacts: Contact[] = [];

    parsed.forEach(item => {
      const newRef = doc(collection(db, "contacts"));
      const newContact: Contact = {
        id: newRef.id,
        name: item.name,
        role: item.role,
        tier: item.tier,
        niche: item.niche,
        contact: item.contact,
        status: item.status,
        notes: item.notes,
        scopeId,
      };

      batch.set(newRef, {
        ...newContact,
        createdAt: serverTimestamp(),
      });

      newLocalContacts.push(newContact);
    });

    try {
      await batch.commit();
      setContacts(prev => [...newLocalContacts, ...prev]);
      showToast(`Successfully imported ${parsed.length} contacts!`);
    } catch (err: any) {
      console.error("Batch import error:", err);
      // Still apply optimistically if offline
      setContacts(prev => [...newLocalContacts, ...prev]);
      showToast(`Imported ${parsed.length} contacts locally.`);
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = 
        (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.contact || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.niche || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.notes || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPlatform = platformFilter === "All" || c.role === platformFilter;
      const matchesTier = tierFilter === "All" || (c.tier || "<10K") === tierFilter;
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;

      return matchesSearch && matchesPlatform && matchesTier && matchesStatus;
    });
  }, [contacts, searchQuery, platformFilter, tierFilter, statusFilter]);

  // Utility to determine clickable action for contact info (URL or email)
  const getContactAction = (val: string) => {
    if (!val) return null;
    const trimmed = val.trim();
    if (trimmed.includes("@") && !trimmed.startsWith("http")) {
      return { href: `mailto:${trimmed}`, isMail: true };
    }
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return { href: trimmed, isMail: false };
    }
    if (trimmed.includes("twitch.tv") || trimmed.includes("youtube.com") || trimmed.includes("twitter.com") || trimmed.includes("x.com")) {
      return { href: `https://${trimmed.replace(/^https?:\/\//, '')}`, isMail: false };
    }
    return null;
  };

  return (
    <div className="space-y-6 h-full flex flex-col pb-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 border border-white/20 text-white text-xs shadow-xl animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle size={16} weight="fill" className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <header className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">Studio Network</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">
              {contacts.length} {contacts.length === 1 ? "Partner" : "Partners"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Track game streamers, press outlets, publishers, and freelance creators in your pipeline.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2">
          {/* CSV Import */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors shadow-sm"
            title="Import contacts from CSV"
          >
            <FileArrowUp size={15} weight="bold" className="text-blue-400" />
            <span>Import CSV</span>
          </button>

          {/* CSV Export */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors shadow-sm"
            title="Export contacts to CSV"
          >
            <FileArrowDown size={15} weight="bold" className="text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {/* Add Contact Button */}
          <button 
            type="button"
            onClick={addContact}
            className="flex items-center gap-1.5 bg-white text-black px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap active:scale-95 shadow-sm"
          >
            <Plus size={15} weight="bold" /> Add Contact
          </button>
        </div>
      </header>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center bg-[#111113] p-3 rounded-xl border border-white/10 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass size={15} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search by name, contact, niche, or notes..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#18181b] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-white/30 text-white placeholder:text-zinc-500 transition-colors"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Platform Filter */}
          <div className="relative">
            <select 
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)}
              className="appearance-none bg-[#18181b] border border-white/10 rounded-lg pl-3 pr-7 py-1.5 text-xs focus:outline-none focus:border-white/30 cursor-pointer text-zinc-300 transition-colors"
            >
              <option value="All">All Platforms</option>
              {PLATFORMS.map(p => (
                <option key={p} value={p} className="bg-[#18181b] text-white">
                  {PLATFORM_CONFIG[p]?.label || p}
                </option>
              ))}
            </select>
            <Funnel size={12} weight="bold" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>

          {/* Tier Filter */}
          <div className="relative">
            <select 
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value)}
              className="appearance-none bg-[#18181b] border border-white/10 rounded-lg pl-3 pr-7 py-1.5 text-xs focus:outline-none focus:border-white/30 cursor-pointer text-zinc-300 transition-colors"
            >
              <option value="All">All Audience Tiers</option>
              {TIERS.map(t => (
                <option key={t.value} value={t.value} className="bg-[#18181b] text-white">
                  {t.label}
                </option>
              ))}
            </select>
            <Funnel size={12} weight="bold" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none bg-[#18181b] border border-white/10 rounded-lg pl-3 pr-7 py-1.5 text-xs focus:outline-none focus:border-white/30 cursor-pointer text-zinc-300 transition-colors"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map(s => (
                <option key={s} value={s} className="bg-[#18181b] text-white">
                  {s}
                </option>
              ))}
            </select>
            <Funnel size={12} weight="bold" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>

          {/* Clear Filters (if active) */}
          {(searchQuery || platformFilter !== "All" || tierFilter !== "All" || statusFilter !== "All") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setPlatformFilter("All");
                setTierFilter("All");
                setStatusFilter("All");
              }}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#111113] border border-white/10 rounded-xl overflow-hidden flex-grow shadow-lg">
        <div className="overflow-x-auto min-h-[460px]">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="text-[11px] text-zinc-400 uppercase tracking-wider bg-white/[0.02] border-b border-white/10">
              <tr>
                <th className="px-3.5 py-3 font-semibold w-[16%]">Name</th>
                <th className="px-3.5 py-3 font-semibold w-[16%]">Platform</th>
                <th className="px-3.5 py-3 font-semibold w-[12%]">Audience Tier</th>
                <th className="px-3.5 py-3 font-semibold w-[14%]">Niche / Focus</th>
                <th className="px-3.5 py-3 font-semibold w-[18%]">Contact (Email/Link)</th>
                <th className="px-3.5 py-3 font-semibold w-[11%]">Status</th>
                <th className="px-3.5 py-3 font-semibold w-[18%]">Notes</th>
                <th className="px-2 py-3 font-semibold w-[4%] text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredContacts.map(contact => {
                const platformInfo = PLATFORM_CONFIG[contact.role] || PLATFORM_CONFIG["Other"];
                const PlatformIcon = platformInfo.icon;
                const tierInfo = TIERS.find(t => t.value === (contact.tier || "<10K")) || TIERS[0];
                const statusInfo = STATUS_CONFIG[contact.status] || STATUS_CONFIG["New"];
                const contactAction = getContactAction(contact.contact);

                return (
                  <tr key={contact.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Name */}
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={contact.name}
                        onChange={e => updateContact(contact.id, "name", e.target.value)}
                        placeholder="Creator or Studio name..."
                        className="w-full bg-transparent border border-transparent hover:border-white/15 focus:border-white/30 focus:bg-black/50 px-2.5 py-1.5 rounded-md transition-all outline-none text-white font-medium placeholder:text-zinc-600"
                      />
                    </td>

                    {/* Platform Badge with Dropdown */}
                    <td className="p-2">
                      <div className="relative inline-flex items-center">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium pointer-events-none ${platformInfo.badgeClass}`}>
                          <PlatformIcon size={14} weight="duotone" className="shrink-0" />
                          <span>{platformInfo.label}</span>
                        </div>
                        <select
                          value={contact.role}
                          onChange={e => updateContact(contact.id, "role", e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title="Change platform"
                        >
                          {PLATFORMS.map(p => (
                            <option key={p} value={p} className="bg-[#18181b] text-white">
                              {PLATFORM_CONFIG[p]?.label || p}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Audience Tier Badge with Dropdown */}
                    <td className="p-2">
                      <div className="relative inline-flex items-center">
                        <div className={`px-2 py-0.5 rounded-full border text-[11px] font-mono pointer-events-none ${tierInfo.style}`}>
                          {tierInfo.label}
                        </div>
                        <select
                          value={contact.tier || "<10K"}
                          onChange={e => updateContact(contact.id, "tier", e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title="Change audience tier"
                        >
                          {TIERS.map(t => (
                            <option key={t.value} value={t.value} className="bg-[#18181b] text-white">
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Niche / Focus */}
                    <td className="p-2">
                      <div className="relative flex items-center">
                        <Tag size={12} className="absolute left-2.5 text-zinc-500 pointer-events-none" />
                        <input 
                          type="text" 
                          list={`niches-list-${contact.id}`}
                          value={contact.niche || ""}
                          onChange={e => updateContact(contact.id, "niche", e.target.value)}
                          placeholder="e.g. Roguelike"
                          className="w-full bg-transparent border border-transparent hover:border-white/15 focus:border-white/30 focus:bg-black/50 pl-7 pr-2 py-1.5 rounded-md transition-all outline-none text-zinc-300 placeholder:text-zinc-600 text-xs"
                        />
                        <datalist id={`niches-list-${contact.id}`}>
                          {COMMON_NICHES.map(n => <option key={n} value={n} />)}
                        </datalist>
                      </div>
                    </td>

                    {/* Contact (Email/Link) + Quick Link Action */}
                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="text" 
                          value={contact.contact}
                          onChange={e => updateContact(contact.id, "contact", e.target.value)}
                          placeholder="Email, URL, or handle..."
                          className="w-full bg-transparent border border-transparent hover:border-white/15 focus:border-white/30 focus:bg-black/50 px-2.5 py-1.5 rounded-md transition-all outline-none text-zinc-300 placeholder:text-zinc-600 text-xs"
                        />
                        {contactAction && (
                          <a 
                            href={contactAction.href}
                            target={contactAction.isMail ? "_self" : "_blank"}
                            rel="noopener noreferrer"
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                            title={contactAction.isMail ? "Send email" : "Open external link"}
                          >
                            <ArrowSquareOut size={14} weight="bold" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Status Pill Badge with Dropdown */}
                    <td className="p-2">
                      <div className="relative inline-flex items-center">
                        <div className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium pointer-events-none ${statusInfo.style}`}>
                          {statusInfo.label}
                        </div>
                        <select
                          value={contact.status}
                          onChange={e => updateContact(contact.id, "status", e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title="Change status"
                        >
                          {STATUSES.map(s => (
                            <option key={s} value={s} className="bg-[#18181b] text-white">
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={contact.notes}
                        onChange={e => updateContact(contact.id, "notes", e.target.value)}
                        placeholder="Add notes..."
                        className="w-full bg-transparent border border-transparent hover:border-white/15 focus:border-white/30 focus:bg-black/50 px-2.5 py-1.5 rounded-md transition-all outline-none text-zinc-300 placeholder:text-zinc-600 text-xs"
                      />
                    </td>

                    {/* Actions */}
                    <td className="p-2 text-center">
                      <button 
                        onClick={() => deleteContact(contact.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 mx-auto block"
                        title="Delete Contact"
                      >
                        <Trash size={15} weight="duotone" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Empty state */}
              {!fetching && filteredContacts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-20 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-zinc-400 mb-2">
                        <Users size={22} weight="duotone" />
                      </div>
                      <p className="text-sm font-semibold text-white">No contacts found</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {contacts.length === 0 
                          ? "Keep track of game streamers, press outlets, publishers, and freelance creators. Add your first partner or import via CSV."
                          : "No contacts match your active search or filters. Try resetting the filters above."}
                      </p>
                      {contacts.length === 0 && (
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={addContact}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-colors"
                          >
                            <Plus size={14} weight="bold" /> Add First Partner
                          </button>
                          <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                          >
                            <FileArrowUp size={14} weight="bold" /> Import CSV
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Import Modal */}
      <CsvImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleBatchImport}
      />
    </div>
  );
}
