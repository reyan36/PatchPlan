// Owner side of the beta program. Testers never call this: they read and write their own
// docs directly in Firestore (guarded by the rules in docs/BETA.md), so the server only
// runs when a studio member opens the Beta page or acts on a request or report.

import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { revalidatePath } from "next/cache";
import { EmailError, adminDb, appUrl, emailRoute, requireMember, sendTransactional, studioName } from "@/lib/email/server";
import { CATEGORIES, LIMITS, type ReportCategory, type ReportStatus, type TesterStatus } from "@/lib/beta/types";

export const dynamic = "force-dynamic";

const MAX_ROWS = 500;
// Only light fields for the list; the full report (logs, steps, images) loads when opened.
const REPORT_LIST_FIELDS = ["testerUid", "testerName", "title", "category", "severity", "status", "platform", "build", "files", "taskId", "reply", "createdAt", "updatedAt"];
const TASK_TAG: Record<ReportCategory, string> = {
  bug: "Bug",
  crash: "Bug",
  performance: "Bug",
  visual: "Art",
  audio: "Audio",
  gameplay: "Design",
  suggestion: "Design",
};

const ms = (v: any) => (v?.toMillis ? v.toMillis() : typeof v === "number" ? v : undefined);
const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const paragraphs = (s: string) => esc(s).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");

function serialize(d: DocumentSnapshot) {
  const x = d.data() || {};
  return { id: d.id, ...x, createdAt: ms(x.createdAt), updatedAt: ms(x.updatedAt), decidedAt: ms(x.decidedAt) };
}

async function loadReport(scopeId: string, id: string) {
  const snap = await adminDb().collection("beta_reports").doc(clip(id, 128)).get();
  if (!snap.exists || snap.data()?.scopeId !== scopeId) throw new EmailError("Report not found.", 404);
  return snap;
}

/** Reports linked to a task that reached Done are marked fixed, so testers see progress without extra work. */
async function syncFixed(reports: ReturnType<typeof serialize>[]) {
  const open = reports.filter((r: any) => r.status === "in_progress" && r.taskId).slice(0, 100) as any[];
  if (!open.length) return;
  const db = adminDb();
  const tasks = await db.getAll(...open.map((r) => db.collection("tasks").doc(r.taskId)), { fieldMask: ["column"] });
  const batch = db.batch();
  let changed = 0;
  tasks.forEach((t, i) => {
    if (t.exists && t.data()?.column === "Done") {
      batch.update(db.collection("beta_reports").doc(open[i].id), { status: "fixed", updatedAt: FieldValue.serverTimestamp() });
      open[i].status = "fixed";
      changed++;
    }
  });
  if (changed) await batch.commit();
}

export const GET = emailRoute(async (req) => {
  const params = new URL(req.url).searchParams;
  const scopeId = clip(params.get("scopeId"), 128);
  await requireMember(req, scopeId);
  const db = adminDb();

  // Single report with its screenshots.
  const reportId = params.get("report");
  if (reportId) {
    const snap = await loadReport(scopeId, reportId);
    // File ids are `${reportId}_${n}` (enforced by the rules), so a report can't point at another studio's files.
    const files = ((snap.data()?.files || []) as { id: string }[]).filter((f) => f.id?.startsWith(`${snap.id}_`)).slice(0, LIMITS.files);
    const fileSnaps = files.length ? await db.getAll(...files.map((f) => db.collection("beta_files").doc(f.id))) : [];
    return {
      report: serialize(snap),
      // Only inline image data goes back to the page (never an outside URL a tester could plant).
      images: fileSnaps
        .filter((f) => f.exists && f.data()?.scopeId === scopeId && /^data:image\/(webp|jpeg|png);base64,/.test(String(f.data()?.data)))
        .map((f) => ({ id: f.id, dataUrl: String(f.data()!.data) })),
    };
  }

  const [testers, reports, program, config] = await Promise.all([
    db.collection("beta_testers").where("scopeId", "==", scopeId).limit(MAX_ROWS).get(),
    db.collection("beta_reports").where("scopeId", "==", scopeId).select(...REPORT_LIST_FIELDS).limit(MAX_ROWS).get(),
    db.collection("beta_programs").doc(scopeId).get(),
    db.collection("public_configs").doc(scopeId).get(),
  ]);
  const reportRows = reports.docs.map(serialize).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
  await syncFixed(reportRows);

  const counts = new Map<string, number>();
  reportRows.forEach((r: any) => counts.set(r.testerUid, (counts.get(r.testerUid) || 0) + 1));
  const cfg = config.data() || {};
  return {
    testers: testers.docs.map(serialize).map((t: any) => ({ ...t, reports: counts.get(t.uid) || 0 })).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)),
    reports: reportRows,
    settings: {
      open: cfg.betaOpen ?? false,
      intro: cfg.betaIntro || "",
      instructions: program.data()?.instructions || "",
      build: program.data()?.build || "",
      slug: cfg.newsSlug || cfg.roadmapSlug || scopeId,
    },
  };
});

