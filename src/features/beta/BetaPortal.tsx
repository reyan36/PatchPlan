"use client";

import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { CheckCircle, CircleNotch, Clock, Flask, Prohibit, SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/lib/AuthContext";
import { auth, db } from "@/lib/firebase";
import { LIMITS, PLATFORMS, testerDocId, type BetaProgram, type Report, type Tester } from "@/lib/beta/types";
import { toMillis } from "@/lib/beta/client";
import { TesterAuth } from "./TesterAuth";
import { ReportForm } from "./ReportForm";
import { MyReports } from "./MyReports";
import { chip, portalInput, portalLabel, portalPrimary } from "./portalStyles";

type Props = { scopeId: string; studio: { name: string; logoUrl: string }; open: boolean; intro: string };

export function BetaPortal({ scopeId, studio, open, intro }: Props) {
  const { user, loading } = useAuth();
  // undefined = loading, null = hasn't applied
  const [tester, setTester] = useState<Tester | null | undefined>(undefined);
  const [error, setError] = useState("");

  // One doc listener: the page flips to "approved" the moment the studio approves.
  useEffect(() => {
    if (!user) return setTester(undefined);
    return onSnapshot(
      doc(db, "beta_testers", testerDocId(scopeId, user.uid)),
      (snap) => setTester(snap.exists() ? ({ id: snap.id, ...snap.data() } as Tester) : null),
      (err) => {
        setError(`Couldn't load your access: ${err.message}`);
        setTester(null);
      }
    );
  }, [user, scopeId]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {studio.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={studio.logoUrl} alt={studio.name} className="h-9 w-auto max-w-[140px] object-contain" />
          ) : (
            <span className="text-base font-bold truncate">{studio.name}</span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--pp-border)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--pp-muted)]">
            <Flask size={12} weight="fill" /> Beta
          </span>
        </div>
        {user && (
          <button onClick={() => signOut(auth)} className="inline-flex items-center gap-1.5 text-sm text-[var(--pp-muted)] hover:text-[var(--pp-fg)] transition-colors shrink-0" title={user.email || ""}>
            <SignOut size={15} /> Sign out
          </button>
        )}
      </header>

      <section className="mt-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Help test {studio.name}</h1>
        <p className="mt-3 text-[var(--pp-muted)] whitespace-pre-line leading-relaxed">
          {intro || "Play early builds before everyone else and report what breaks. Your reports go straight to the team."}
        </p>
      </section>

      <main className="mt-8">
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        {loading || (user && tester === undefined) ? (
          <div className="flex justify-center py-16 text-[var(--pp-muted)]">
            <CircleNotch size={22} className="animate-spin" />
          </div>
        ) : !user ? (
          open ? <TesterAuth studioName={studio.name} /> : <Closed studioName={studio.name} signedOut />
        ) : tester === null ? (
          open ? <ApplyForm scopeId={scopeId} /> : <Closed studioName={studio.name} />
        ) : tester!.status === "approved" ? (
          <Approved scopeId={scopeId} tester={tester!} />
        ) : (
          <StatusCard tester={tester!} studioName={studio.name} />
        )}
      </main>

      <footer className="mt-16 text-center text-xs text-[var(--pp-muted)]">Powered by PatchPlan</footer>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-[var(--pp-border)] bg-[var(--pp-surface)] p-6 sm:p-7">{children}</div>;
}

function Closed({ studioName, signedOut }: { studioName: string; signedOut?: boolean }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Sign-ups are closed right now</h2>
      <p className="mt-1 text-sm text-[var(--pp-muted)]">The team isn&apos;t taking new testers at the moment. Check back later.</p>
      {signedOut && (
        <details className="mt-5 text-sm">
          <summary className="cursor-pointer text-[var(--pp-muted)] hover:text-[var(--pp-fg)]">Already a tester? Sign in</summary>
          <div className="mt-4">
            <TesterAuth studioName={studioName} initialMode="signin" />
          </div>
        </details>
      )}
    </Card>
  );
}

