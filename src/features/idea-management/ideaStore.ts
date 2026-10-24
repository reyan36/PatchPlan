// Ideas are stored as a light summary (ideas/{id}: title, status, votes, preview) for lists, and a
// heavy body (idea_bodies/{id}: doc HTML, whiteboard) loaded only when the idea is opened. Lists then
// download a few hundred bytes per idea instead of whole documents and drawings.
//
// Older ideas keep content/canvas on the summary doc until they're next saved (or the
// scripts/split-idea-bodies.mjs migration runs). If the idea_bodies rules aren't published yet,
// everything falls back to the old single-document layout.

import { collection, deleteDoc, deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { excerpt, type Idea } from "./ideaMeta";

const BODIES = "idea_bodies";
const PREVIEW_CHARS = 2000;

type Scope = { userId: string; familyId: string | null };
export type IdeaBody = { content: string; canvas?: string; fromBody: boolean };

const denied = (e: unknown) => /permission|insufficient/i.test(String((e as Error)?.message || e));

/** The summary fields kept on ideas/{id} for list views and search. */
const summaryOf = (content: string, canvas?: string) => ({
  preview: excerpt(content, PREVIEW_CHARS),
  ...(canvas !== undefined ? { hasCanvas: !!canvas } : {}),
});

/** Loads the body; falls back to fields on the idea itself for ideas not split yet. */
export async function readIdeaBody(idea: Idea): Promise<IdeaBody> {
  const snap = await getDoc(doc(db, BODIES, idea.id)).catch(() => null);
  if (snap?.exists()) {
    const d = snap.data();
    return { content: d.content || "", canvas: d.canvas || undefined, fromBody: true };
  }
  return { content: idea.content || "", canvas: idea.canvas || undefined, fromBody: false };
}

/** Saves the body and refreshes the summary in one batch; clears legacy copies from the summary doc. */
export async function saveIdeaBody(idea: Idea, body: { content: string; canvas?: string }) {
  const scope: Scope = { userId: idea.userId || "", familyId: idea.familyId ?? null };
  const fields = { content: body.content, ...(body.canvas !== undefined ? { canvas: body.canvas } : {}) };
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, BODIES, idea.id), { ...scope, ...fields, updatedAt: serverTimestamp() }, { merge: true });
    batch.update(doc(db, "ideas", idea.id), { ...summaryOf(body.content, body.canvas), content: deleteField(), canvas: deleteField(), updatedAt: serverTimestamp() });
    await batch.commit();
  } catch (e) {
    if (!denied(e)) throw e;
    // idea_bodies rules not published yet: keep everything on the idea doc.
    await updateDoc(doc(db, "ideas", idea.id), { ...fields, ...summaryOf(body.content, body.canvas), updatedAt: serverTimestamp() });
  }
}

/** Creates an idea (summary + body) and returns its id. */
export async function createIdea(scope: Scope, data: { title: string; content: string; template?: string }) {
  const ref = doc(collection(db, "ideas"));
  const summary = {
    ...scope,
    title: data.title,
    status: "idea",
    upvotedBy: [],
    ...(data.template ? { template: data.template } : {}),
    ...summaryOf(data.content),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (!data.content) {
    await setDoc(ref, summary);
    return ref.id;
  }
  try {
    const batch = writeBatch(db);
    batch.set(ref, summary);
    batch.set(doc(db, BODIES, ref.id), { ...scope, content: data.content, updatedAt: serverTimestamp() });
    await batch.commit();
  } catch (e) {
    if (!denied(e)) throw e;
    await setDoc(ref, { ...summary, content: data.content });
  }
  return ref.id;
}

export async function deleteIdea(id: string) {
  await deleteDoc(doc(db, "ideas", id));
  await deleteDoc(doc(db, BODIES, id)).catch(() => {});
}

/** Preview text for cards and search, for both new (summary) and older (full content) ideas. */
export const ideaPreview = (i: Idea, max = 160) => excerpt(i.preview ?? i.content, max);
export const ideaHasCanvas = (i: Idea) => !!(i.hasCanvas || i.canvas);
