// Syncs git commits into the Firestore `changelog` collection (one doc per commit, id = full hash).
//
//   npm run changelog              add new commits
//   npm run changelog:refresh      also re-describe existing entries (except ones marked locked: true)
//
// Runs automatically before `next build`. It never fails the build: without credentials or git
// it logs a warning and exits. On Vercel it only syncs production builds, so preview branches
// don't leak unreleased commits into the public changelog.
//
// Editing an entry: change it in the Firebase console and set `locked: true` so refreshes keep it.

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describeCommit, nextVersion } from "./engine.mjs";

const require = createRequire(import.meta.url);
const ENGINE_VERSION = 2;
const refresh = process.argv.includes("--refresh");
const log = (msg) => console.log(`[changelog] ${msg}`);

/** Locally, read .env.local / .env (Vercel injects env vars itself). */
function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(json);
  if (parsed.private_key) parsed.private_key = String(parsed.private_key).replace(/\\n/g, "\n");
  return parsed;
}

/** Commits oldest → newest. Falls back to Vercel's commit env vars when there's no git history. */
function readCommits() {
  try {
    const out = execSync("git log --reverse --pretty=format:%h%x1f%H%x1f%s%x1f%b%x1f%an%x1f%ad%x1f%at%x1e --date=short", {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const commits = out
      .split("\x1e")
      .map((b) => b.replace(/^\s+/, ""))
      .filter(Boolean)
      .map((b) => {
        const [hash, fullHash, subject, body, author, date, ts] = b.split("\x1f");
        return { hash, fullHash, subject: subject || "", body: (body || "").trim(), author: author || "", date: date || "", timestamp: parseInt(ts, 10) || 0 };
      })
      .filter((c) => c.fullHash);
    if (commits.length) return commits;
  } catch {
    // No git (e.g. some CI builds): fall through.
  }

  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE;
  if (sha && message) {
    const [subject, ...rest] = message.split(/\r?\n/);
    const now = new Date();
    return [
      {
        hash: sha.slice(0, 7),
        fullHash: sha,
        subject,
        body: rest.join("\n").trim(),
        author: process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME || process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN || "",
        date: now.toISOString().slice(0, 10),
        timestamp: Math.floor(now.getTime() / 1000),
      },
    ];
  }
  return [];
}

async function main() {
  loadEnvFiles();
  if (process.env.CHANGELOG_SYNC === "off") return log("skipped (CHANGELOG_SYNC=off)");
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return log(`skipped on ${process.env.VERCEL_ENV} build`);

  const sa = serviceAccount();
  if (!sa) return log("skipped: FIREBASE_SERVICE_ACCOUNT is not set");

  const commits = readCommits();
  if (!commits.length) return log("skipped: no commits found");

  const { initializeApp, cert, getApps } = require("firebase-admin/app");
  const { getFirestore, FieldValue } = require("firebase-admin/firestore");
  const app = getApps()[0] ?? initializeApp({ credential: cert(sa) });
  const db = getFirestore(app);
  const col = db.collection("changelog");

  const existing = new Map((await col.get()).docs.map((d) => [d.id, d.data()]));
  let lastSeq = -1;
  let lastVersion = "";
  for (const e of existing.values()) {
    if (typeof e.seq === "number" && e.seq > lastSeq) {
      lastSeq = e.seq;
      lastVersion = e.version;
    }
  }

  // Firestore batches cap at 500 writes; flush every 400.
  let batch = db.batch();
  let pending = 0;
  const flush = async () => {
    if (pending) await batch.commit();
    batch = db.batch();
    pending = 0;
  };
  let added = 0;
  let refreshed = 0;
  let skipped = 0;

  for (const c of commits) {
    const current = existing.get(c.fullHash);
    if (current && (!refresh || current.locked)) continue;

    const d = describeCommit(c);
    if (!d) {
      skipped++;
      continue;
    }
    const content = {
      title: d.title,
      summary: d.summary,
      type: d.type,
      badge: d.badge,
      highlights: d.highlights,
      breaking: d.breaking,
      engineVersion: ENGINE_VERSION,
    };

    if (current) {
      batch.update(col.doc(c.fullHash), { ...content, updatedAt: FieldValue.serverTimestamp() });
      refreshed++;
      if (++pending >= 400) await flush();
    } else {
      lastSeq += 1;
      lastVersion = nextVersion(lastVersion, d.versionOverride);
      batch.set(col.doc(c.fullHash), {
        ...content,
        seq: lastSeq,
        version: lastVersion,
        hash: c.hash,
        fullHash: c.fullHash,
        date: c.date,
        timestamp: c.timestamp,
        author: c.author,
        rawCommit: c.subject,
        rawBody: c.body,
        locked: false,
        createdAt: FieldValue.serverTimestamp(),
      });
      added++;
      if (++pending >= 400) await flush();
    }
  }

  await flush();
  log(`${added} added, ${refreshed} refreshed, ${skipped} skipped as noise. Latest: ${lastVersion || "none"}`);
}

main().catch((err) => {
  // Never block a deploy because of the changelog.
  console.warn(`[changelog] sync failed: ${err?.message || err}`);
});
