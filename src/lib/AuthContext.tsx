"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";

// Firebase Auth is loaded after the page is interactive, so it never blocks first paint.
const loadAuth = () => import("./lazyAuth");

const HINT_KEY = "pp-auth-hint";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  /**
   * Whether this browser was signed in last time (from localStorage), known before Firebase
   * finishes restoring the session. undefined until read (server render and first client render),
   * null when there's no hint (first visit). Used only to pick what to show while `loading`,
   * never for access decisions.
   */
  signedInHint: boolean | null | undefined;
  /** True from clicking Sign out until the redirect home, so pages don't flash their sign-in view. */
  signingOut: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signedInHint: undefined,
  signingOut: false,
  logout: () => {},
});

const writeHint = (signedIn: boolean) => {
  try {
    localStorage.setItem(HINT_KEY, signedIn ? "in" : "out");
  } catch {
    // Private mode: we just fall back to the neutral splash.
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedInHint, setSignedInHint] = useState<boolean | null | undefined>(undefined);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    try {
      const h = localStorage.getItem(HINT_KEY);
      setSignedInHint(h ? h === "in" : null);
    } catch {
      setSignedInHint(null); // storage blocked: treat as no hint
    }

    let unsubscribe = () => {};
    let cancelled = false;
    loadAuth()
      .then(({ auth, onAuthStateChanged }) => {
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user);
          setLoading(false);
          setSignedInHint(!!user);
          writeHint(!!user);
        });
      })
      .catch(() => setLoading(false)); // offline or blocked: behave as signed out
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Signing out always lands on the home page; a full reload also clears any workspace state.
  const logout = () => {
    setSigningOut(true);
    writeHint(false);
    loadAuth()
      .then(({ auth, signOut }) => signOut(auth))
      .finally(() => window.location.replace("/"));
  };

  return (
    <AuthContext.Provider value={{ user, loading, signedInHint, signingOut, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
