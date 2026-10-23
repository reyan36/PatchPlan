"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { PatchGrid } from "./PatchGrid";
import { auth } from "@/lib/firebase-app";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  X,
  EnvelopeSimple,
  LockSimple,
  Eye,
  EyeSlash,
  ArrowRight,
  CircleNotch,
} from "@phosphor-icons/react";

import { Logo } from "@/components/ui/Logo";
type Mode = "signin" | "signup";

function friendlyError(code: string | undefined, fallback: string) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password don't match.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in.";
    case "auth/weak-password":
      return "Use at least 6 characters for your password.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled yet.";
    default:
      return fallback || "Something went wrong. Please try again.";
  }
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function Login({
  initialMode = "signin",
  onClose,
}: {
  initialMode?: Mode;
  onClose?: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState<"email" | "google" | null>(null);

  const isLogin = mode === "signin";
  // Motion is CSS (globals.css) rather than GSAP: a JS tween leaves `opacity: 0` inline until
  // it ticks, so a busy main thread could hide the submit button. CSS animations always finish.
  const [switched, setSwitched] = useState(false);
  const stagger = (i: number) => ({ "--i": i }) as CSSProperties;
  const swap = switched ? "pp-swap-in" : "";

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const switchMode = (next: Mode) => {
    if (next !== mode) setSwitched(true);
    setMode(next);
    setError("");
    setNotice("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading("email");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(friendlyError(err?.code, err?.message));
    } finally {
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setNotice("");
    setLoading("google");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: any) {
      setError(friendlyError(err?.code, err?.message));
    } finally {
      setLoading(null);
    }
  };

  const handleReset = async () => {
    setError("");
    setNotice("");
    if (!email) {
      setError("Enter your email above and we'll send a reset link.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setNotice(`Reset link sent to ${email}.`);
    } catch (err: any) {
      setError(friendlyError(err?.code, err?.message));
    }
  };

  const inputWrap =
    "group flex items-center gap-2.5 h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] px-3.5 transition-colors focus-within:border-white/25 focus-within:bg-white/[0.05]";
  const inputCls =
    "flex-1 bg-transparent text-[14px] text-white placeholder:text-neutral-600 outline-none";

  return (
    <div className="pp-card-in relative w-full max-w-[880px] grid md:grid-cols-[1fr_1.05fr] rounded-[22px] overflow-hidden bg-[#111114] border border-white/[0.09] shadow-[0_30px_120px_rgba(0,0,0,0.75)]">
      <PatchGrid />

      <div className="relative px-6 py-8 sm:px-10 sm:py-10">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Close"
          >
            <X size={16} weight="bold" />
          </button>
        )}

        {/* Mobile logo */}
        <div className="md:hidden mb-6 w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center text-white">
          <Logo size={20} alt="PatchPlan" />
        </div>

        <div className="pp-stagger-in" style={stagger(0)}>
          <h2 key={`h-${mode}`} className={`${swap} text-[26px] font-semibold tracking-tight text-white`}>
            {isLogin ? "Welcome back" : "Create your studio"}
          </h2>
          <p key={`p-${mode}`} className={`${swap} mt-1 text-[14px] text-neutral-500`} style={{ animationDelay: "50ms" }}>
            {isLogin ? "Sign in to your workspace." : "Set up a workspace in under a minute."}
          </p>
        </div>

        {/* Segmented toggle */}
        <div style={stagger(1)} className="pp-stagger-in mt-6 relative grid grid-cols-2 p-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[13px]">
          <span
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-white/[0.1] transition-transform duration-300 ease-out ${
              isLogin ? "translate-x-1" : "translate-x-[calc(100%+4px)]"
            }`}
          />
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`relative z-10 py-1.5 rounded-full font-medium transition-colors ${isLogin ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`relative z-10 py-1.5 rounded-full font-medium transition-colors ${!isLogin ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            Sign up
          </button>
        </div>

        {/* Google */}
        <button
          type="button"
          style={stagger(2)}
          onClick={handleGoogle}
          disabled={loading !== null}
          className="pp-stagger-in mt-5 w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.09] hover:bg-white/[0.07] hover:border-white/[0.16] text-[14px] font-medium text-white flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
        >
          {loading === "google" ? <CircleNotch size={16} className="animate-spin" /> : <GoogleMark />}
          Continue with Google
        </button>

        <div style={stagger(3)} className="pp-stagger-in my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-neutral-600">
          <span className="h-px flex-1 bg-white/[0.07]" />
          or
          <span className="h-px flex-1 bg-white/[0.07]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label style={stagger(4)} className={`pp-stagger-in ${inputWrap}`}>
            <EnvelopeSimple size={16} className="text-neutral-500 group-focus-within:text-neutral-300 transition-colors" />
            <input
              type="email"
              autoComplete="email"
              placeholder="you@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              required
            />
          </label>

          <label style={stagger(5)} className={`pp-stagger-in ${inputWrap}`}>
            <LockSimple size={16} className="text-neutral-500 group-focus-within:text-neutral-300 transition-colors" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder={isLogin ? "Password" : "Create a password (6+ characters)"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="text-neutral-500 hover:text-white transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </label>

          {isLogin && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="text-[12px] text-neutral-500 hover:text-white transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3.5 py-2.5 text-[13px] text-red-300">
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3.5 py-2.5 text-[13px] text-emerald-300">
              {notice}
            </div>
          )}

          <button
            type="submit"
            style={stagger(6)}
            disabled={loading !== null}
            className="pp-stagger-in group w-full h-11 rounded-xl bg-white text-[#0a0a0a] text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-neutral-200 active:scale-[0.99] transition-all disabled:opacity-60"
          >
            {loading === "email" ? (
              <CircleNotch size={16} className="animate-spin" />
            ) : (
              <span key={`b-${mode}`} className={`${swap} flex items-center gap-2`} style={{ animationDelay: "100ms" }}>
                {isLogin ? "Sign in" : "Create account"}
                <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </button>
        </form>

        <p style={stagger(7)} className="pp-stagger-in mt-6 text-center text-[12px] text-neutral-600">
          {isLogin ? "New to PatchPlan? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => switchMode(isLogin ? "signup" : "signin")}
            className="text-neutral-300 hover:text-white font-medium transition-colors"
          >
            {isLogin ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
