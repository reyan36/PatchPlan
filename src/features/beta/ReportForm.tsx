"use client";

import { useEffect, useRef, useState } from "react";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { CircleNotch, ImageSquare, X } from "@phosphor-icons/react";
import { db } from "@/lib/firebase";
import { compressImage, type CompressedImage } from "@/lib/beta/image";
import { CATEGORIES, LIMITS, SEVERITIES, type Report, type ReportCategory, type ReportSeverity, type Tester } from "@/lib/beta/types";
import { chip, portalInput, portalLabel, portalPrimary } from "./portalStyles";

type Draft = { title: string; category: ReportCategory; severity: ReportSeverity; description: string; steps: string; expected: string; videoUrl: string; logs: string };
const EMPTY: Draft = { title: "", category: "bug", severity: "medium", description: "", steps: "", expected: "", videoUrl: "", logs: "" };

// Text-only draft in this browser, so a long report survives a refresh. Screenshots aren't saved.
const draftKey = (scopeId: string) => `pp-beta-draft-${scopeId}`;
function loadDraft(scopeId: string): Draft {
  try {
    const raw = localStorage.getItem(draftKey(scopeId));
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

type Props = { scopeId: string; tester: Tester; build: string; onSent: (r: Report) => void };

export function ReportForm({ scopeId, tester, build: currentBuild, onSent }: Props) {
  const [d, setD] = useState<Draft>(() => loadDraft(scopeId));
  const [platform, setPlatform] = useState(tester.platforms[0] || "");
  const [build, setBuild] = useState(currentBuild);
  const [images, setImages] = useState<CompressedImage[]>([]);
  const [processing, setProcessing] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setBuild((b) => b || currentBuild), [currentBuild]);
  useEffect(() => {
    try {
      localStorage.setItem(draftKey(scopeId), JSON.stringify(d));
    } catch {}
  }, [d, scopeId]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v }));

  const addFiles = async (files: File[]) => {
    const room = LIMITS.files - images.length - processing;
    const picked = files.filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, room));
    if (!picked.length) {
      if (files.length) setError(room <= 0 ? `You can attach up to ${LIMITS.files} screenshots.` : "Only images can be attached. Paste a link for videos.");
      return;
    }
    setError("");
    setProcessing((n) => n + picked.length);
    for (const f of picked) {
      try {
        const img = await compressImage(f);
        setImages((cur) => (cur.length < LIMITS.files ? [...cur, img] : cur));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't add that image.");
      } finally {
        setProcessing((n) => n - 1);
      }
    }
  };

  // Paste a screenshot straight from the clipboard (Print Screen, Snipping Tool, Steam).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.title.trim()) return setError("Give the issue a short title.");
    if (!d.description.trim()) return setError("Describe what happened.");
    if (d.videoUrl.trim() && !/^https?:\/\//i.test(d.videoUrl.trim())) return setError("The video link should start with https://");
    if (processing) return setError("Wait for screenshots to finish processing.");
    setBusy(true);
    setError("");
    try {
      // Report + screenshots in one atomic batch: no half-saved reports or orphaned files.
      const ref = doc(collection(db, "beta_reports"));
      const batch = writeBatch(db);
      const files = images.map((img, i) => {
        const id = `${ref.id}_${i}`;
        batch.set(doc(db, "beta_files", id), { scopeId, testerUid: tester.uid, reportId: ref.id, data: img.dataUrl, createdAt: serverTimestamp() });
        return { id, w: img.w, h: img.h, bytes: img.bytes };
      });
      const report = {
        scopeId,
        testerUid: tester.uid,
        testerName: tester.name,
        title: d.title.trim().slice(0, LIMITS.title),
        category: d.category,
        severity: d.severity,
        description: d.description.trim().slice(0, LIMITS.description),
        steps: d.steps.trim().slice(0, LIMITS.steps),
        expected: d.expected.trim().slice(0, LIMITS.expected),
        platform: platform.slice(0, 40),
        build: build.trim().slice(0, LIMITS.build),
        videoUrl: d.videoUrl.trim().slice(0, LIMITS.url),
        logs: d.logs.slice(0, LIMITS.logs),
        files,
        status: "new" as const,
        reply: "",
        taskId: null,
      };
      batch.set(ref, { ...report, createdAt: serverTimestamp() });
      await batch.commit();
      try {
        localStorage.removeItem(draftKey(scopeId));
      } catch {}
      setD(EMPTY);
      setImages([]);
      onSent({ id: ref.id, ...report, createdAt: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? `Couldn't send the report: ${err.message}` : "Couldn't send the report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[var(--pp-border)] bg-[var(--pp-surface)] p-6 sm:p-7 space-y-5">
      <div>
        <label className={portalLabel}>Title</label>
        <input className={portalInput} placeholder="e.g. Game freezes when opening the map in the cave" value={d.title} onChange={(e) => set("title", e.target.value)} maxLength={LIMITS.title} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={portalLabel}>Type</label>
          <select className={portalInput} value={d.category} onChange={(e) => set("category", e.target.value as ReportCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={portalLabel}>How bad is it?</label>
          <div className="flex flex-wrap gap-1.5">
            {SEVERITIES.map((s) => (
              <button type="button" key={s.key} title={s.hint} onClick={() => set("severity", s.key)} className={chip(d.severity === s.key)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className={portalLabel}>What happened?</label>
        <textarea className={`${portalInput} min-h-[100px] resize-y`} placeholder="What you saw, and what you were doing when it happened." value={d.description} onChange={(e) => set("description", e.target.value)} maxLength={LIMITS.description} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={portalLabel}>Steps to reproduce (optional)</label>
          <textarea className={`${portalInput} min-h-[90px] resize-y`} placeholder={"1. Load the cave level\n2. Press M\n3. Game freezes"} value={d.steps} onChange={(e) => set("steps", e.target.value)} maxLength={LIMITS.steps} />
        </div>
        <div>
          <label className={portalLabel}>What did you expect? (optional)</label>
          <textarea className={`${portalInput} min-h-[90px] resize-y`} placeholder="The map opens." value={d.expected} onChange={(e) => set("expected", e.target.value)} maxLength={LIMITS.expected} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={portalLabel}>Platform</label>
          <select className={portalInput} value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {(tester.platforms.length ? tester.platforms : ["PC"]).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={portalLabel}>Build / version</label>
          <input className={portalInput} placeholder="e.g. 0.4.2" value={build} onChange={(e) => setBuild(e.target.value)} maxLength={LIMITS.build} />
        </div>
      </div>

      <div>
        <label className={portalLabel}>Screenshots (up to {LIMITS.files})</label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(Array.from(e.dataTransfer.files));
          }}
          className={`rounded-xl border border-dashed p-4 transition-colors ${dragging ? "border-[var(--pp-accent)] bg-[var(--pp-bg)]" : "border-[var(--pp-border)]"}`}
        >
          <div className="flex flex-wrap gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative h-20 w-28 rounded-lg overflow-hidden border border-[var(--pp-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.dataUrl} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => setImages((cur) => cur.filter((_, j) => j !== i))} className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white" aria-label="Remove screenshot">
                  <X size={11} weight="bold" />
                </button>
              </div>
            ))}
            {Array.from({ length: processing }).map((_, i) => (
              <div key={`p${i}`} className="h-20 w-28 rounded-lg border border-[var(--pp-border)] flex items-center justify-center text-[var(--pp-muted)]">
                <CircleNotch size={18} className="animate-spin" />
              </div>
            ))}
            {images.length + processing < LIMITS.files && (
              <button type="button" onClick={() => fileInput.current?.click()} className="h-20 flex-1 min-w-[180px] rounded-lg flex flex-col items-center justify-center gap-1 text-sm text-[var(--pp-muted)] hover:text-[var(--pp-fg)] transition-colors">
                <ImageSquare size={20} />
                <span>Drop, paste or click to add</span>
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addFiles(Array.from(e.target.files || []));
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div>
        <label className={portalLabel}>Video link (optional)</label>
        <input className={portalInput} placeholder="YouTube, Google Drive, Streamable, Medal…" value={d.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} maxLength={LIMITS.url} />
      </div>

      <details className="group" open={!!d.logs}>
        <summary className="cursor-pointer text-sm text-[var(--pp-muted)] hover:text-[var(--pp-fg)]">Add a crash log or error text</summary>
        <textarea className={`${portalInput} mt-3 min-h-[120px] resize-y font-mono text-xs`} placeholder="Paste the error or log here" value={d.logs} onChange={(e) => set("logs", e.target.value)} maxLength={LIMITS.logs} />
      </details>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={busy || processing > 0} className={`${portalPrimary} h-11 w-full sm:w-auto`}>
        {busy && <CircleNotch size={16} className="animate-spin" />} Send report
      </button>
    </form>
  );
}
