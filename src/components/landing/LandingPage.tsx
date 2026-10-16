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
  ShieldCheck
} from "@phosphor-icons/react";
import { CookieBanner } from "./CookieBanner";
import { Login } from "@/components/auth/Login";

export function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [policyModal, setPolicyModal] = useState<"terms" | "privacy" | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const currentYear = new Date().getFullYear();

  const faqs = [
    {
      q: "What is PatchPlan?",
      a: "PatchPlan is a purpose-built project management and roadmapping platform for game developers. It unites game-specific sprint boards (Art, Code, Audio, Design, Bugs), living game design documentation with whiteboard canvases, and automated public roadmaps for your player community."
    },
    {
      q: "How do I get started?",
      a: "Sign in with your Google or email account to launch your studio workspace in seconds. You can start planning milestones right away or invite team members to collaborate using your unique studio join code."
    },
    {
      q: "Do I need to know how to code?",
      a: "Not at all. PatchPlan is designed for the entire game studio—game designers drafting lore, concept artists organizing asset drops, sound designers tracking stems, and producers coordinating launch dates."
    },
    {
      q: "How is PatchPlan different from Jira, Trello, or Linear?",
      a: "Traditional enterprise tools are weighed down by 40-field corporate ticket setup forms. PatchPlan focuses strictly on game pipelines: milestone-oriented sprints, living GDDs with infinite whiteboard canvases, and 1-click public roadmaps that sync directly from your board."
    },
    {
      q: "Can players and publishers see my roadmap without an account?",
      a: "Yes. Every studio workspace gets a dedicated public URL (e.g. /p/roadmap/[your-studio]). Players, backers, and publishers can follow your development progress and read patch notes instantly without needing to sign up or log in."
    },
    {
      q: "How does the Discord integration work?",
      a: "Simply paste your studio Discord channel's incoming webhook URL in your workspace settings. Whenever you mark milestones complete or publish patch notes, PatchPlan formats and dispatches rich embeds directly to your Discord community."
    },
    {
      q: "Do I own the game design docs and data I create?",
      a: "Yes, 100%. You retain complete intellectual property and ownership over all game design documents, lore bibles, whiteboard canvas sketches, and milestone plans created in your studio workspace."
    },
    {
      q: "Is PatchPlan free during beta?",
      a: "Yes, 100% free while in open beta. All features—including unlimited tasks, whiteboard canvas, team collaboration, public roadmaps, and Discord webhooks—are fully accessible with zero fees."
    },
    {
      q: "What platforms and game engines does PatchPlan support?",
      a: "PatchPlan runs in any modern web browser on macOS, Windows, and Linux. It is engine-agnostic and pairs seamlessly with Unity, Unreal Engine, Godot, GameMaker, Bevy, or custom game engines."
    }
  ];

  return (
    <div className="min-h-screen bg-[#121212] text-[#FAFAFA] selection:bg-white/20 selection:text-white font-sans antialiased overflow-x-hidden">

      {/* ─── Floating Island Navbar (Glaze style) ─── */}
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
            <Link href="/" className="hover:text-white transition-colors duration-150">Home</Link>
            <Link href="/p/roadmap/demo" className="hover:text-white transition-colors duration-150">Roadmap</Link>
            <Link href="/changelog" className="hover:text-white transition-colors duration-150">Changelog</Link>
            <a href="#faq" className="hover:text-white transition-colors duration-150">FAQ</a>
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
      <main className="relative z-10 pt-32 sm:pt-40 pb-20 px-4 max-w-5xl mx-auto flex flex-col items-center text-center">

        {/* Massive headline (Mobbin / Glaze aesthetic) */}
        <h1 className="text-[clamp(2.25rem,7vw,5rem)] font-extrabold tracking-[-0.035em] text-white leading-[1.05] max-w-[800px] mb-6">
          The project manager{" "}
          <br className="hidden sm:block" />
          built for game devs.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-neutral-400 max-w-lg leading-relaxed mb-10">
          Sprint boards, public roadmaps, game design docs, and Discord notifications — without the enterprise bloat.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-20">
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-white text-[#0a0a0a] font-semibold text-sm hover:bg-neutral-200 transition-colors active:scale-[0.97] flex items-center justify-center gap-2"
          >
            Start for free
          </button>
          <Link
            href="/p/roadmap/demo"
            className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-white/[0.12] text-neutral-300 font-medium text-sm hover:bg-white/[0.04] hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <span>See a live demo</span>
            <ArrowRight size={14} weight="bold" className="text-neutral-500" />
          </Link>
        </div>

        {/* App Window Mockup */}
        <div className="w-full max-w-4xl rounded-2xl bg-[#18181c] border border-white/[0.08] p-1.5 sm:p-2 shadow-[0_16px_48px_rgba(0,0,0,0.7)] relative overflow-hidden">
          {/* Top edge highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          {/* Window chrome */}
          <div className="bg-[#1f1f24] rounded-xl border border-white/[0.06] px-4 py-2.5 flex items-center justify-between text-xs text-neutral-500 mb-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
              </div>
              <span className="font-mono text-[11px] text-neutral-600">patchplan.app / board</span>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400/80 border border-indigo-500/15 text-[11px]">
              <DiscordLogo size={12} weight="duotone" />
              <span>#dev-updates linked</span>
            </span>
          </div>

          {/* Sprint columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left p-1.5 sm:p-3">

            {/* Column 1 — In Progress */}
            <div className="bg-[#111114] border border-white/[0.05] rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 px-0.5">
                <span>In Progress</span>
                <span className="text-neutral-600">2</span>
              </div>
              <div className="bg-[#161619] border border-white/[0.07] rounded-lg p-3 space-y-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/90 border border-amber-500/15">
                  Combat · Code
                </span>
                <p className="text-xs font-medium text-neutral-300">Melee Hitbox & Roll Physics</p>
                <div className="flex items-center justify-between text-[10px] text-neutral-600">
                  <span>You</span>
                  <span className="text-amber-400/70">v0.4</span>
                </div>
              </div>
              <div className="bg-[#161619] border border-white/[0.07] rounded-lg p-3 space-y-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400/90 border border-purple-500/15">
                  Art
                </span>
                <p className="text-xs font-medium text-neutral-300">Boss Phase 2 Sprite Rig</p>
                <div className="flex items-center justify-between text-[10px] text-neutral-600">
                  <span>3 assets</span>
                  <span>Today</span>
                </div>
              </div>
            </div>

            {/* Column 2 — Review */}
            <div className="bg-[#111114] border border-white/[0.05] rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 px-0.5">
                <span>In Review</span>
                <span className="text-neutral-600">1</span>
              </div>
              <div className="bg-[#161619] border border-white/[0.07] rounded-lg p-3 space-y-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400/90 border border-blue-500/15">
                  Audio
                </span>
                <p className="text-xs font-medium text-neutral-300">Cathedral Reverb Stems</p>
                <div className="flex items-center justify-between text-[10px] text-neutral-600">
                  <span>Sound Designer</span>
                  <span className="text-blue-400/70">Testing</span>
                </div>
              </div>
            </div>

            {/* Column 3 — Shipped */}
            <div className="bg-[#111114] border border-white/[0.05] rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 px-0.5">
                <span>Shipped</span>
                <span className="text-emerald-500/70">✓</span>
              </div>
              <div className="bg-[#161619] border border-emerald-500/10 rounded-lg p-3 space-y-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400/90 border border-emerald-500/15">
                  Devlog
                </span>
                <p className="text-xs font-medium text-neutral-300">Devlog #12: Combat Overhaul</p>
                <div className="flex items-center justify-between text-[10px] text-emerald-500/60">
                  <span>Published</span>
                  <span>Discord ✓</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ─── FAQ Section (Strictly matching Image 2) ─── */}
      <section id="faq" className="pt-16 pb-28 px-4 max-w-2xl mx-auto w-full">
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
                  <span className={`text-[16px] sm:text-[17px] font-semibold tracking-tight transition-colors pr-4 ${
                    isOpen ? "text-white" : "text-neutral-200 group-hover:text-white"
                  }`}>
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

      {/* ─── Pre-Footer CTA & Footer (Strictly matching Image 1) ─── */}
      <section className="pt-8 pb-16 px-4 max-w-3xl mx-auto flex flex-col items-center text-center">
        
        {/* App Squircle Badge with Glowing Core */}
        <div className="relative mb-8 group">
          <div className="w-24 h-24 rounded-[28px] bg-gradient-to-b from-[#1c1c22] to-[#0c0c0f] border border-white/15 p-1 shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex items-center justify-center relative overflow-hidden">
            {/* Iridescent glowing core */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.4),rgba(236,72,153,0.25),rgba(245,158,11,0.15),transparent_75%)] opacity-90" />
            
            <div className="relative z-10 w-16 h-16 rounded-[20px] bg-black/40 border border-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
              <SquaresFour size={34} weight="duotone" className="text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.4)]" />
            </div>
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-8">
          What will you build?
        </h2>

        {/* Blue Pill CTA Button (Image 1 Style) */}
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-6 py-2.5 rounded-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-semibold text-sm transition-all shadow-[0_4px_24px_rgba(0,102,255,0.35)] flex items-center gap-2 active:scale-95"
        >
          <span>Start for free</span>
        </button>

        {/* Fine print subtext */}
        <p className="text-xs text-neutral-500 mt-3.5">
          Free in open beta · Web studio workspace
        </p>

        {/* Footer row links & social icons */}
        <footer className="mt-28 w-full flex flex-col items-center gap-4 text-xs text-neutral-500">
          
          {/* Row 1: Copyright & Text links */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-neutral-400">
            <span suppressHydrationWarning>&copy; {currentYear} PatchPlan</span>
            <Link href="/p/roadmap/demo" className="hover:text-white transition-colors">Roadmap</Link>
            <Link href="/changelog" className="hover:text-white transition-colors">Changelog</Link>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <button onClick={() => setPolicyModal("terms")} className="hover:text-white transition-colors">Terms</button>
            <button onClick={() => setPolicyModal("privacy")} className="hover:text-white transition-colors">Privacy Policy</button>
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
                  <p>By creating an account or accessing PatchPlan, you agree to these Terms. PatchPlan is currently offered in open beta for game developers and studios.</p>
                  
                  <p className="text-neutral-300 font-medium">2. Studio Workspace & IP Ownership</p>
                  <p>You retain 100% intellectual property ownership of your game design documents, whiteboards, tasks, and media. PatchPlan does not claim ownership over any user-created studio assets.</p>

                  <p className="text-neutral-300 font-medium">3. Acceptable Use</p>
                  <p>You agree not to abuse public roadmap links, spam Discord webhook dispatches, or attempt unauthorized access to other studios' private family workspaces.</p>
                </>
              ) : (
                <>
                  <p className="text-neutral-300 font-medium">1. Data Storage & Security</p>
                  <p>PatchPlan utilizes secure Firebase Authentication and encrypted Google Cloud Firestore databases to protect your studio data.</p>

                  <p className="text-neutral-300 font-medium">2. Zero Third-Party Advertising</p>
                  <p>We do not sell personal data, display third-party advertisements, or deploy cross-site tracking pixels. Your session cookies are used solely to keep you logged in.</p>

                  <p className="text-neutral-300 font-medium">3. Data Deletion</p>
                  <p>You may export or delete your studio workspace and roadmap at any time from your settings panel.</p>
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
