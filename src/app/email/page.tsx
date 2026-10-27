"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getCountFromServer, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp, where } from "firebase/firestore";
import { EnvelopeSimple, Users, PaperPlaneTilt, Gear, ChartLine, Plus, CalendarCheck, Trash, Wrench, Megaphone, FileText, Sparkle } from "@phosphor-icons/react";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import { Login } from "@/components/auth/LazyLogin";
import { Modal } from "@/components/ui/Modal";
import { emailFetch, getEmailStatus, type EmailStatus } from "@/lib/email/client";
import { DEFAULT_SETTINGS, EMAIL_LISTS, newBlockId, type Audience, type Campaign, type EmailBlock, type EmailSettings, type Subscriber } from "@/lib/email/types";
import { Button, ErrorNote, Panel, Pill } from "@/features/ai/ui";
import dynamic from "next/dynamic";

// The designer is only needed once a campaign is opened.
const EmailDesigner = dynamic(() => import("@/features/email/EmailDesigner").then((m) => m.EmailDesigner), { loading: () => <div className="h-[600px] rounded-xl border border-white/10 bg-white/[0.02] animate-pulse" /> });
import { Subscribers } from "@/features/email/Subscribers";
import { EmailSettingsForm, SignupShare } from "@/features/email/EmailSetup";
import { DomainCard } from "@/features/email/DomainCard";
import { UpcomingDigest } from "@/features/email/UpcomingDigest";
import { PageLoader } from "@/components/ui/PageLoader";

