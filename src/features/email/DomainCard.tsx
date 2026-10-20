"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, CheckCircle, Copy, Check, ArrowsClockwise, Trash, Info, CaretDown } from "@phosphor-icons/react";
import { emailApi } from "@/lib/email/client";
import type { DnsRecord, StudioDomain } from "@/lib/email/domains";
import { Button, ErrorNote, Panel, Pill, inputClass } from "@/features/ai/ui";
import { Modal } from "@/components/ui/Modal";

const STATUS: Record<string, { label: string; className: string }> = {
  verified: { label: "Verified", className: "border-emerald-500/30 text-emerald-300" },
  pending: { label: "Checking DNS", className: "border-amber-500/30 text-amber-300" },
  not_started: { label: "Waiting for DNS", className: "border-amber-500/30 text-amber-300" },
  temporary_failure: { label: "Retrying", className: "border-amber-500/30 text-amber-300" },
  failed: { label: "Not verified", className: "border-red-500/30 text-red-300" },
};

/**
 * Lets a studio send from its own domain (e.g. news@mail.yourgame.com).
 * PatchPlan registers the domain in its Resend account; the studio only adds DNS records.
 */
export function DomainCard({ scopeId, studioName, sharedAddress, available }: { scopeId: string; studioName: string; sharedAddress: string | null; available: boolean }) {
  const [domain, setDomain] = useState<StudioDomain | null | undefined>(undefined);
  const [input, setInput] = useState("");
  const [local, setLocal] = useState("news");
  const [busy, setBusy] = useState<"add" | "verify" | "local" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [showRecords, setShowRecords] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await emailApi<{ domain: StudioDomain | null }>(`domain?scopeId=${encodeURIComponent(scopeId)}`, "GET");
      setDomain(r.domain);
      if (r.domain) setLocal(r.domain.fromLocal);
    } catch {
      setDomain(null);
    }
  }, [scopeId]);

  useEffect(() => {
    if (available) load();
    else setDomain(null);
  }, [available, load]);

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<{ domain: StudioDomain | null }>) => {
    setError(null);
    setBusy(kind);
    try {
      const r = await fn();
      setDomain(r.domain);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const verified = domain?.status === "verified";
  const display = studioName || "Your studio";

  return (
    <Panel className="p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <Globe size={18} weight="duotone" className="text-zinc-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-white">Send from your own domain <span className="text-zinc-500 font-normal">(optional)</span></h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {verified
                ? "Your emails come from your domain."
                : `Right now your emails send as “${display}”${sharedAddress ? ` <${sharedAddress}>` : ""}. Connect your domain so they come from your own address.`}
            </p>
          </div>
        </div>
        {domain && <Pill className={(STATUS[domain.status] || STATUS.pending).className}>{(STATUS[domain.status] || STATUS.pending).label}</Pill>}
      </div>

      {!available ? (
        <p className="text-xs text-zinc-500">Custom domains will be available once email sending is switched on for this PatchPlan server.</p>
      ) : domain === undefined ? (
        <div className="h-20 rounded-lg bg-white/[0.03] animate-pulse" />
      ) : !domain ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run("add", () => emailApi("domain", "POST", { scopeId, domain: input, fromLocal: local }));
          }}
          className="space-y-3"
        >
          <div className="grid sm:grid-cols-[120px_auto_1fr] gap-2 items-center">
            <input className={inputClass} value={local} onChange={(e) => setLocal(e.target.value)} placeholder="news" aria-label="Address name" />
            <span className="text-zinc-500 text-sm hidden sm:block">@</span>
            <input className={inputClass} value={input} onChange={(e) => setInput(e.target.value)} placeholder="mail.yourgame.com" aria-label="Domain" />
          </div>
          <p className="text-[11px] text-zinc-500 flex gap-1.5">
            <Info size={12} className="shrink-0 mt-0.5" />
            Use a subdomain like <span className="text-zinc-300">mail.yourgame.com</span> so your everyday email on yourgame.com isn&apos;t affected.
          </p>
          <Button type="submit" loading={busy === "add"} disabled={!input.trim()}>Connect domain</Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-zinc-500 text-xs">Sends as</span>
            <span className="text-zinc-100">{display} &lt;{domain.fromLocal}@{domain.name}&gt;</span>
            {!verified && <span className="text-[11px] text-zinc-500">once verified</span>}
          </div>

          {!verified && (
            <ol className="space-y-1 text-xs text-zinc-400 list-decimal pl-4">
              <li>Sign in where you bought your domain (Namecheap, Cloudflare, GoDaddy, Porkbun…) and open its DNS settings.</li>
              <li>
                Add each record below exactly as shown.{" "}
                <span className="text-amber-200/90">On Cloudflare, set every record to “DNS only” (grey cloud), not “Proxied”. Proxied records can&apos;t be verified.</span>
              </li>
              <li>Come back and press <span className="text-zinc-200">Check verification</span>. DNS changes usually take a few minutes, sometimes a few hours.</li>
            </ol>
          )}

          {verified ? (
            <button onClick={() => setShowRecords((v) => !v)} className="text-xs text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
              DNS records <CaretDown size={10} className={showRecords ? "rotate-180" : ""} />
            </button>
          ) : null}
          {(!verified || showRecords) && <Records records={domain.records} domain={domain.name} />}

          <div className="flex flex-wrap items-center gap-2">
            {!verified && (
              <Button onClick={() => run("verify", () => emailApi("domain", "PATCH", { scopeId, action: "verify" }))} loading={busy === "verify"}>
                <ArrowsClockwise size={13} /> Check verification
              </Button>
            )}
            <div className="flex items-center gap-1.5">
              <input className={`${inputClass} w-28 py-1.5`} value={local} onChange={(e) => setLocal(e.target.value)} aria-label="Address name" />
              <span className="text-xs text-zinc-500">@{domain.name}</span>
              {local !== domain.fromLocal && (
                <Button variant="ghost" onClick={() => run("local", () => emailApi("domain", "PATCH", { scopeId, fromLocal: local }))} loading={busy === "local"}>Save</Button>
              )}
            </div>
            <Button variant="danger" onClick={() => setConfirmRemove(true)} className="ml-auto"><Trash size={13} /> Remove</Button>
          </div>
        </div>
      )}

      <ErrorNote message={error} />

      <Modal isOpen={confirmRemove} onClose={() => setConfirmRemove(false)} title="Remove your domain?">
        <p className="text-sm text-zinc-400 mb-5">
          Emails will send from PatchPlan&apos;s address again{sharedAddress ? ` (${sharedAddress})` : ""}. You can reconnect later, but you&apos;ll need to add the DNS records again.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmRemove(false)} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white">Cancel</button>
          <button
            onClick={() => {
              setConfirmRemove(false);
              run("remove", () => emailApi("domain", "DELETE", { scopeId }));
            }}
            className="px-3 py-1.5 text-sm rounded-md bg-red-500/90 text-white hover:bg-red-500"
          >
            Remove domain
          </button>
        </div>
      </Modal>
    </Panel>
  );
}

