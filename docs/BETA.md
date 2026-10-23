# Beta testers

Studios run a closed beta from PatchPlan. Testers apply on a public page, the studio approves them, and approved testers report issues with screenshots. The studio turns reports into board tasks with one click.

## Flow

1. **Owner:** Beta → Settings. Write a short public intro, add private instructions for approved testers (download link, password, what to focus on), set the current build, turn on **Accept new testers**, and save.
2. **Owner:** share the beta page link: `/p/beta/<workspace id or news/roadmap slug>`.
3. **Tester:** opens the link, creates an account (Google or email), and requests access with their name, platforms, specs and Discord.
4. **Owner:** Beta → Testers → **Approve** or **Deny**. Approval sends the tester a "You're in" email when email is set up (see `docs/EMAIL.md`).
5. **Tester:** the page switches to "You're in" on its own, shows the private instructions, and unlocks the report form. A report has a title, type, severity, what happened, steps, expected result, platform, build, up to 4 screenshots (drop, paste or pick), a video link and a crash log. Text drafts are saved in the browser.
6. **Owner:** Beta → Reports. Open a report to see everything, then **Create board task**. The task gets the right tag, the details, and credits the tester as a reporter. Set the status and write a reply; the tester sees both under My reports.
7. When the linked task reaches **Done**, the report is marked **Fixed** the next time the Beta page loads.

## How it stays light on the server

- **Testers never call the server.** Applying, reading their status, loading instructions and sending reports all go straight to Firestore, protected by the rules below. The status card uses a single-document listener; reports and instructions are one-time reads.
- **The public beta page is cached** (`revalidate = 3600`). Saving beta settings revalidates it, so visits normally don't run a function.
- **Owners use one route:** `GET /api/beta` loads the whole page in one call, using a field mask so long fields (logs, steps) and screenshots aren't sent. `GET /api/beta?report=<id>` loads one report with its screenshots when it's opened, and the browser keeps the last 20 opened. Actions (`POST /api/beta`) update the page locally instead of reloading it.
- **Screenshots never pass through the server.** They're resized in the tester's browser (max 1600 px, WebP or JPEG, about 450 KB) and saved in Firestore with the report in one atomic batch. Cloud Storage now requires the Blaze plan, and this project has no bucket, so Firestore is used instead. Videos are shared as links (YouTube, Drive, Streamable, Medal).
- **No composite indexes needed.** All queries are equality-only; lists are sorted in memory and capped at 500 rows per workspace.

## Data

| Collection | Doc id | Written by |
| --- | --- | --- |
| `beta_testers` | `<scopeId>_<uid>` | Tester creates it (status `pending`). Owner changes status through the server. |
| `beta_reports` | auto id | Tester creates it (status `new`). Owner updates status, reply and task link through the server. |
| `beta_files` | `<reportId>_<0-3>` | Tester, in the same batch as the report. One compressed screenshot per doc. |
| `beta_programs` | `<scopeId>` | Server only. Private instructions and current build, readable by approved testers. |
| `public_configs` | `<scopeId>` | Adds `betaOpen` and `betaIntro`, which the public page reads. |

## Firestore rules

The beta rules are part of [`firestore.rules`](../firestore.rules) (see [SECURITY.md](SECURITY.md) for publishing). In short:

- `beta_testers`: a tester can read their own record and create it as `pending` while the studio accepts testers. Only the server changes the status.
- `beta_programs`: readable by approved testers only.
- `beta_reports` and `beta_files`: an approved tester can create and read their own, with size and field checks. Files must be written together with their report.
- Studio members never read these from the browser; the Beta page goes through `/api/beta`, which checks membership on the server.

## Limits

- 4 screenshots per report, about 450 KB each after compression. Firestore's free tier has 1 GiB of storage, which fits a few thousand screenshots. Deleting a report also deletes its screenshots.
- The Beta page loads the newest 500 reports and 500 testers per workspace.
- Video uploads would need Cloud Storage (Blaze plan). Until then, testers paste a link.
