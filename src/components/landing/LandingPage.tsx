"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  DiscordLogo,
  XLogo,
  YoutubeLogo,
  GithubLogo,
  DiamondsFour,
  Plus,
} from "@phosphor-icons/react";
import { CookieBanner } from "./CookieBanner";
import { Login } from "@/components/auth/LazyLogin";
import { AISection } from "./AISection";
import { HeroGrid } from "./HeroGrid";
import { FeatureBento } from "./FeatureBento";
import { QuestLine } from "./QuestLine";

import { Logo } from "@/components/ui/Logo";
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const HERO_LINES = [["The", "project", "manager"], ["built", "for", "game", "devs."]];

export function LandingPage() {
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const currentYear = new Date().getFullYear();
  const rootRef = useRef<HTMLDivElement>(null);

  // Scroll reveals with one IntersectionObserver and CSS transitions (see globals.css), instead
  // of an animation library: nothing runs per frame on the main thread. The hero intro is pure CSS.
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add("pp-reveal-armed");
    const io = new IntersectionObserver(
      (entries) => {
        entries
          .filter((e) => e.isIntersecting)
          .forEach((e, i) => {
            const el = e.target as HTMLElement;
            // Cards entering together come in one after another.
            if (el.hasAttribute("data-reveal-item") && i > 0) {
              el.style.transitionDelay = `${i * 100}ms`;
              setTimeout(() => (el.style.transitionDelay = ""), 1000 + i * 100);
            }
            el.classList.add("pp-in");
            io.unobserve(el);
          });
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    root.querySelectorAll("[data-reveal], [data-reveal-item]").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.classList.remove("pp-reveal-armed");
    };
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
      <header data-nav className="pp-nav-in fixed top-4 inset-x-0 z-40 max-w-[860px] mx-auto px-4">
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
                  <span data-hero-word className="pp-word-in inline-block origin-bottom-left" style={{ ["--i" as string]: HERO_LINES.slice(0, li).reduce((n, l) => n + l.length, 0) + wi }}>{w}</span>
                </span>
              ))}
            </span>
          ))}
        </h1>

        <p data-hero-fade className="pp-fade-up text-base sm:text-lg text-neutral-400 max-w-lg leading-relaxed mb-10">
          Sprint boards, public roadmaps, game design docs, and Discord notifications — without the enterprise bloat.
        </p>

        <div data-hero-fade className="pp-fade-up flex flex-col sm:flex-row items-center gap-3" style={{ ["--i" as string]: 1 }}>
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

      {/* ─── The loop ─── */}
      <QuestLine />

      {/* ─── Feature Bento ─── */}
      <FeatureBento />

      {/* ─── AI: Search / Build ─── */}
      <AISection />

      {/* ─── FAQ Section ─── */}
      <section id="faq" className="py-16 sm:py-24 px-4 max-w-5xl mx-auto w-full grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-10 lg:gap-16">
        <div data-reveal className="lg:sticky lg:top-28 self-start">
          <p className="font-mono text-[11px] tracking-[0.3em] text-neutral-500 mb-4">FAQ</p>
          <h2 className="text-[clamp(2rem,4.5vw,3rem)] font-bold tracking-[-0.03em] text-white leading-[1.05]">
            Questions, <span className="text-neutral-500">answered.</span>
          </h2>
          <p className="mt-4 text-[15px] text-neutral-400 leading-relaxed max-w-sm">
            Everything else is in the{" "}
            <Link href="/changelog" className="text-neutral-200 underline underline-offset-4 decoration-white/20 hover:decoration-white">
              changelog
            </Link>
            . Data questions? Read our{" "}
            <Link href="/privacy" className="text-neutral-200 underline underline-offset-4 decoration-white/20 hover:decoration-white">
              privacy policy
            </Link>
            .
          </p>
        </div>

        <div data-reveal className="space-y-2">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-colors duration-200 ${isOpen ? "border-white/[0.14] bg-white/[0.03]" : "border-white/[0.06] hover:border-white/[0.1]"}`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left group"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${idx}`}
                >
                  <span className={`text-[15px] sm:text-[16px] font-semibold tracking-tight transition-colors ${isOpen ? "text-white" : "text-neutral-200 group-hover:text-white"}`}>
                    {faq.q}
                  </span>
                  <span className={`shrink-0 w-7 h-7 rounded-full grid place-items-center border transition-all duration-300 ${isOpen ? "rotate-45 border-[#c8ff00]/40 text-[#c8ff00]" : "border-white/10 text-neutral-500 group-hover:text-neutral-300"}`}>
                    <Plus size={13} weight="bold" />
                  </span>
                </button>
                {/* Height animates via grid rows, so the answer slides open smoothly. */}
                <div id={`faq-${idx}`} className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-[14px] text-neutral-400 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Press start ─── */}
      <section className="px-4 pb-20 sm:pb-28">
        <div data-reveal className="relative max-w-5xl mx-auto overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0c0c0e] px-6 py-16 sm:py-24 text-center">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_60%_70%_at_50%_100%,black,transparent)]" />
          <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-24 w-[70%] h-56 rounded-full bg-[#c8ff00]/[0.12] blur-3xl" />
          <p className="pp-press-start relative font-mono text-[11px] tracking-[0.4em] text-[#c8ff00] mb-5">PRESS START</p>
          <h2 className="relative text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-[-0.035em] text-white leading-[1.05]">
            Ready when your game is.
          </h2>
          <p className="relative mt-4 text-[15px] sm:text-base text-neutral-400 max-w-md mx-auto leading-relaxed">
            Free during early access. Your studio is set up in under a minute, and it works with any engine.
          </p>
          <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setAuthMode("signup")}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#c8ff00] text-black font-semibold text-sm hover:bg-[#d6ff47] transition-colors active:scale-[0.97] shadow-[0_0_32px_rgba(200,255,0,0.25)]"
            >
              Start for free
            </button>
            <button
              onClick={() => setAuthMode("signin")}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-white/[0.12] text-neutral-300 font-medium text-sm hover:bg-white/[0.04] hover:text-white transition-colors"
            >
              I have an account
            </button>
          </div>
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
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
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
    </div>
  );
}
