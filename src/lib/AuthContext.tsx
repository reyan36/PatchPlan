"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth } from "./firebase";

const HINT_KEY = "pp-auth-hint";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  /**
   * Whether this browser was signed in last time (from localStorage), known before Firebase
   * finishes restoring the session. null on the server and on a first visit.
   * Used only to pick the right placeholder while `loading`, never for access decisions.
   */
  signedInHint: boolean | null;
  /** True from clicking Sign out until the redirect home, so pages don't flash their sign-in view. */
  signingOut: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signedInHint: null,
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
  const [signedInHint, setSignedInHint] = useState<boolean | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    try {
      const h = localStorage.getItem(HINT_KEY);
      if (h) setSignedInHint(h === "in");
    } catch {
      // Ignore: no hint.
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      setSignedInHint(!!user);
      writeHint(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Signing out always lands on the home page; a full reload also clears any workspace state.
  const logout = () => {
    setSigningOut(true);
    writeHint(false);
    signOut(auth).finally(() => window.location.replace("/"));
  };

  return (
    <AuthContext.Provider value={{ user, loading, signedInHint, signingOut, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
