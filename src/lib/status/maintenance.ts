// Server-only: scheduled maintenance windows, stored in the `maintenance` collection.
// The Firestore rules give browsers no access; reads go through /api/status and writes
// through /api/admin/maintenance (admins only).

import type { Firestore } from "firebase-admin/firestore";
import { COMPONENTS, type Maintenance, type MaintenancePhase } from "./types";

export const MAINTENANCE = "maintenance";
const RECENT_DAYS = 30;

export function phaseOf(start: number, end: number, now = Date.now()): MaintenancePhase {
  if (now < start) return "upcoming";
  if (now < end) return "in_progress";
  return "completed";
}

export function toMaintenance(id: string, d: FirebaseFirestore.DocumentData, now = Date.now()): Maintenance {
  const start = Number(d.start) || 0;
  const end = Number(d.end) || start;
  return {
    id,
    title: String(d.title || "Scheduled maintenance"),
    description: String(d.description || ""),
    components: Array.isArray(d.components) ? d.components.filter((c: unknown) => typeof c === "string" && COMPONENTS[c as string]) : [],
    start,
    end,
    phase: phaseOf(start, end, now),
  };
}

/** Active, upcoming and last-30-days windows for the public status page. */
export async function loadMaintenance(db: Firestore) {
  const now = Date.now();
  const snap = await db.collection(MAINTENANCE).where("end", ">=", now - RECENT_DAYS * 86400000).get();
  const all = snap.docs.map((d) => toMaintenance(d.id, d.data(), now));
  return {
    active: all.filter((m) => m.phase === "in_progress").sort((a, b) => a.start - b.start),
    upcoming: all.filter((m) => m.phase === "upcoming").sort((a, b) => a.start - b.start),
    recent: all.filter((m) => m.phase === "completed").sort((a, b) => b.end - a.end),
  };
}

/** Admins are listed by email in ADMIN_EMAILS (comma-separated). The email must be verified. */
export function isAdmin(email?: string, verified?: boolean) {
  if (!email || !verified) return false;
  const list = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}
