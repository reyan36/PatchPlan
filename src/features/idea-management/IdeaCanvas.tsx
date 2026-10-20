"use client";

import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";

/** The whiteboard canvas. Split out so tldraw only downloads when the Canvas tab is opened. */
export default function IdeaCanvas({ ideaId, onMount }: { ideaId: string; onMount: (editor: Editor) => void }) {
  return <Tldraw persistenceKey={`tldraw-${ideaId}`} onMount={onMount} />;
}
