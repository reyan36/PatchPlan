"use client";

import { useState, useRef } from "react";
import { 
  FileArrowUp, 
  DownloadSimple, 
  X, 
  CheckCircle, 
  WarningCircle, 
  Table 
} from "@phosphor-icons/react";

export type ParsedContact = {
  name: string;
  role: string;
  tier: string;
  niche: string;
  contact: string;
  status: string;
  notes: string;
};

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (contacts: ParsedContact[]) => Promise<void>;
}

// Normalizers
const normalizePlatform = (val: string): string => {
  const v = (val || "").trim().toLowerCase();
  if (v.includes("youtube")) return "YouTube";
  if (v.includes("twitch")) return "Twitch";
  if (v.includes("tiktok")) return "TikTok";
  if (v.includes("press") || v.includes("ign") || v.includes("kotaku") || v.includes("journalist") || v.includes("media")) return "Press";
  if (v.includes("artist") || v.includes("animat") || v.includes("design") || v.includes("illustrat")) return "Freelance Artist";
  if (v.includes("publish")) return "Publisher";
  if (v.includes("dev") || v.includes("program")) return "Developer";
  if (v.includes("sound") || v.includes("audio") || v.includes("music") || v.includes("compos")) return "Sound Designer";
  return "Other";
};

const normalizeTier = (val: string): string => {
  const v = (val || "").trim().toLowerCase();
  if (v.includes("500k")) return "500K+";
  if (v.includes("100k") && v.includes("500k")) return "100K–500K";
  if (v.includes("50k") && v.includes("100k")) return "50K–100K";
  if (v.includes("10k") && v.includes("50k")) return "10K–50K";
  if (v.includes("<10k") || v.includes("10k") || v.includes("micro")) return "<10K";
  return "N/A";
};

const normalizeStatus = (val: string): string => {
  const v = (val || "").trim().toLowerCase();
  if (v.includes("talk")) return "In Talks";
  if (v.includes("contact")) return "Contacted";
  if (v.includes("hire") || v.includes("confirm")) return "Hired";
  if (v.includes("reject") || v.includes("pass")) return "Rejected";
  if (v.includes("complete") || v.includes("done")) return "Completed";
  return "New";
};

// Robust CSV Line parser handling quotes, escaped quotes, and commas
function parseCsvLine(line: string): string[] {
  const entries: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      entries.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  entries.push(current.trim());
  return entries;
}

