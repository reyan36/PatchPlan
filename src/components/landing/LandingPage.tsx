"use client";

import { useState } from "react";
import Link from "next/link";
import {
  SquaresFour,
  ArrowRight,
  DiscordLogo,
  XLogo,
  YoutubeLogo,
  GithubLogo,
  DiamondsFour,
  CaretRight,
  X,
  ShieldCheck,
  GameController,
  Globe,
  Sparkle,
  MagnifyingGlass,
  Command,
  Cpu,
  Plus,
  CheckCircle,
} from "@phosphor-icons/react";
import { CookieBanner } from "./CookieBanner";
import { Login } from "@/components/auth/Login";

type BentoFeature = {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  dimensions: string;
  wide?: boolean;
};

const BENTO_FEATURES: BentoFeature[] = [
  {
    id: "board",
    title: "Game-native sprint boards",
    description:
      "Organize Art, Code, Audio, Design, and Bug tasks across milestone columns built for game production.",
    imageSrc: "/landing/feature-board.png",
    dimensions: "1200 × 900 px",
  },
  {
    id: "gdd",
    title: "Living GDDs & whiteboard",
    description:
      "Write structured design docs alongside an infinite Tldraw canvas for combat loops, level layouts, and lore.",
    imageSrc: "/landing/feature-gdd.png",
    dimensions: "1200 × 900 px",
  },
  {
    id: "publish",
    title: "Publish effortlessly",
    description:
      "Share live public roadmaps and themed press pages with your players or publishers in a single click.",
    imageSrc: "/landing/feature-roadmap.png",
    dimensions: "1200 × 900 px",
  },
  {
    id: "discord",
    title: "Discord webhook sync",
    description:
      "Automatically post completed tasks, new ideas, and published devlogs straight into your studio Discord channels.",
    imageSrc: "/landing/feature-discord.png",
    dimensions: "1200 × 900 px",
  },
  {
    id: "network",
    title: "Creator & press network",
    description:
      "Track YouTubers, Twitch streamers, press outlets, and publishers by audience tier and game niche with instant CSV import and export.",
    imageSrc: "/landing/feature-network.png",
    dimensions: "2000 × 900 px",
    wide: true,
  },
];