function Records({ records, domain }: { records: DnsRecord[]; domain: string }) {
  if (!records.length) return <p className="text-xs text-zinc-500">DNS records are being generated. Check back in a moment.</p>;
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-white/[0.08] overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[560px]">
          <thead>
            <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-zinc-500">
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Name / Host</th>
              <th className="px-3 py-2 font-medium">Value</th>
              <th className="px-3 py-2 font-medium">Priority</th>
              <th className="px-3 py-2 font-medium w-8" />
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={i} className="border-b border-white/[0.05] last:border-0 align-top">
                <td className="px-3 py-2.5 font-mono text-zinc-300">{r.type}</td>
                <td className="px-3 py-2.5"><CopyText text={r.name} /></td>
                <td className="px-3 py-2.5 max-w-[280px]"><CopyText text={r.value} truncate /></td>
                <td className="px-3 py-2.5 font-mono text-zinc-400">{r.priority ?? "—"}</td>
                <td className="px-3 py-2.5">
                  {r.status === "verified" ? <CheckCircle size={14} weight="fill" className="text-emerald-400" aria-label="Found" /> : <span className="inline-block w-2 h-2 rounded-full bg-zinc-600 mt-1" aria-label="Not found yet" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-zinc-600">
        Some providers want only the part of the name before <span className="text-zinc-400">{domain.split(".").slice(-2).join(".")}</span>, and others want the full name. Both work if your provider adds the domain for you.
      </p>
    </div>
  );
}

function CopyText({ text, truncate }: { text: string; truncate?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="group flex items-start gap-1.5 text-left font-mono text-zinc-200 hover:text-white max-w-full"
      title="Copy"
    >
      <span className={truncate ? "truncate block max-w-[240px]" : "break-all"}>{text}</span>
      {copied ? <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" /> : <Copy size={12} className="text-zinc-600 group-hover:text-zinc-300 shrink-0 mt-0.5" />}
    </button>
  );
}