export const POST = emailRoute(async (req) => {
  const body = await req.json().catch(() => ({}));
  const scopeId = clip(body.scopeId, 128);
  const { uid } = await requireMember(req, scopeId);
  const db = adminDb();

  switch (body.action) {
    case "settings": {
      const open = !!body.open;
      const intro = clip(body.intro, LIMITS.intro);
      const instructions = clip(body.instructions, LIMITS.instructions);
      const build = clip(body.build, LIMITS.build);
      await Promise.all([
        db.collection("public_configs").doc(scopeId).set({ betaOpen: open, betaIntro: intro }, { merge: true }),
        db.collection("beta_programs").doc(scopeId).set({ instructions, build, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
      ]);
      // The public portal is cached; refresh it so "accepting testers" changes show right away.
      const slug = clip(body.slug, 128);
      revalidatePath(`/p/beta/${scopeId}`);
      if (slug && slug !== scopeId) revalidatePath(`/p/beta/${slug}`);
      return { ok: true };
    }

    case "tester": {
      const status = body.status as TesterStatus;
      if (!["approved", "denied", "removed", "pending"].includes(status)) throw new EmailError("Unknown status.", 400);
      const ref = db.collection("beta_testers").doc(`${scopeId}_${clip(body.uid, 128)}`);
      const snap = await ref.get();
      if (!snap.exists) throw new EmailError("Tester not found.", 404);
      const was = snap.data()!.status;
      await ref.update({ status, decidedAt: FieldValue.serverTimestamp(), decidedBy: uid });

      // Let the tester know they're in. Best effort: approval still counts if email isn't set up.
      let emailed = false;
      if (status === "approved" && was !== "approved" && process.env.RESEND_API_KEY) {
        try {
          const email = snap.data()!.email || (await getAuth().getUser(snap.data()!.uid).catch(() => null))?.email;
          if (email) {
            const name = await studioName(scopeId);
            const link = `${appUrl(req)}/p/beta/${encodeURIComponent(clip(body.slug, 128) || scopeId)}`;
            await sendTransactional(scopeId, email, `You're in the ${name} beta`, [
              { id: "h", type: "heading", text: `You're in the ${name} beta` },
              { id: "t", type: "text", text: `Thanks for signing up to test. Your request was approved. Open the beta page to see how to get the build and to report anything that breaks.` },
              { id: "b", type: "button", label: "Open the beta page", url: link },
            ]);
            emailed = true;
          }
        } catch (err) {
          console.warn("[beta] approval email failed:", err instanceof Error ? err.message : err);
        }
      }
      return { ok: true, emailed };
    }

    case "report": {
      const snap = await loadReport(scopeId, body.id);
      const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
      if (body.status !== undefined) {
        if (!["new", "in_progress", "fixed", "closed"].includes(body.status)) throw new EmailError("Unknown status.", 400);
        update.status = body.status as ReportStatus;
      }
      if (body.reply !== undefined) update.reply = clip(body.reply, LIMITS.reply);
      await snap.ref.update(update);
      return { ok: true };
    }

    case "task": {
      const snap = await loadReport(scopeId, body.id);
      const r = snap.data()!;
      if (r.taskId) return { ok: true, taskId: r.taskId };
      const board = await db.collection("board_configs").doc(scopeId).get();
      const category = CATEGORIES.find((c) => c.key === r.category);
      const details = [
        r.description && `<h3>What happened</h3>${paragraphs(r.description)}`,
        r.steps && `<h3>Steps to reproduce</h3>${paragraphs(r.steps)}`,
        r.expected && `<h3>Expected</h3>${paragraphs(r.expected)}`,
        `<p><strong>Severity:</strong> ${esc(r.severity || "")} · <strong>Type:</strong> ${esc(category?.label || "")}${r.platform ? ` · <strong>Platform:</strong> ${esc(r.platform)}` : ""}${r.build ? ` · <strong>Build:</strong> ${esc(r.build)}` : ""}</p>`,
        `<p>Reported by beta tester ${esc(r.testerName || "")}. <a href="/beta?report=${encodeURIComponent(snap.id)}">Open the report</a> for screenshots and logs.</p>`,
      ].filter(Boolean);
      const task = await db.collection("tasks").add({
        title: clip(r.title, 140),
        column: board.data()?.columns?.[0] || "Backlog",
        tags: [TASK_TAG[r.category as ReportCategory] || "Bug"],
        description: details.join(""),
        userId: uid,
        familyId: scopeId === uid ? null : scopeId,
        assigneeId: null,
        reporters: r.testerName ? [r.testerName] : [],
        source: "beta",
        betaReportId: snap.id,
        createdAt: FieldValue.serverTimestamp(),
      });
      await snap.ref.update({ taskId: task.id, status: "in_progress", updatedAt: FieldValue.serverTimestamp() });
      return { ok: true, taskId: task.id };
    }

    // Removes a denied/removed tester completely: their record, reports and screenshots.
    case "purge-tester": {
      const testerUid = clip(body.uid, 128);
      const ref = db.collection("beta_testers").doc(`${scopeId}_${testerUid}`);
      const tester = await ref.get();
      if (!tester.exists) throw new EmailError("Tester not found.", 404);
      if (tester.data()!.status === "approved") throw new EmailError("Remove the tester before deleting their data.", 400);
      const reports = await db.collection("beta_reports").where("scopeId", "==", scopeId).where("testerUid", "==", testerUid).select("files").get();
      const refs = [ref, ...reports.docs.map((r) => r.ref)];
      reports.docs.forEach((r) =>
        ((r.data().files || []) as { id: string }[]).filter((f) => f.id?.startsWith(`${r.id}_`)).forEach((f) => refs.push(db.collection("beta_files").doc(f.id)))
      );
      for (let i = 0; i < refs.length; i += 400) {
        const batch = db.batch();
        refs.slice(i, i + 400).forEach((r) => batch.delete(r));
        await batch.commit();
      }
      return { ok: true, reports: reports.size };
    }

    case "delete": {
      const snap = await loadReport(scopeId, body.id);
      const batch = db.batch();
      ((snap.data()?.files || []) as { id: string }[])
        .filter((f) => f.id?.startsWith(`${snap.id}_`))
        .forEach((f) => batch.delete(db.collection("beta_files").doc(f.id)));
      batch.delete(snap.ref);
      await batch.commit();
      return { ok: true };
    }

    default:
      throw new EmailError("Unknown action.", 400);
  }
});