function ApplyForm({ scopeId }: { scopeId: string }) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName || "");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [device, setDevice] = useState("");
  const [discord, setDiscord] = useState("");
  const [note, setNote] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (p: string) => setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) return setError("Add a name the team can credit you by.");
    if (!platforms.length) return setError("Pick at least one platform you can test on.");
    if (!agreed) return setError("Please agree to keep beta builds private.");
    setBusy(true);
    setError("");
    try {
      await setDoc(doc(db, "beta_testers", testerDocId(scopeId, user.uid)), {
        scopeId,
        uid: user.uid,
        name: name.trim().slice(0, LIMITS.name),
        email: (user.email || "").slice(0, 200),
        platforms,
        device: device.trim().slice(0, LIMITS.device),
        discord: discord.trim().slice(0, LIMITS.discord),
        note: note.trim().slice(0, LIMITS.note),
        agreed: true,
        status: "pending",
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      setError(err instanceof Error ? `Couldn't send your request: ${err.message}` : "Couldn't send your request.");
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold">Request access</h2>
      <p className="mt-1 text-sm text-[var(--pp-muted)]">Tell the team a little about your setup. They&apos;ll review your request.</p>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label className={portalLabel}>Name or handle (used to credit you)</label>
          <input className={portalInput} value={name} onChange={(e) => setName(e.target.value)} maxLength={LIMITS.name} required />
        </div>
        <div>
          <label className={portalLabel}>Platforms you can test on</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button type="button" key={p} onClick={() => toggle(p)} className={chip(platforms.includes(p))}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={portalLabel}>Device or specs (optional)</label>
            <input className={portalInput} placeholder="e.g. RTX 3060, 16 GB RAM" value={device} onChange={(e) => setDevice(e.target.value)} maxLength={LIMITS.device} />
          </div>
          <div>
            <label className={portalLabel}>Discord (optional)</label>
            <input className={portalInput} placeholder="username" value={discord} onChange={(e) => setDiscord(e.target.value)} maxLength={LIMITS.discord} />
          </div>
        </div>
        <div>
          <label className={portalLabel}>Why do you want to test? (optional)</label>
          <textarea className={`${portalInput} min-h-[90px] resize-y`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={LIMITS.note} placeholder="Games you like, testing you've done before…" />
        </div>
        <label className="flex items-start gap-2.5 text-sm text-[var(--pp-muted)] cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-[var(--pp-accent)]" />
          I&apos;ll keep beta builds and what I see in them private unless the team says otherwise.
        </label>
        <p className="text-xs text-[var(--pp-muted)] -mt-1">
          The team will see your name, email and the reports you send.{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[var(--pp-fg)]">
            Privacy Policy
          </a>
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={busy} className={`${portalPrimary} h-11 w-full sm:w-auto`}>
          {busy && <CircleNotch size={16} className="animate-spin" />} Send request
        </button>
      </form>
    </Card>
  );
}

function StatusCard({ tester, studioName }: { tester: Tester; studioName: string }) {
  const view = {
    pending: { icon: Clock, title: "Request sent", body: `The ${studioName} team will review it soon. This page updates by itself once you're approved, and you'll get an email if the studio has email set up.` },
    denied: { icon: Prohibit, title: "Not this time", body: "The team isn't adding you to this round of testing. Thanks for your interest!" },
    removed: { icon: Prohibit, title: "Your beta access has ended", body: "You can't send new reports. Thanks for helping test!" },
  }[tester.status as "pending" | "denied" | "removed"];
  if (!view) return null;
  const Icon = view.icon;
  return (
    <Card>
      <div className="flex items-start gap-3">
        <Icon size={22} weight="duotone" className="text-[var(--pp-accent)] shrink-0 mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold">{view.title}</h2>
          <p className="mt-1 text-sm text-[var(--pp-muted)]">{view.body}</p>
          {tester.status === "pending" && (
            <p className="mt-4 text-xs text-[var(--pp-muted)]">
              Applied as <span className="text-[var(--pp-fg)]">{tester.name}</span> · {tester.platforms.join(", ")}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function Approved({ scopeId, tester }: { scopeId: string; tester: Tester }) {
  const [program, setProgram] = useState<BetaProgram | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [tab, setTab] = useState<"report" | "mine">("report");

  // Two one-time reads; new reports are added locally instead of re-querying.
  useEffect(() => {
    getDoc(doc(db, "beta_programs", scopeId))
      .then((s) => setProgram((s.data() as BetaProgram) || { instructions: "", build: "" }))
      .catch(() => setProgram({ instructions: "", build: "" }));
    getDocs(query(collection(db, "beta_reports"), where("scopeId", "==", scopeId), where("testerUid", "==", tester.uid), limit(100)))
      .then((s) => setReports(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Report).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))))
      .catch(() => setReports([]));
  }, [scopeId, tester.uid]);

  const tabs = [
    { key: "report" as const, label: "Report an issue" },
    { key: "mine" as const, label: `My reports${reports?.length ? ` (${reports.length})` : ""}` },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start gap-3">
          <CheckCircle size={22} weight="fill" className="text-[var(--pp-accent)] shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">You&apos;re in, {tester.name}</h2>
            {program?.build && <p className="mt-0.5 text-xs text-[var(--pp-muted)]">Current build: <span className="text-[var(--pp-fg)] font-medium">{program.build}</span></p>}
            {program?.instructions ? (
              <p className="mt-3 text-sm whitespace-pre-line leading-relaxed">
                <Linkify text={program.instructions} />
              </p>
            ) : (
              <p className="mt-1 text-sm text-[var(--pp-muted)]">The team will share how to get the build. Report anything that breaks below.</p>
            )}
          </div>
        </div>
      </Card>

      <div className="flex gap-1 p-1 rounded-xl border border-[var(--pp-border)] w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-[var(--pp-surface)] text-[var(--pp-fg)]" : "text-[var(--pp-muted)] hover:text-[var(--pp-fg)]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "report" ? (
        <ReportForm
          scopeId={scopeId}
          tester={tester}
          build={program?.build || ""}
          onSent={(r) => {
            setReports((cur) => [r, ...(cur || [])]);
            setTab("mine");
          }}
        />
      ) : (
        <MyReports reports={reports} />
      )}
    </div>
  );
}

/** Turns bare http(s) links in the studio's instructions into links. Everything else stays text. */
function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="underline text-[var(--pp-accent)] break-all">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}
