"use client";

import { useEffect } from "react";

/**
 * Last-resort screen when the root layout itself crashes. It replaces the whole document, so it
 * can't rely on the app's stylesheet; styles are inline.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const button = { padding: "9px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", border: 0 } as const;
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#121212", color: "#fafafa", fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif" }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 12, letterSpacing: "0.2em", color: "#c8ff00", fontWeight: 600, margin: "0 0 12px" }}>PATCHPLAN</p>
          <h1 style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.6, margin: "12px 0 28px" }}>
            PatchPlan couldn&apos;t load. Reloading usually fixes it. Anything you already saved is safe.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => window.location.reload()} style={{ ...button, background: "#c8ff00", color: "#000" }}>
              Reload
            </button>
            <button onClick={reset} style={{ ...button, background: "transparent", color: "#d4d4d8", border: "1px solid rgba(255,255,255,0.12)" }}>
              Try again
            </button>
          </div>
          {error.digest && <p style={{ fontSize: 12, color: "#52525b", marginTop: 28 }}>Error ID {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
