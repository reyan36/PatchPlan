"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useDirty } from "@/lib/DirtyContext";
import { PAGES, PAGE_EVENTS, isTyping } from "./commands";

// The palette UI (and its data) downloads the first time it's opened.
const Palette = dynamic(() => import("./Palette").then((m) => m.Palette), { ssr: false });

export type PaletteMode = "search" | "help";

/**
 * Global keyboard shortcuts for signed-in pages:
 *   Ctrl/⌘ + K or /   command palette
 *   ?                 list of shortcuts
 *   G then a letter   go to a page (G B = Board, G I = Inbox, …)
 */
export function CommandMenu() {
  const [mode, setMode] = useState<PaletteMode | null>(null);
  const { handleNavigation } = useDirty();
  const navigate = useRef(handleNavigation);
  navigate.current = handleNavigation;

  useEffect(() => {
    let gPressedAt = 0;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMode((m) => (m === "search" ? null : "search"));
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isTyping(e.target)) return;
      if (document.querySelector("[data-palette]")) return; // the palette handles its own keys
      if (e.key === "/") {
        e.preventDefault();
        setMode("search");
      } else if (e.key === "?") {
        e.preventDefault();
        setMode("help");
      } else if (e.key === "g" || e.key === "G") {
        gPressedAt = Date.now();
      } else if (gPressedAt && Date.now() - gPressedAt < 1200) {
        gPressedAt = 0;
        const page = PAGES.find((p) => p.key === e.key.toLowerCase());
        if (page) {
          e.preventDefault();
          navigate.current(page.href);
        }
      }
    };
    const open = () => setMode("search");
    window.addEventListener("keydown", onKey);
    window.addEventListener(PAGE_EVENTS.openPalette, open);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PAGE_EVENTS.openPalette, open);
    };
  }, []);

  return mode ? <Palette mode={mode} onMode={setMode} onClose={() => setMode(null)} /> : null;
}