export function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [policyModal, setPolicyModal] = useState<"terms" | "privacy" | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const currentYear = new Date().getFullYear();

  const faqs = [
    {
      q: "What is PatchPlan?",
      a: "PatchPlan is a purpose-built project management and roadmapping platform for game developers. It unites game-specific sprint boards (Art, Code, Audio, Design, Bugs), living game design documentation with whiteboard canvases, and automated public roadmaps for your player community.",
    },
    {
      q: "How do I get started?",
      a: "Sign in with your Google or email account to launch your studio workspace in seconds. You can start planning milestones right away or invite team members to collaborate using your unique studio join code.",
    },
    {
      q: "Do I need to know how to code?",
      a: "Not at all. PatchPlan is designed for the entire game studio—game designers drafting lore, concept artists organizing asset drops, sound designers tracking stems, and producers coordinating launch dates.",
    },
    {
      q: "How is PatchPlan different from Jira, Trello, or Linear?",
      a: "Traditional enterprise tools are weighed down by 40-field corporate ticket setup forms. PatchPlan focuses strictly on game pipelines: milestone-oriented sprints, living GDDs with infinite whiteboard canvases, and 1-click public roadmaps that sync directly from your board.",
    },
    {
      q: "Can players and publishers see my roadmap without an account?",
      a: "Yes. Every studio workspace gets a dedicated public URL (e.g. /p/roadmap/[your-studio]). Players, backers, and publishers can follow your development progress and read patch notes instantly without needing to sign up or log in.",
    },
    {
      q: "How does the Discord integration work?",
      a: "Simply paste your studio Discord channel's incoming webhook URL in your workspace settings. Whenever you mark milestones complete or publish patch notes, PatchPlan formats and dispatches rich embeds directly to your Discord community.",
    },
    {
      q: "Do I own the game design docs and data I create?",
      a: "Yes, 100%. You retain complete intellectual property and ownership over all game design documents, lore bibles, whiteboard canvas sketches, and milestone plans created in your studio workspace.",
    },
    {
      q: "Is PatchPlan free during beta?",
      a: "Yes, 100% free while in open beta. All features—including unlimited tasks, whiteboard canvas, team collaboration, public roadmaps, and Discord webhooks—are fully accessible with zero fees.",
    },
    {
      q: "What platforms and game engines does PatchPlan support?",
      a: "PatchPlan runs in any modern web browser on macOS, Windows, and Linux. It is engine-agnostic and pairs seamlessly with Unity, Unreal Engine, Godot, GameMaker, Bevy, or custom game engines.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#121212] text-[#FAFAFA] selection:bg-white/20 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* ─── Floating Island Navbar ─── */}
      <header className="fixed top-4 inset-x-0 z-40 max-w-[860px] mx-auto px-4">
        <nav className="bg-[#1a1a1e]/80 border border-white/[0.08] backdrop-blur-2xl rounded-full px-4 py-2 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center text-white group-hover:bg-white/[0.12] transition-colors">
              <SquaresFour size={15} weight="fill" />
            </div>
            <span className="font-semibold text-[13px] tracking-tight text-white">
              patchplan
            </span>
          </Link>

          {/* Center nav links */}
          <div className="hidden sm:flex items-center gap-6 text-[13px] text-neutral-400">
            <Link href="/" className="hover:text-white transition-colors duration-150">
              Home
            </Link>
            <a href="#features" className="hover:text-white transition-colors duration-150">
              Features
            </a>
            <Link href="/changelog" className="hover:text-white transition-colors duration-150">
              Changelog
            </Link>
            <a href="#faq" className="hover:text-white transition-colors duration-150">
              FAQ
            </a>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-[13px] text-neutral-400 hover:text-white transition-colors duration-150 px-3 py-1.5"
            >
              Sign in
            </button>
            <div className="w-px h-4 bg-white/[0.12] mx-1 hidden sm:block" />
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-4 py-1.5 rounded-full bg-white text-[#0a0a0a] font-semibold text-[13px] hover:bg-neutral-200 transition-colors active:scale-[0.97] shadow-sm"
            >
              Get Started
            </button>
          </div>
        </nav>
      </header>

      {/* ─── Hero Section ─── */}
      <main className="relative z-10 pt-36 sm:pt-44 pb-16 px-4 max-w-5xl mx-auto flex flex-col items-center text-center">
        <h1 className="text-[clamp(2.25rem,7vw,5rem)] font-extrabold tracking-[-0.035em] text-white leading-[1.05] max-w-[800px] mb-6">
          The project manager{" "}
          <br className="hidden sm:block" />
          built for game devs.
        </h1>

        <p className="text-base sm:text-lg text-neutral-400 max-w-lg leading-relaxed mb-10">
          Sprint boards, public roadmaps, game design docs, and Discord notifications — without the enterprise bloat.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-white text-[#0a0a0a] font-semibold text-sm hover:bg-neutral-200 transition-colors active:scale-[0.97] flex items-center justify-center gap-2"
          >
            Start for free
          </button>
          <a
            href="#features"
            className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-white/[0.12] text-neutral-300 font-medium text-sm hover:bg-white/[0.04] hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <span>Explore features</span>
            <ArrowRight size={14} weight="bold" className="text-neutral-500" />
          </a>
        </div>
      </main>

      {/* ─── 3-Pillar Strip (Image 1 Style) ─── */}
      <section className="py-16 sm:py-20 px-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 sm:gap-8 text-center">
          {/* Pillar 1 */}
          <div className="flex flex-col items-center">
            <div className="mb-3.5 text-neutral-400">
              <GameController size={22} weight="regular" />
            </div>
            <h3 className="text-[15px] font-semibold text-neutral-200 tracking-tight mb-1.5">
              Game-native
            </h3>
            <p className="text-[13px] text-neutral-500 leading-relaxed max-w-[230px]">
              Pipelines for Art, Code, Audio, Design, and Bugs — built around milestones.
            </p>
          </div>

          {/* Pillar 2 — Discord Integration */}
          <div className="flex flex-col items-center">
            <div className="mb-3.5 text-neutral-400">
              <DiscordLogo size={22} weight="regular" />
            </div>
            <h3 className="text-[15px] font-semibold text-neutral-200 tracking-tight mb-1.5">
              Discord-integrated
            </h3>
            <p className="text-[13px] text-neutral-500 leading-relaxed max-w-[230px]">
              Shipped tasks, new ideas, and devlogs post straight to your server automatically.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="flex flex-col items-center">
            <div className="mb-3.5 text-neutral-400">
              <Globe size={22} weight="regular" />
            </div>
            <h3 className="text-[15px] font-semibold text-neutral-200 tracking-tight mb-1.5">
              Community-ready
            </h3>
            <p className="text-[13px] text-neutral-500 leading-relaxed max-w-[230px]">
              Publish live roadmaps and press pages for your players in a single click.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Bento Feature Grid (Image 2 Style) ─── */}
      <section id="features" className="py-12 sm:py-16 px-4 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BENTO_FEATURES.map((item) => {
            const hasImage = !!loadedImages[item.id];
            return (
              <div
                key={item.id}
                className={`group rounded-2xl bg-[#0a0a0c] border border-white/[0.07] hover:border-white/[0.14] transition-colors overflow-hidden flex flex-col justify-between ${
                  item.wide ? "md:col-span-2" : ""
                }`}
              >
                {/* Top Text Header */}
                <div className="p-6 sm:p-8 pb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-neutral-400 mt-1.5 leading-relaxed max-w-md">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Visual Frame */}
                <div
                  className={`relative mx-4 sm:mx-6 mb-0 rounded-t-xl overflow-hidden border-t border-x border-white/[0.08] bg-gradient-to-b from-[#141418] to-[#0c0c0e] ${
                    item.wide ? "h-[260px] sm:h-[340px]" : "h-[240px] sm:h-[290px]"
                  }`}
                >
                  {/* User-supplied image (renders automatically once placed in /public/landing/) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageSrc}
                    alt={item.title}
                    onLoad={() => setLoadedImages((prev) => ({ ...prev, [item.id]: true }))}
                    onError={() => setLoadedImages((prev) => ({ ...prev, [item.id]: false }))}
                    className={`w-full h-full object-cover object-top transition-opacity duration-300 ${
                      hasImage ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0"
                    }`}
                  />

                  {/* Built-in sleek dark UI preview (visible until custom image is dropped in) */}
                  {!hasImage && <BentoFallbackVisual id={item.id} imageSrc={item.imageSrc} dimensions={item.dimensions} />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Nebius × NVIDIA Global AI Hackathon Section ─── */}
      <section className="py-16 sm:py-24 px-4 max-w-5xl mx-auto">
        <div className="relative rounded-3xl bg-[#0a0a0c] border border-white/[0.08] overflow-hidden p-6 sm:p-10 md:p-12">
          {/* Subtle lime/green ambient glow inspired by Nebius × NVIDIA */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#b8ff01]/[0.07] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 w-80 h-80 rounded-full bg-[#76b900]/[0.06] blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-6 space-y-5 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/25 text-[#d4ff33] text-xs font-medium">
                <Cpu size={14} weight="duotone" />
                <span>Nebius × NVIDIA Global AI Hackathon</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-[1.12]">
                Search everything.{" "}
                <span className="text-neutral-400">
                  Generate your own studio tools.
                </span>
              </h2>

              <p className="text-sm text-neutral-400 leading-relaxed">
                Built on open AI infrastructure with Nebius and NVIDIA. Search across your entire workspace—boards, design docs, whiteboards, and contacts—or prompt PatchPlan to build a custom feature tailored to your studio workflow.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
                    <MagnifyingGlass size={14} className="text-[#c8ff00]" weight="bold" />
                    <span>Universal Workspace Search</span>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Instant semantic recall across every task, GDD page, devlog, and creator contact.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
                    <Sparkle size={14} className="text-[#c8ff00]" weight="fill" />
                    <span>Custom Feature Builder</span>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Need a bug bounty tracker or localization sheet? Describe it and generate your own module.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Interactive-Style Visual Mockup */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl bg-[#111115] border border-white/[0.1] shadow-2xl overflow-hidden">
                {/* Command bar input */}
                <div className="px-4 py-3.5 border-b border-white/[0.07] flex items-center justify-between gap-3 bg-[#15151a]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MagnifyingGlass size={15} className="text-[#c8ff00] shrink-0" weight="bold" />
                    <span className="text-xs sm:text-[13px] text-neutral-200 truncate">
                      Create a localization progress tracker for 6 languages...
                    </span>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-neutral-400 border border-white/[0.08]">
                    <Command size={11} /> K
                  </span>
                </div>

                {/* Body results + feature synthesis preview */}
                <div className="p-4 space-y-3 text-left">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 px-1">
                    Workspace Recall
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="text-neutral-200 truncate">Combat Overhaul GDD · Boss Phase 2</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 shrink-0 ml-2">Ideas & Docs</span>
                    </div>

                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-neutral-200 truncate">Update 2.2.1 · Patch Notes</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 shrink-0 ml-2">Studio News</span>
                    </div>
                  </div>

                  {/* Custom Feature Generator Card */}
                  <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-br from-[#c8ff00]/[0.08] via-[#16161c] to-[#121216] border border-[#c8ff00]/25 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#d4ff33]">
                        <Sparkle size={12} weight="fill" />
                        <span>Synthesizing Custom Studio Module</span>
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        Nebius · NVIDIA NIM
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/50 border border-white/[0.07] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">Localization Matrix</div>
                        <div className="text-[11px] text-neutral-400">EN · JP · DE · FR · ES · ZH-CN string status</div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#c8ff00] text-black font-semibold text-[11px]">
                        <Plus size={11} weight="bold" /> Add to Workspace
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section id="faq" className="pt-12 pb-24 px-4 max-w-2xl mx-auto w-full">
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white text-center mb-16">
          FAQ
        </h2>

        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`transition-all duration-150 ${
                  isOpen
                    ? "border border-white/20 rounded-md my-1.5 bg-white/[0.02]"
                    : "hover:bg-white/[0.01]"
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full py-4 px-3 sm:px-4 flex items-center justify-between text-left group"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-[16px] sm:text-[17px] font-semibold tracking-tight transition-colors pr-4 ${
                      isOpen ? "text-white" : "text-neutral-200 group-hover:text-white"
                    }`}
                  >
                    {faq.q}
                  </span>
                  <CaretRight
                    size={16}
                    weight="bold"
                    className={`text-neutral-500 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-90 text-white" : "group-hover:text-neutral-300"
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-3 sm:px-4 pb-4 text-sm text-neutral-400 leading-relaxed animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <section className="pb-16 px-4 max-w-3xl mx-auto flex flex-col items-center text-center">
        <footer className="w-full flex flex-col items-center gap-4 text-xs text-neutral-500">
          {/* Row 1: Copyright & Text links */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-neutral-400">
            <span suppressHydrationWarning>&copy; {currentYear} PatchPlan</span>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <Link href="/changelog" className="hover:text-white transition-colors">
              Changelog
            </Link>
            <Link href="/status" className="hover:text-white transition-colors">
              Status
            </Link>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
            <button onClick={() => setPolicyModal("terms")} className="hover:text-white transition-colors">
              Terms
            </button>
            <button onClick={() => setPolicyModal("privacy")} className="hover:text-white transition-colors">
              Privacy Policy
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("patchplan_cookie_consent");
                window.location.reload();
              }}
              className="hover:text-white transition-colors"
            >
              Cookie Settings
            </button>
          </div>

          {/* Row 2: Social icons & Attribution */}
          <div className="flex items-center gap-4 text-neutral-400 mt-1">
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors p-1"
              aria-label="X (Twitter)"
            >
              <XLogo size={15} weight="bold" />
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors p-1"
              aria-label="Discord"
            >
              <DiscordLogo size={15} weight="fill" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors p-1"
              aria-label="YouTube"
            >
              <YoutubeLogo size={15} weight="fill" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors p-1"
              aria-label="GitHub"
            >
              <GithubLogo size={15} weight="fill" />
            </a>

            <div className="flex items-center gap-1.5 text-neutral-500 text-[11px] pl-2 border-l border-white/10">
              <span>Made for game developers</span>
              <DiamondsFour size={12} weight="fill" className="text-neutral-400" />
            </div>
          </div>
        </footer>
      </section>

      {/* ─── Cookie Consent Floating Banner ─── */}
      <CookieBanner />

      {/* ─── Sign In / Sign Up Modal ─── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0e0e12] border border-white/15 rounded-2xl max-w-md w-full p-6 text-neutral-200 relative shadow-2xl">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors p-1"
              aria-label="Close modal"
            >
              <X size={18} weight="bold" />
            </button>
            <div className="pt-2">
              <Login />
            </div>
          </div>
        </div>
      )}

      {/* ─── Terms & Privacy Modal ─── */}
      {policyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0e0e12] border border-white/15 rounded-2xl max-w-lg w-full p-6 text-neutral-300 relative shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-semibold text-base">
                <ShieldCheck size={20} weight="duotone" className="text-indigo-400" />
                <h3>{policyModal === "terms" ? "Terms of Service" : "Privacy & Data Policy"}</h3>
              </div>
              <button
                onClick={() => setPolicyModal(null)}
                className="text-neutral-400 hover:text-white transition-colors p-1"
                aria-label="Close modal"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed max-h-[60vh] overflow-y-auto pr-2 text-neutral-400">
              {policyModal === "terms" ? (
                <>
                  <p className="text-neutral-300 font-medium">1. Acceptance of Terms</p>
                  <p>
                    By creating an account or accessing PatchPlan, you agree to these Terms. PatchPlan is currently offered in open beta for game developers and studios.
                  </p>

                  <p className="text-neutral-300 font-medium">2. Studio Workspace & IP Ownership</p>
                  <p>
                    You retain 100% intellectual property ownership of your game design documents, whiteboards, tasks, and media. PatchPlan does not claim ownership over any user-created studio assets.
                  </p>

                  <p className="text-neutral-300 font-medium">3. Acceptable Use</p>
                  <p>
                    You agree not to abuse public roadmap links, spam Discord webhook dispatches, or attempt unauthorized access to other studios&apos; private family workspaces.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-neutral-300 font-medium">1. Data Storage & Security</p>
                  <p>
                    PatchPlan utilizes secure Firebase Authentication and encrypted Google Cloud Firestore databases to protect your studio data.
                  </p>

                  <p className="text-neutral-300 font-medium">2. Zero Third-Party Advertising</p>
                  <p>
                    We do not sell personal data, display third-party advertisements, or deploy cross-site tracking pixels. Your session cookies are used solely to keep you logged in.
                  </p>

                  <p className="text-neutral-300 font-medium">3. Data Deletion</p>
                  <p>
                    You may export or delete your studio workspace and roadmap at any time from your settings panel.
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                onClick={() => setPolicyModal(null)}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Built-in dark UI visual inside each Bento card until user drops their image into /public/landing/ */
function BentoFallbackVisual({
  id,
  imageSrc,
  dimensions,
}: {
  id: string;
  imageSrc: string;
  dimensions: string;
}) {
  return (
    <div className="w-full h-full p-5 flex flex-col justify-between relative select-none">
      {id === "board" && (
        <div className="space-y-2.5 my-auto max-w-xs mx-auto w-full">
          <div className="p-3 rounded-xl bg-[#18181d] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                Code
              </span>
              <span className="text-xs font-medium text-neutral-200">Melee Hitbox & Roll</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500">v0.4</span>
          </div>
          <div className="p-3 rounded-xl bg-[#18181d] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20">
                Art
              </span>
              <span className="text-xs font-medium text-neutral-200">Boss Phase 2 Rig</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">Done</span>
          </div>
          <div className="p-3 rounded-xl bg-[#18181d] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                Audio
              </span>
              <span className="text-xs font-medium text-neutral-200">Cathedral Stems</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500">Review</span>
          </div>
        </div>
      )}

      {id === "gdd" && (
        <div className="my-auto max-w-xs mx-auto w-full rounded-xl bg-[#18181d] border border-white/[0.08] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Combat Loop Spec</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/20">
              Doc + Canvas
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.06] text-[10px] text-center text-neutral-300">
              Stamina
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.06] text-[10px] text-center text-neutral-300">
              Parry Window
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.06] text-[10px] text-center text-neutral-300">
              Crit Stagger
            </div>
          </div>
        </div>
      )}

      {id === "publish" && (
        <div className="my-auto max-w-xs mx-auto w-full rounded-xl bg-[#18181d] border border-white/[0.08] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Public Press & Roadmap</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
              <CheckCircle size={12} weight="fill" /> Live
            </span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-black/50 border border-white/[0.06] font-mono text-[11px] text-neutral-400 truncate">
            patchplan.app/p/news/ramjet
          </div>
        </div>
      )}

      {id === "discord" && (
        <div className="my-auto max-w-xs mx-auto w-full rounded-xl bg-[#18181d] border border-indigo-500/20 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <DiscordLogo size={15} weight="fill" />
            <span>#dev-updates</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
              BOT
            </span>
          </div>
          <div className="pl-2.5 border-l-2 border-emerald-400 space-y-1">
            <div className="text-xs font-medium text-white">Update 2.2.1 Published</div>
            <div className="text-[11px] text-neutral-400">New features and balance changes are now live.</div>
          </div>
        </div>
      )}

      {id === "network" && (
        <div className="my-auto max-w-2xl mx-auto w-full rounded-xl bg-[#18181d] border border-white/[0.08] p-4 space-y-2">
          <div className="grid grid-cols-4 text-[11px] text-neutral-500 pb-1.5 border-b border-white/[0.06]">
            <span>Creator</span>
            <span>Platform</span>
            <span>Tier</span>
            <span>Niche</span>
          </div>
          <div className="grid grid-cols-4 items-center text-xs py-1">
            <span className="font-medium text-white">Wanderbots</span>
            <span className="text-red-400">YouTube</span>
            <span className="font-mono text-[11px] text-amber-300">100K–500K</span>
            <span className="text-neutral-400">#Roguelike</span>
          </div>
          <div className="grid grid-cols-4 items-center text-xs py-1">
            <span className="font-medium text-white">CohhCarnage</span>
            <span className="text-purple-400">Twitch</span>
            <span className="font-mono text-[11px] text-yellow-300">500K+</span>
            <span className="text-neutral-400">#RPG</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-600 pt-2">
        <span>{imageSrc}</span>
        <span>{dimensions}</span>
      </div>
    </div>
  );
}