const TABS = [
  { key: "overview", label: "Overview", icon: ChartLine },
  { key: "campaigns", label: "Campaigns", icon: PaperPlaneTilt },
  { key: "subscribers", label: "Subscribers", icon: Users },
  { key: "settings", label: "Settings", icon: Gear },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const toMs = (t: any) => (t?.toMillis ? t.toMillis() : 0);
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Template = "weekly" | "daily" | "patch" | "announcement" | "blank";

export default function EmailPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeFamily, loading: familyLoading } = useFamily();
  const [tab, setTab] = useState<TabKey>("overview");
  const [status, setStatus] = useState<EmailStatus | null>(null);
  // The full list loads only on the Subscribers tab; everywhere else uses server-side counts.
  const [subscribers, setSubscribers] = useState<Subscriber[] | null>(null);
  const [serverCounts, setServerCounts] = useState<SubscriberCounts | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [settings, setSettings] = useState<EmailSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [studioName, setStudioName] = useState("Your studio");
  const [publicEmailName, setPublicEmailName] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState<Template | null>(null);
  const [error, setError] = useState<string | null>(null);

  const familyId = activeFamily ? activeFamily.id : null;
  const scopeId = familyId || user?.uid || "";

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (TABS.some((x) => x.key === t)) setTab(t as TabKey);
    getEmailStatus().then(setStatus);
  }, []);

  useEffect(() => {
    if (!user || !scopeId) return;
    const unsubs = [
      onSnapshot(
        familyId ? query(collection(db, "campaigns"), where("familyId", "==", familyId)) : query(collection(db, "campaigns"), where("userId", "==", user.uid)),
        (s) => setCampaigns(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Campaign).filter((c) => familyId || !c.familyId)),
        () => setCampaigns([])
      ),
      onSnapshot(
        doc(db, "email_settings", scopeId),
        (s) => {
          const d = s.data() || {};
          setSettings({ ...DEFAULT_SETTINGS, ...d, theme: { ...DEFAULT_SETTINGS.theme, ...(d.theme || {}) } } as EmailSettings);
          setSettingsLoaded(true);
        },
        () => setSettingsLoaded(true)
      ),
      onSnapshot(doc(db, "public_configs", scopeId), (s) => {
        const c = s.data() || {};
        setPublicEmailName(c.emailStudioName || "");
        setStudioName(c.newsStudioName || c.studioName || c.roadmapStudioName || activeFamily?.name || user.displayName || "Your studio");
      }, () => setStudioName(activeFamily?.name || "Your studio")),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user, scopeId, familyId, activeFamily?.name]);

  // Keep the public sign-up page in sync with the name chosen here (covers names saved before this existed).
  useEffect(() => {
    if (!scopeId || publicEmailName === null || !settings.fromName || publicEmailName === settings.fromName) return;
    setDoc(doc(db, "public_configs", scopeId), { emailStudioName: settings.fromName }, { merge: true }).catch(() => {});
  }, [scopeId, publicEmailName, settings.fromName]);

  // Full subscriber list: only while the Subscribers tab is open.
  useEffect(() => {
    if (!user || !scopeId || tab !== "subscribers") return;
    return onSnapshot(
      query(collection(db, "subscribers"), where("scopeId", "==", scopeId)),
      (s) => setSubscribers(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Subscriber)),
      (e) => setError(`Can't read subscribers: ${e.message}. Check Firestore rules (docs/EMAIL.md).`)
    );
  }, [user, scopeId, tab]);

  // Counts are computed by Firestore (about 1 read per 1,000 subscribers) instead of downloading everyone.
  useEffect(() => {
    if (!user || !scopeId) return;
    let live = true;
    const load = () => loadSubscriberCounts(scopeId).then((c) => live && setServerCounts(c)).catch(() => {});
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      live = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [user, scopeId]);

  // Exact live numbers once the list is loaded; server counts before that.
  const counts: SubscriberCounts = useMemo(() => (subscribers ? countsFromList(subscribers) : serverCounts ?? EMPTY_COUNTS), [subscribers, serverCounts]);

  if (authLoading || familyLoading) return <PageLoader label="Loading email" />;
  if (!user) return <Login />;

  const ready = !!(status?.resend && status.fromAddress && status.firebaseAdmin);
  const open = campaigns.find((c) => c.id === openId);

  const select = (t: TabKey) => {
    setTab(t);
    setOpenId(null);
    window.history.replaceState(null, "", `/email?tab=${t}`);
  };

  const create = async (template: Template) => {
    setError(null);
    setCreating(template);
    try {
      let subject = "";
      let preheader = "";
      let blocks: EmailBlock[] = [];
      let audience: Audience = "all";
      const kind: Campaign["kind"] = template === "weekly" || template === "daily" ? template : "campaign";

      if (template === "weekly" || template === "daily") {
        const d = await emailFetch<{ subject: string; preheader: string; blocks: EmailBlock[] }>("digest", { scopeId, kind: template });
        ({ subject, preheader, blocks } = d);
        audience = template;
      } else if (template === "patch") {
        const snaps = await Promise.all([
          getDocs(query(collection(db, "articles"), where(familyId ? "familyId" : "userId", "==", scopeId), where("category", "==", "Patch Notes"))).catch(() => null),
        ]);
        const latest = (snaps[0]?.docs || []).map((d) => ({ id: d.id, ...d.data() }) as any).filter((a) => a.status === "published" && (familyId || !a.familyId)).sort((a, b) => toMs(b.publishedAt) - toMs(a.publishedAt))[0];
        subject = latest ? latest.title : "Patch notes";
        preheader = latest?.excerpt || "";
        blocks = [
          { id: newBlockId(), type: "heading", text: latest?.title || "Patch notes" },
          { id: newBlockId(), type: "text", text: latest?.excerpt || "Here's what changed in the latest update." },
          ...(latest?.coverImage ? [{ id: newBlockId(), type: "image", url: latest.coverImage, alt: latest.title } as EmailBlock] : []),
          { id: newBlockId(), type: "button", label: "Read the full patch notes", url: latest ? `${window.location.origin}/p/article/${latest.id}` : "https://" },
        ];
        audience = "announcements";
      } else if (template === "announcement") {
        subject = "Big news";
        blocks = [
          { id: newBlockId(), type: "heading", text: "We have something to share" },
          { id: newBlockId(), type: "text", text: "Tell players what's happening and why it matters to them." },
          { id: newBlockId(), type: "button", label: "Learn more", url: "https://" },
          { id: newBlockId(), type: "social" },
        ];
        audience = "announcements";
      }

      const ref = await addDoc(collection(db, "campaigns"), {
        userId: user.uid,
        familyId,
        subject,
        preheader,
        blocks,
        theme: settings.theme,
        audience,
        kind,
        status: "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPicking(false);
      setTab("campaigns");
      setOpenId(ref.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the campaign.");
    } finally {
      setCreating(null);
    }
  };

  const sorted = [...campaigns].sort((a, b) => (toMs(b.sentAt) || toMs(b.updatedAt) || toMs(b.createdAt)) - (toMs(a.sentAt) || toMs(a.updatedAt) || toMs(a.createdAt)));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <EnvelopeSimple size={26} weight="duotone" /> Email
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Collect player emails and send newsletters, patch notes and automatic weekly or daily updates.</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg border border-white/10 bg-white/[0.02] self-start overflow-x-auto max-w-full">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => select(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${tab === t.key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"}`}
            >
              <t.icon size={14} weight={tab === t.key ? "duotone" : "regular"} />
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <ErrorNote message={error} />

      {open ? (
        <EmailDesigner
          key={open.id}
          user={user}
          scopeId={scopeId}
          studioName={settings.fromName || studioName}
          address={settings.address}
          subscriberCounts={counts}
          campaign={open}
          ready={ready}
          onClose={() => setOpenId(null)}
        />
      ) : (
        <>
          {tab === "overview" && (
            <div className="space-y-6">
              {status && !ready && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-400 flex items-center gap-2">
                  <Wrench size={16} className="shrink-0" /> Email sending isn&apos;t switched on for this PatchPlan server yet. You can still design emails in the meantime.
                </div>
              )}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Active subscribers" value={counts.all} />
                <Stat label="New this week" value={counts.newThisWeek} />
                <Stat label="Unsubscribed" value={counts.unsubscribed} />
                <Stat label="Emails sent" value={campaigns.filter((c) => c.status === "sent").reduce((n, c) => n + (c.recipients || 0), 0)} />
              </div>

              <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
                <Panel className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Start an email</h3>
                    <Button variant="ghost" onClick={() => select("campaigns")}>All campaigns</Button>
                  </div>
                  <TemplateGrid onPick={create} creating={creating} />
                </Panel>

                <Panel className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2"><CalendarCheck size={16} weight="duotone" /> Automatic updates</h3>
                    <Button variant="ghost" onClick={() => select("settings")}>Edit</Button>
                  </div>
                  <Automation on={settings.weekly.enabled} title="Weekly update" detail={`Every ${DAYS[settings.weekly.day]} · ${counts.weekly ?? 0} subscribers`}>
                    {settings.weekly.enabled && scopeId && <UpcomingDigest kind="weekly" scopeId={scopeId} settings={settings} subscribers={counts.weekly ?? 0} />}
                  </Automation>
                  <Automation on={settings.daily.enabled} title="Daily digest" detail={`When something ships · ${counts.daily ?? 0} subscribers`}>
                    {settings.daily.enabled && scopeId && <UpcomingDigest kind="daily" scopeId={scopeId} settings={settings} subscribers={counts.daily ?? 0} />}
                  </Automation>
                  <p className="text-xs text-zinc-500">Everything new since the last email (published news and tasks moved to Done) goes out together in one. Skipped when nothing is new.</p>
                </Panel>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-white">Recent</h3>
                <CampaignList campaigns={sorted.slice(0, 5)} onOpen={setOpenId} />
              </section>
            </div>
          )}

          {tab === "campaigns" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-zinc-500">{campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}</p>
                <Button onClick={() => setPicking(true)}><Plus size={13} weight="bold" /> New campaign</Button>
              </div>
              <CampaignList campaigns={sorted} onOpen={setOpenId} />
            </div>
          )}

          {tab === "subscribers" && (
            <div className="space-y-4">
              <SignupShare scopeId={scopeId} />
              {subscribers ? <Subscribers scopeId={scopeId} subscribers={subscribers} /> : <div className="h-40 rounded-xl border border-white/10 bg-white/[0.02] animate-pulse" />}
            </div>
          )}

          {tab === "settings" && (
            <div className="space-y-4 max-w-2xl">
            <Panel className="p-4 sm:p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Studio details & automatic updates</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Already filled in from your workspace. Change anything you like.</p>
              </div>
              {settingsLoaded && <EmailSettingsForm key={scopeId} scopeId={scopeId} settings={settings} defaults={{ name: studioName, replyTo: user.email || "" }} />}
            </Panel>
            <DomainCard key={scopeId} scopeId={scopeId} studioName={settings.fromName || studioName} sharedAddress={status?.fromAddress ?? null} available={!!(status?.resend && status?.firebaseAdmin)} />
            </div>
          )}
        </>
      )}

      <Modal isOpen={picking} onClose={() => setPicking(false)} title="New campaign">
        <TemplateGrid onPick={create} creating={creating} />
      </Modal>
    </div>
  );
}

type SubscriberCounts = Record<Audience, number> & { unsubscribed: number; newThisWeek: number | null };
const EMPTY_COUNTS = { all: 0, unsubscribed: 0, newThisWeek: 0 } as SubscriberCounts;

function countsFromList(list: Subscriber[]): SubscriberCounts {
  const active = list.filter((s) => s.status === "active");
  const weekAgo = Date.now() - 7 * 86400000;
  const c = { all: active.length, unsubscribed: list.filter((s) => s.status === "unsubscribed").length, newThisWeek: list.filter((s) => toMs(s.createdAt) > weekAgo).length } as SubscriberCounts;
  EMAIL_LISTS.forEach((l) => (c[l.key] = active.filter((s) => s.lists.includes(l.key)).length));
  return c;
}

async function loadSubscriberCounts(scopeId: string): Promise<SubscriberCounts> {
  const col = collection(db, "subscribers");
  const count = (...filters: Parameters<typeof where>[]) =>
    getCountFromServer(query(col, where("scopeId", "==", scopeId), ...filters.map((f) => where(...f)))).then((r) => r.data().count);
  const [all, unsubscribed, ...lists] = await Promise.all([
    count(["status", "==", "active"]),
    count(["status", "==", "unsubscribed"]),
    ...EMAIL_LISTS.map((l) => count(["status", "==", "active"], ["lists", "array-contains", l.key])),
  ]);
  // Uses the composite index in firestore.indexes.json (scopeId + createdAt descending; the orderBy
  // must match that direction). Shows "—" if the index is missing.
  const newThisWeek = await getCountFromServer(
    query(col, where("scopeId", "==", scopeId), where("createdAt", ">=", Timestamp.fromMillis(Date.now() - 7 * 86400000)), orderBy("createdAt", "desc"))
  )
    .then((r) => r.data().count)
    .catch(() => null);
  const c = { all, unsubscribed, newThisWeek } as SubscriberCounts;
  EMAIL_LISTS.forEach((l, i) => (c[l.key] = lists[i]));
  return c;
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <Panel className="p-4">
      <div className="text-2xl font-semibold text-white tabular-nums">{value == null ? "—" : value.toLocaleString()}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
    </Panel>
  );
}

function Automation({ on, title, detail, children }: { on: boolean; title: string; detail: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${on ? "bg-emerald-400" : "bg-zinc-600"}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-200">{title}</div>
        <div className="text-xs text-zinc-400">{on ? detail : "Off"}</div>
        {children}
      </div>
    </div>
  );
}

function TemplateGrid({ onPick, creating }: { onPick: (t: Template) => void; creating: Template | null }) {
  const items: { key: Template; title: string; body: string; icon: typeof Sparkle }[] = [
    { key: "weekly", title: "This week's update", body: "Built from this week's news and shipped tasks", icon: CalendarCheck },
    { key: "patch", title: "Patch notes", body: "From your latest published patch notes", icon: FileText },
    { key: "announcement", title: "Announcement", body: "Launch, event or big news", icon: Megaphone },
    { key: "blank", title: "Blank", body: "Start from scratch or write with AI", icon: Sparkle },
  ];
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {items.map((t) => (
        <button
          key={t.key}
          onClick={() => onPick(t.key)}
          disabled={!!creating}
          className="text-left rounded-lg border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02] p-3 flex gap-3 disabled:opacity-50"
        >
          <t.icon size={18} weight="duotone" className={`text-zinc-400 shrink-0 mt-0.5 ${creating === t.key ? "animate-pulse" : ""}`} />
          <div>
            <div className="text-sm text-white">{creating === t.key ? "Preparing…" : t.title}</div>
            <div className="text-xs text-zinc-500">{t.body}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function CampaignList({ campaigns, onOpen }: { campaigns: Campaign[]; onOpen: (id: string) => void }) {
  const [confirm, setConfirm] = useState<Campaign | null>(null);
  if (!campaigns.length) {
    return <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-600">No campaigns yet.</div>;
  }
  const style = { draft: "border-white/10 text-zinc-400", sending: "border-amber-500/25 text-amber-300", sent: "border-emerald-500/25 text-emerald-300", failed: "border-red-500/25 text-red-300" };
  return (
    <>
      <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/10 overflow-hidden">
        {campaigns.map((c) => (
          <li key={c.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]">
            <button onClick={() => onOpen(c.id)} className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-white truncate">{c.subject || "Untitled email"}</span>
                {c.auto && (
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-300" title="Sent by your automatic updates schedule">
                    <CalendarCheck size={11} /> Automatic
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400">
                {c.kind !== "campaign" ? `${c.auto ? "Scheduled " : ""}${c.kind === "daily" ? "daily digest" : "weekly update"} · ` : ""}
                {c.status === "sent"
                  ? `Sent ${new Date(toMs(c.sentAt)).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} to ${c.recipients ?? 0} subscriber${c.recipients === 1 ? "" : "s"}`
                  : c.error
                  ? <span className="text-red-300/80">{c.error}</span>
                  : `Edited ${toMs(c.updatedAt) ? new Date(toMs(c.updatedAt)).toLocaleDateString() : "just now"}`}
              </div>
            </button>
            <Pill className={style[c.status]}>{c.status}</Pill>
            {c.status === "draft" && (
              <button onClick={() => setConfirm(c)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-300 p-1" title="Delete draft">
                <Trash size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <Modal isOpen={!!confirm} onClose={() => setConfirm(null)} title="Delete draft?">
        <p className="text-sm text-zinc-400 mb-5">“{confirm?.subject || "Untitled email"}” will be deleted.</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirm(null)} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white">Cancel</button>
          <button onClick={async () => { if (confirm) await deleteDoc(doc(db, "campaigns", confirm.id)); setConfirm(null); }} className="px-3 py-1.5 text-sm rounded-md bg-red-500/90 text-white hover:bg-red-500">Delete</button>
        </div>
      </Modal>
    </>
  );
}
