// One-time migration: moves each idea's doc text and whiteboard from ideas/{id} into
// idea_bodies/{id}, and leaves a light summary (preview, hasCanvas) on the idea.
//
// Run only after the new firestore.rules (with idea_bodies) are published and the new app
// version is deployed, so every browser already reads bodies from idea_bodies:
//
//   node scripts/split-idea-bodies.mjs           (dry run: counts only)
//   node scripts/split-idea-bodies.mjs --apply
//
// Reads FIREBASE_SERVICE_ACCOUNT from .env.local. Safe to run twice.

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    }),
);
const raw = env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT missing from .env.local");
const sa = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
sa.private_key = sa.private_key.replace(/\\n/g, "\n");
const db = getFirestore(initializeApp({ credential: cert(sa) }));
const apply = process.argv.includes("--apply");

// Same as excerpt() in src/features/idea-management/ideaMeta.ts.
function excerpt(html, max) {
  const text = String(html || "")
    .replace(/<(h[1-6])[^>]*>.*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const snap = await db.collection("ideas").get();
const todo = snap.docs.filter((d) => d.get("content") !== undefined || d.get("canvas") !== undefined);
let bytes = 0;
todo.forEach((d) => (bytes += String(d.get("content") || "").length + String(d.get("canvas") || "").length));
console.log(`${snap.size} ideas, ${todo.length} still carry their body (${(bytes / 1024).toFixed(0)} KB moved off the list docs).`);
if (!apply) {
  console.log("Dry run. Add --apply to migrate.");
  process.exit(0);
}

// Copy and strip in one atomic batch per idea, so a failure can never drop content.
let done = 0;
for (let i = 0; i < todo.length; i += 20) {
  await Promise.all(
    todo.slice(i, i + 20).map(async (d) => {
      const data = d.data();
      const body = { userId: data.userId || "", familyId: data.familyId ?? null, content: data.content || "", updatedAt: FieldValue.serverTimestamp() };
      if (data.canvas) body.canvas = data.canvas;
      const batch = db.batch();
      batch.set(db.collection("idea_bodies").doc(d.id), body, { merge: true });
      batch.update(d.ref, { preview: excerpt(data.content, 2000), hasCanvas: !!data.canvas, content: FieldValue.delete(), canvas: FieldValue.delete() });
      await batch.commit();
      done++;
    }),
  );
}
console.log(`Migrated ${done} ideas.`);
