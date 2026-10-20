"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import {
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
} from "@phosphor-icons/react";
import { CookieBanner } from "./CookieBanner";
import { Login } from "@/components/auth/Login";
import { AISection } from "./AISection";
import { HeroGrid } from "./HeroGrid";
import { FeatureBento } from "./FeatureBento";

import { Logo } from "@/components/ui/Logo";
if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const HERO_LINES = [["The", "project", "manager"], ["built", "for", "game", "devs."]];

export function LandingPage() {
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [policyModal, setPolicyModal] = useState<"terms" | "privacy" | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const currentYear = new Date().getFullYear();
  const rootRef = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const mm = gsap.matchMedia(rootRef.current ?? undefined);
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Hero intro
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.from("[data-nav]", { y: -40, opacity: 0, duration: 0.8 })
        .from("[data-hero-word]", { yPercent: 115, rotate: 6, duration: 1, stagger: 0.07 }, 0.1)
        .from("[data-hero-fade]", { y: 18, opacity: 0, duration: 0.8, stagger: 0.1 }, 0.55);

      // Scroll reveals
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });

      ScrollTrigger.batch("[data-reveal-item]", {
        start: "top 88%",
        once: true,
        onEnter: (els) =>
          gsap.fromTo(
            els,
            { y: 50, opacity: 0, scale: 0.96 },
            { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: "power3.out", stagger: 0.1, overwrite: true }
          ),
      });
      gsap.set("[data-reveal-item]", { opacity: 0 });
    });
    return () => mm.revert();
  }, []);

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
    <div ref={rootRef} className="relative min-h-screen bg-[#121212] text-[#FAFAFA] selection:bg-white/20 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* ─── Floating Island Navbar ─── */}
      <header data-nav className="fixed top-4 inset-x-0 z-40 max-w-[860px] mx-auto px-4">
        <nav className="bg-[#1a1a1e]/80 border border-white/[0.08] backdrop-blur-2xl rounded-full px-4 py-2 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center text-white group-hover:bg-white/[0.12] transition-colors">
              <Logo size={15} />
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
              onClick={() => setAuthMode("signin")}
              className="text-[13px] text-neutral-400 hover:text-white transition-colors duration-150 px-3 py-1.5"
            >
              Sign in
            </button>
            <div className="w-px h-4 bg-white/[0.12] mx-1 hidden sm:block" />
            <button
              onClick={() => setAuthMode("signup")}
              className="px-4 py-1.5 rounded-full bg-white text-[#0a0a0a] font-semibold text-[13px] hover:bg-neutral-200 transition-colors active:scale-[0.97] shadow-sm"
            >
              Get Started
            </button>
          </div>
        </nav>
      </header>

      {/* ─── Hero Section ─── */}
      <HeroGrid />
      <main className="relative z-10 pt-36 sm:pt-44 pb-16 px-4 max-w-5xl mx-auto flex flex-col items-center text-center">
        <h1 className="text-[clamp(2.25rem,7vw,5rem)] font-extrabold tracking-[-0.035em] text-white leading-[1.05] max-w-[800px] mb-6">
          {HERO_LINES.map((line, li) => (
            <span key={li} className="block">
              {line.map((w, wi) => (
                <span key={wi} className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em] mr-[0.24em] last:mr-0">
                  <span data-hero-word className="inline-block origin-bottom-left">{w}</span>
                </span>
              ))}
            </span>
          ))}
        </h1>

        <p data-hero-fade className="text-base sm:text-lg text-neutral-400 max-w-lg leading-relaxed mb-10">
          Sprint boards, public roadmaps, game design docs, and Discord notifications — without the enterprise bloat.
        </p>

        <div data-hero-fade className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setAuthMode("signup")}
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
          <div data-reveal-item className="flex flex-col items-center">
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
          <div data-reveal-item className="flex flex-col items-center">
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
          <div data-reveal-item className="flex flex-col items-center">
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

      {/* ─── Feature Bento ─── */}
      <FeatureBento />

      {/* ─── AI: Search / Build ─── */}
      <AISection />

      {/* ─── FAQ Section ─── */}
      <section id="faq" className="pt-12 pb-24 px-4 max-w-2xl mx-auto w-full">
        <h2 data-reveal className="text-4xl sm:text-5xl font-bold tracking-tight text-white text-center mb-16">
          FAQ
        </h2>

        <div data-reveal className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
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
      {authMode && (
        <div
          className="pp-fade fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto"
          onMouseDown={(e) => e.target === e.currentTarget && setAuthMode(null)}
        >
          <Login initialMode={authMode} onClose={() => setAuthMode(null)} />
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