export function CsvImportModal({ isOpen, onClose, onImport }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith(".csv") && selected.type !== "text/csv") {
      setError("Please select a valid .csv file.");
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setError("The selected file is empty.");
          return;
        }

        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          setError("CSV must contain a header row and at least one contact row.");
          return;
        }

        const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
        
        // Find column indices
        const nameIdx = headers.findIndex(h => h.includes("name") || h.includes("creator") || h.includes("studio") || h.includes("contactname"));
        const roleIdx = headers.findIndex(h => h.includes("platform") || h.includes("role") || h.includes("type") || h.includes("channel"));
        const tierIdx = headers.findIndex(h => h.includes("tier") || h.includes("audience") || h.includes("follower") || h.includes("sub"));
        const nicheIdx = headers.findIndex(h => h.includes("niche") || h.includes("genre") || h.includes("tag") || h.includes("focus"));
        const contactIdx = headers.findIndex(h => h.includes("contact") || h.includes("email") || h.includes("link") || h.includes("url") || h.includes("handle"));
        const statusIdx = headers.findIndex(h => h.includes("status") || h.includes("stage"));
        const notesIdx = headers.findIndex(h => h.includes("note") || h.includes("detail") || h.includes("desc"));

        const contacts: ParsedContact[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cells = parseCsvLine(lines[i]);
          if (cells.every(c => c === "")) continue;

          const name = nameIdx !== -1 && cells[nameIdx] ? cells[nameIdx] : cells[0] || "Unnamed";
          const role = roleIdx !== -1 && cells[roleIdx] ? normalizePlatform(cells[roleIdx]) : "YouTube";
          const tier = tierIdx !== -1 && cells[tierIdx] ? normalizeTier(cells[tierIdx]) : "<10K";
          const niche = nicheIdx !== -1 && cells[nicheIdx] ? cells[nicheIdx] : "";
          const contact = contactIdx !== -1 && cells[contactIdx] ? cells[contactIdx] : "";
          const status = statusIdx !== -1 && cells[statusIdx] ? normalizeStatus(cells[statusIdx]) : "New";
          const notes = notesIdx !== -1 && cells[notesIdx] ? cells[notesIdx] : "";

          contacts.push({ name, role, tier, niche, contact, status, notes });
        }

        if (contacts.length === 0) {
          setError("No valid contact records found in this file.");
          return;
        }

        setParsedRows(contacts);
      } catch (err: any) {
        setError(`Failed to read CSV: ${err.message}`);
      }
    };
    reader.readAsText(selected);
  };

  const handleDownloadSample = () => {
    const sampleHeaders = "Name,Platform,Tier,Niche,Contact,Status,Notes\r\n";
    const sampleRows = [
      'Wanderbots,YouTube,100K–500K,Roguelike,wanderbots@creator.com,Contacted,"Interested in demo key"',
      'CohhCarnage,Twitch,500K+,RPG,cohh@agency.tv,In Talks,"Embargo on launch day"',
      'PC Gamer,Press,500K+,Co-op,press@pcgamer.com,New,"Send launch press release"'
    ].join("\r\n");

    const blob = new Blob([sampleHeaders + sampleRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patchplan_contacts_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    try {
      await onImport(parsedRows);
      onClose();
    } catch (err: any) {
      setError(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#121214] border border-white/10 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileArrowUp size={18} weight="bold" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#FAFAFA]">Import Contacts via CSV</h2>
              <p className="text-xs text-zinc-400">Upload a spreadsheet of streamers, press, or partners.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* File Picker Zone */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/15 hover:border-white/30 rounded-xl p-6 text-center cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv,text/csv" 
              onChange={handleFileChange}
              className="hidden" 
            />
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 text-zinc-400 group-hover:text-white transition-colors">
              <FileArrowUp size={24} weight="duotone" />
            </div>
            <p className="text-sm font-medium text-white mb-1">
              {file ? file.name : "Click to choose CSV or drop it here"}
            </p>
            <p className="text-xs text-zinc-400">
              Supports columns: Name, Platform, Tier, Niche, Contact, Status, Notes
            </p>
          </div>

          {/* Sample template download action */}
          <div className="flex items-center justify-between text-xs text-zinc-400 bg-white/[0.03] border border-white/5 rounded-lg px-3.5 py-2.5">
            <span>Need a formatted file to get started?</span>
            <button 
              type="button"
              onClick={handleDownloadSample}
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              <DownloadSimple size={14} weight="bold" />
              Download Sample Template
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <WarningCircle size={16} weight="bold" className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Table size={14} weight="duotone" />
                  Preview ({parsedRows.length} contacts found)
                </span>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle size={13} weight="fill" /> Ready to import
                </span>
              </div>
              <div className="border border-white/10 rounded-lg overflow-x-auto max-h-48 bg-black/40">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-zinc-400 bg-white/[0.03] border-b border-white/10">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Platform</th>
                      <th className="px-3 py-2">Tier</th>
                      <th className="px-3 py-2">Niche</th>
                      <th className="px-3 py-2">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-1.5 font-medium text-white">{row.name}</td>
                        <td className="px-3 py-1.5">{row.role}</td>
                        <td className="px-3 py-1.5 font-mono text-[11px]">{row.tier}</td>
                        <td className="px-3 py-1.5">{row.niche || "—"}</td>
                        <td className="px-3 py-1.5 truncate max-w-[120px]">{row.contact || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 5 && (
                <p className="text-[11px] text-zinc-500 text-center">
                  + {parsedRows.length - 5} more contacts will be imported
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            disabled={parsedRows.length === 0 || importing}
            onClick={handleConfirmImport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {importing ? "Importing..." : `Import ${parsedRows.length > 0 ? `(${parsedRows.length})` : ""} Contacts`}
          </button>
        </div>
      </div>
    </div>
  );
}
