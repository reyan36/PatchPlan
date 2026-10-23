// One-off: adds `memberIds` (uids of the owner and every member) to existing studios, which the
// Firestore rules use to check membership. Safe to run more than once.
//
//   node scripts/backfill-member-ids.mjs           preview what would change
//   node scripts/backfill-member-ids.mjs --write   apply it
//
// Run it before publishing firestore.rules, so existing members keep access.

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const write = process.argv.includes("--write");

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error("FIREBASE_SERVICE_ACCOUNT is not set (.env.local).");
  process.exit(1);
}
const sa = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
if (sa.private_key) sa.private_key = String(sa.private_key).replace(/\\n/g, "\n");

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore(initializeApp({ credential: cert(sa) }));

const snap = await db.collection("families").get();
let changed = 0;
let batch = db.batch();
let pending = 0;

for (const d of snap.docs) {
  const f = d.data();
  const ids = [...new Set([f.ownerId, ...(f.members || []).map((m) => m?.uid)].filter((x) => typeof x === "string" && x))];
  const current = Array.isArray(f.memberIds) ? f.memberIds : null;
  const same = current && current.length === ids.length && ids.every((id) => current.includes(id));
  if (same) continue;
  changed++;
  console.log(`${write ? "update" : "would update"} ${d.id}: ${ids.length} member(s)${current ? ` (was ${current.length})` : ""}`);
  if (write) {
    batch.update(d.ref, { memberIds: ids });
    if (++pending >= 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
}
if (write && pending) await batch.commit();
console.log(`${snap.size} studios checked, ${changed} ${write ? "updated" : "need memberIds"}.`);
