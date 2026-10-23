"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { CircleNotch } from "@phosphor-icons/react";
import { auth } from "@/lib/firebase-app";
import { portalInput, portalPrimary, portalGhost } from "./portalStyles";

function friendly(code?: string) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password don't match.";
    case "auth/email-already-in-use":
      return "You already have an account. Sign in instead.";
    case "auth/weak-password":
      return "Use at least 6 characters for your password.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    default:
      return "Couldn't sign you in. Try again.";
  }
}

/** Compact sign-in for testers. Uses the studio's theme vars, not PatchPlan's own auth card. */
export function TesterAuth({ studioName, initialMode = "signup" }: { studioName: string; initialMode?: "signup" | "signin" }) {
  const [mode, setMode] = useState<"signup" | "signin">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const run = async (kind: "email" | "google", fn: () => Promise<unknown>) => {
    setError("");
    setNotice("");
    setBusy(kind);
    try {
      await fn();
    } catch (err: any) {
      setError(friendly(err?.code));
    } finally {
      setBusy(null);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run("email", async () => {
      if (mode === "signin") return signInWithEmailAndPassword(auth, email.trim(), password);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() }).catch(() => {});
    });
  };

  const reset = async () => {
    setError("");
    if (!email.trim()) return setError("Enter your email above and we'll send a reset link.");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice(`Reset link sent to ${email.trim()}.`);
    } catch (err: any) {
      setError(friendly(err?.code));
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--pp-border)] bg-[var(--pp-surface)] p-6 sm:p-7">
      <h2 className="text-lg font-semibold">{mode === "signup" ? "Create a tester account" : "Welcome back"}</h2>
      <p className="mt-1 text-sm text-[var(--pp-muted)]">
        {mode === "signup" ? `Sign up to request access to the ${studioName} beta.` : "Sign in to see your access and reports."}
      </p>

      <button type="button" onClick={() => run("google", () => signInWithPopup(auth, new GoogleAuthProvider()))} disabled={!!busy} className={`${portalGhost} mt-5 w-full h-11`}>
        {busy === "google" ? <CircleNotch size={16} className="animate-spin" /> : null}
        Continue with Google
      </button>

      <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-[var(--pp-muted)]">
        <span className="h-px flex-1 bg-[var(--pp-border)]" />
        or
        <span className="h-px flex-1 bg-[var(--pp-border)]" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <input className={portalInput} placeholder="Your name or handle" value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" maxLength={80} />
        )}
        <input className={portalInput} type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <input
          className={portalInput}
          type="password"
          placeholder={mode === "signup" ? "Create a password (6+ characters)" : "Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={6}
          required
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        {notice && <p className="text-sm text-emerald-400">{notice}</p>}
        <button type="submit" disabled={!!busy} className={`${portalPrimary} w-full h-11`}>
          {busy === "email" ? <CircleNotch size={16} className="animate-spin" /> : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm text-[var(--pp-muted)]">
        <button type="button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setNotice(""); }} className="hover:text-[var(--pp-fg)] transition-colors">
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
        {mode === "signin" && (
          <button type="button" onClick={reset} className="hover:text-[var(--pp-fg)] transition-colors">
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );
}
