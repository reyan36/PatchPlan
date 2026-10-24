"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProfile, deleteUser } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import {
  UserCircle, Buildings, PlugsConnected, EnvelopeSimple, Sparkle, BellSimple, Lifebuoy, ShieldCheck, Copy, Check, ArrowRight, CheckCircle, Circle, Play,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import { Login } from "@/components/auth/LazyLogin";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { IntegrationsTab } from "@/features/integrations/IntegrationsTab";
import { EmailSettingsForm } from "@/features/email/EmailSetup";
import { DomainCard } from "@/features/email/DomainCard";
import { getEmailStatus, type EmailStatus } from "@/lib/email/client";
import { getAIStatus, type AIStatus } from "@/lib/ai/client";
import { DEFAULT_SETTINGS, type EmailSettings } from "@/lib/email/types";
import type { DiscordEvent } from "@/lib/discord";
import { FEATURES, TOUR_SEEN_KEY } from "@/features/tour/ProductTour";
import { Button, Panel, inputClass } from "@/features/ai/ui";
import { ExportData } from "@/features/settings/ExportData";

const TABS = [
  { key: "profile", label: "Profile", icon: UserCircle },
  { key: "workspace", label: "Workspace", icon: Buildings },
  { key: "notifications", label: "Notifications", icon: BellSimple },
  { key: "integrations", label: "Integrations", icon: PlugsConnected },
  { key: "email", label: "Email", icon: EnvelopeSimple },
  { key: "ai", label: "AI", icon: Sparkle },
  { key: "help", label: "Help & tour", icon: Lifebuoy },
  { key: "account", label: "Account", icon: ShieldCheck },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const { activeFamily, loading: familyLoading } = useFamily();
  const [tab, setTab] = useState<TabKey>("profile");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (TABS.some((x) => x.key === t)) setTab(t as TabKey);
  }, []);

  if (loading || familyLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid md:grid-cols-[200px_1fr] gap-8">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }
  if (!user) return <Login />;

  const scopeId = activeFamily ? activeFamily.id : user.uid;
  const select = (t: TabKey) => {
    setTab(t);
    window.history.replaceState(null, "", `/settings?tab=${t}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {activeFamily ? <>Account and <span className="text-zinc-300">{activeFamily.name}</span> workspace settings.</> : "Account and personal workspace settings."}
        </p>
      </header>

      <div className="grid md:grid-cols-[200px_minmax(0,1fr)] gap-6 md:gap-8 items-start">
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:sticky md:top-20 -mx-1 px-1 pb-1 md:pb-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => select(t.key)}
              className={`shrink-0 flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors text-left ${
                tab === t.key ? "bg-white/[0.08] text-white font-medium" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]"
              }`}
            >
              <t.icon size={17} weight={tab === t.key ? "duotone" : "regular"} />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-6">
          {tab === "profile" && <ProfileSection />}
          {tab === "workspace" && <WorkspaceSection />}
          {tab === "notifications" && <NotificationsSection scopeId={scopeId} />}
          {tab === "integrations" && (
            <div className="space-y-6">
              <IntegrationsTab />
              <Section title="Player feedback sources" description="Discord channel, game name and subreddit used by Player Signal.">
                <Link href="/ai?tab=signal" className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white">
                  Manage in PatchPlan AI <ArrowRight size={13} />
                </Link>
              </Section>
            </div>
          )}
          {tab === "email" && <EmailSection scopeId={scopeId} />}
          {tab === "ai" && <AISection />}
          {tab === "help" && <HelpSection />}
          {tab === "account" && <AccountSection onSignOut={logout} />}
        </div>
      </div>
    </div>
  );
}

function Section({ title, description, children, danger }: { title: string; description?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <Panel className={`p-5 sm:p-6 ${danger ? "border-red-500/20 bg-red-500/[0.03]" : ""}`}>
      <h2 className={`text-base font-semibold ${danger ? "text-red-300" : "text-white"}`}>{title}</h2>
      {description && <p className="text-sm text-zinc-500 mt-0.5">{description}</p>}
      <div className="mt-5">{children}</div>
    </Panel>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  if (!user) return null;

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile(user, { displayName: name.trim() });
      setMessage("Saved");
    } catch {
      setMessage("Couldn't save. Try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 2500);
    }
  };

  const initial = (name || user.email || "?").trim()[0]?.toUpperCase();
  return (
    <Section title="Profile" description="How you appear to teammates and on posts you write.">
      <div className="flex items-center gap-4 mb-6">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full border border-white/10" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-xl font-semibold text-zinc-200">{initial}</div>
        )}
        <div>
          <div className="text-sm text-white">{name || "No display name"}</div>
          <div className="text-xs text-zinc-500">{user.email}</div>
        </div>
      </div>
      <div className="space-y-4 max-w-md">
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Display name</span>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Studio Developer" />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Email</span>
          <input className={`${inputClass} opacity-60`} value={user.email || ""} disabled />
          <span className="text-[11px] text-zinc-600">Tied to your sign-in method.</span>
        </label>
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={saving} disabled={name.trim() === (user.displayName || "")}>Save changes</Button>
          {message && <span className="text-xs text-emerald-400">{message}</span>}
        </div>
      </div>
    </Section>
  );
}

function WorkspaceSection() {
  const { user } = useAuth();
  const { activeFamily } = useFamily();
  const [copied, setCopied] = useState(false);

  if (!activeFamily) {
    return (
      <div className="space-y-6">
        <Section title="Personal workspace" description="You're working on your own. Create or join a studio to collaborate.">
          <Link href="/teams" className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white">Go to Teams <ArrowRight size={13} /></Link>
        </Section>
        <Section title="Export your data" description="Download a copy of your personal workspace, any time.">
          <ExportData scopeId={user?.uid || ""} name="Personal workspace" canExport={!!user} />
        </Section>
      </div>
    );
  }

  const me = activeFamily.members.find((m) => m.uid === user?.uid);
  return (
    <div className="space-y-6">
      <Section title={activeFamily.name} description={`You're ${me?.role === "owner" ? "the owner" : "a member"} of this studio.`}>
        <div className="space-y-5">
          <div>
            <div className="text-xs text-zinc-500 mb-1">Invite code</div>
            <div className="flex items-center gap-2">
              <code className="px-3 py-2 rounded-md bg-black/30 border border-white/10 text-lg tracking-[0.3em] text-white font-mono">{activeFamily.joinCode}</code>
              <Button
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(activeFamily.joinCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-[11px] text-zinc-600 mt-1.5">Teammates join from Teams → Join studio.</p>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-2">Members ({activeFamily.members.length})</div>
            <ul className="divide-y divide-white/[0.05] rounded-lg border border-white/[0.08]">
              {activeFamily.members.map((m) => (
                <li key={m.uid} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-xs text-zinc-300">{(m.nickname || m.email || "?")[0]?.toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-zinc-100 truncate">{m.nickname || m.email}{m.uid === user?.uid && <span className="text-zinc-500"> (you)</span>}</div>
                    <div className="text-xs text-zinc-500 truncate">{m.email}</div>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">{m.role}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link href="/teams" className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white">Manage studios in Teams <ArrowRight size={13} /></Link>
        </div>
      </Section>
      <Section title="Export studio data" description="Download a copy of everything in this studio, any time.">
        <ExportData scopeId={activeFamily.id} name={activeFamily.name} canExport={activeFamily.ownerId === user?.uid} />
      </Section>
    </div>
  );
}

const EVENTS: { key: DiscordEvent; title: string; body: string }[] = [
  { key: "taskCompleted", title: "Task completed", body: "When a task moves to Done on the board." },
  { key: "newIdea", title: "New idea", body: "When someone adds an idea or design doc." },
  { key: "newsPublished", title: "News published", body: "When a devlog or announcement goes live." },
  { key: "patchNotes", title: "Patch notes", body: "When Player Signal publishes patch notes, crediting players." },
];

function NotificationsSection({ scopeId }: { scopeId: string }) {
  const [events, setEvents] = useState<Partial<Record<DiscordEvent, boolean>>>({});
  const [hasWebhook, setHasWebhook] = useState<boolean | null>(null);

  useEffect(() => {
    return onSnapshot(doc(db, "integrations", scopeId), (s) => {
      setEvents(s.data()?.discordEvents || {});
      setHasWebhook(!!s.data()?.discordWebhookUrl);
    }, () => setHasWebhook(false));
  }, [scopeId]);

  const toggle = (key: DiscordEvent, on: boolean) => {
    setEvents((e) => ({ ...e, [key]: on }));
    setDoc(doc(db, "integrations", scopeId), { discordEvents: { [key]: on } }, { merge: true });
  };

  return (
    <Section title="Discord notifications" description="Choose which workspace events post to your Discord channel.">
      {hasWebhook === false && (
        <p className="text-xs text-amber-300/90 mb-4">No Discord webhook yet. Add one under Integrations for these to post.</p>
      )}
      <ul className="divide-y divide-white/[0.06]">
        {EVENTS.map((e) => {
          const on = events[e.key] !== false;
          return (
            <li key={e.key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="text-sm text-zinc-100">{e.title}</div>
                <div className="text-xs text-zinc-500">{e.body}</div>
              </div>
              <button
                role="switch"
                aria-checked={on}
                aria-label={e.title}
                onClick={() => toggle(e.key, !on)}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${on ? "bg-[#c8ff00]/80" : "bg-white/10"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function EmailSection({ scopeId }: { scopeId: string }) {
  const { user } = useAuth();
  const { activeFamily } = useFamily();
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [status, setStatus] = useState<EmailStatus | null>(null);

  useEffect(() => {
    getEmailStatus().then(setStatus);
    getDoc(doc(db, "email_settings", scopeId))
      .then((s) => {
        const d = s.data() || {};
        setSettings({ ...DEFAULT_SETTINGS, ...d, theme: { ...DEFAULT_SETTINGS.theme, ...(d.theme || {}) } } as EmailSettings);
      })
      .catch(() => setSettings(DEFAULT_SETTINGS));
  }, [scopeId]);

  return (
    <div className="space-y-6">
      <Section title="Studio details & automatic updates" description="Already filled in from your workspace. Used on every email and your sign-up page.">
        {settings ? (
          <EmailSettingsForm
            key={scopeId}
            scopeId={scopeId}
            settings={settings}
            defaults={{ name: activeFamily?.name || user?.displayName || "", replyTo: user?.email || "" }}
          />
        ) : (
          <Skeleton className="h-40 w-full" />
        )}
      </Section>
      <DomainCard
        key={scopeId}
        scopeId={scopeId}
        studioName={settings?.fromName || activeFamily?.name || user?.displayName || ""}
        sharedAddress={status?.fromAddress ?? null}
        available={!!(status?.resend && status?.firebaseAdmin)}
      />
      <Link href="/email" className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white">Open Email to manage subscribers and campaigns <ArrowRight size={13} /></Link>
    </div>
  );
}

function AISection() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  useEffect(() => {
    getAIStatus().then(setStatus);
  }, []);
  const rows = [
    { ok: status?.nebius, title: "Nebius Token Factory", body: "NEBIUS_API_KEY runs every AI feature." },
    { ok: status?.tavily, title: "Tavily search", body: "TAVILY_API_KEY finds player feedback on Steam, Reddit and the web." },
    { ok: status?.discordBot, title: "Discord bot", body: "DISCORD_BOT_TOKEN reads your feedback channel." },
  ];
  return (
    <Section title="PatchPlan AI" description="AI runs on the server. Keys are set in your environment, not here.">
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.title} className="flex gap-2.5">
            {r.ok ? <CheckCircle size={16} weight="fill" className="text-emerald-400 shrink-0 mt-0.5" /> : <Circle size={16} className="text-zinc-600 shrink-0 mt-0.5" />}
            <div>
              <div className="text-sm text-zinc-100">{r.title}</div>
              <div className="text-xs text-zinc-500">{r.body}</div>
            </div>
          </li>
        ))}
      </ul>
      {status && (
        <div className="mt-5 grid sm:grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-white/[0.08] px-3 py-2"><div className="text-zinc-500">Fast model</div><div className="font-mono text-zinc-300 truncate">{status.models.small}</div></div>
          <div className="rounded-md border border-white/[0.08] px-3 py-2"><div className="text-zinc-500">Reasoning model</div><div className="font-mono text-zinc-300 truncate">{status.models.large}</div></div>
        </div>
      )}
      <Link href="/ai" className="mt-5 inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white">Open PatchPlan AI <ArrowRight size={13} /></Link>
    </Section>
  );
}

function HelpSection() {
  const router = useRouter();
  const restart = () => {
    try {
      localStorage.removeItem(TOUR_SEEN_KEY);
    } catch {
      // Ignore: the ?tour=1 flag starts it anyway.
    }
    router.push("/?tour=1");
  };
  return (
    <div className="space-y-6">
      <Section title="Product tour" description="A one-minute walkthrough of every part of PatchPlan.">
        <Button onClick={restart}><Play size={12} weight="fill" /> Start the tour</Button>
      </Section>
      <Section title="Features">
        <ul className="grid sm:grid-cols-2 gap-2">
          {FEATURES.map((f) => (
            <li key={f.key}>
              <Link href={f.href} className="flex gap-3 rounded-lg border border-white/[0.06] p-3 hover:border-white/15 h-full">
                <f.icon size={17} weight="duotone" className="text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-zinc-100">{f.title}</div>
                  <div className="text-xs text-zinc-500 line-clamp-2">{f.body}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="More">
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/changelog" className="text-zinc-300 hover:text-white">Changelog</Link>
          <Link href="/status" className="text-zinc-300 hover:text-white">System status</Link>
        </div>
      </Section>
    </div>
  );
}

function AccountSection({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  const { userProfile } = useFamily();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  if (!user) return null;

  // A studio whose owner deletes their account can't be managed by anyone, so owners
  // must transfer ownership or delete their studios first.
  const ownedStudios = async () => {
    const ids = userProfile?.joinedFamilies || [];
    const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, "families", id)).catch(() => null)));
    return snaps.filter((s) => s?.exists() && s.data().ownerId === user.uid).map((s) => String(s!.data()!.name || "a studio"));
  };

  const askDelete = async () => {
    setError(null);
    setChecking(true);
    try {
      const owned = await ownedStudios();
      if (owned.length) {
        setError(`You own ${owned.join(", ")}. In Teams, transfer ownership or delete ${owned.length === 1 ? "it" : "them"} before deleting your account.`);
        return;
      }
      setConfirm(true);
    } finally {
      setChecking(false);
    }
  };

  const remove = async () => {
    try {
      await deleteUser(user);
    } catch (err: any) {
      setError(err?.code === "auth/requires-recent-login" ? "For security, sign out and back in, then try again." : "Couldn't delete your account. Try again later.");
      setConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section title="Session" description={`Signed in as ${user.email}.`}>
        <Button variant="ghost" onClick={onSignOut}>Sign out</Button>
      </Section>
      <Section title="Delete account" description="Removes your login permanently. Workspace data isn't deleted automatically." danger>
        {error && <p className="text-xs text-red-300 mb-3">{error}</p>}
        <button onClick={askDelete} disabled={checking} className="px-3 py-1.5 rounded-md bg-red-500/90 text-white text-xs font-medium hover:bg-red-500 disabled:opacity-50">{checking ? "Checking…" : "Delete account"}</button>
      </Section>
      <Modal isOpen={confirm} onClose={() => setConfirm(false)} title="Delete your account?">
        <p className="text-sm text-zinc-400 mb-5">This permanently removes your login. It can&apos;t be undone.</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirm(false)} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white">Cancel</button>
          <button onClick={remove} className="px-3 py-1.5 text-sm rounded-md bg-red-500/90 text-white hover:bg-red-500">Yes, delete</button>
        </div>
      </Modal>
    </div>
  );
}
