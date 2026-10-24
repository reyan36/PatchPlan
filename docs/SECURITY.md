# Firestore security rules

The rules live in [`firestore.rules`](../firestore.rules). They replace the old rules, which let **any signed-in user read and write every collection** (including other studios' tasks, player email lists and email settings). The old rules are saved in [`firestore.rules.previous`](firestore.rules.previous) for rollback.

## What the rules allow

| Data | Who can read | Who can write |
| --- | --- | --- |
| `user_profiles/{uid}` | that user | that user |
| `families` (studios) | members | owner edits; members can only remove themselves; joining goes through `/api/teams/join` |
| `tasks`, `ideas`, `campaigns`, `signals`, `modules`, `module_rows` | members of the studio (`familyId`), or the creator for personal docs (`userId`) | same, and new docs must belong to a workspace you're in |
| `tasks` assigned to you | you (for Inbox and the navbar) | members |
| `articles` | anyone if `status == "published"`, otherwise members | members |
| `roadmap`, `roadmap_configs`, `public_configs` | anyone (public pages) | members |
| `contacts`, `subscribers` (`scopeId`) | members | members |
| `board_configs`, `integrations`, `email_settings` (doc id = workspace) | members | members |
| Beta collections | see [BETA.md](BETA.md) | see [BETA.md](BETA.md) |
| `email_domains`, `email_domain_claims`, `changelog`, anything not listed | nobody (server only) | nobody (server only) |

A "member" is a uid in the studio's `memberIds` (or its `ownerId`). The app keeps `memberIds` in sync when studios are created, joined or left. Studios created before this change were backfilled with `scripts/backfill-member-ids.mjs` (already run; safe to run again).

## Publishing

1. Make sure the code with these changes is **deployed first** (the new join route and `memberIds` updates). Old code can't join studios under the new rules.
2. Firebase console → Firestore Database → **Rules** → paste the contents of `firestore.rules` → **Publish**. The console checks the syntax before publishing.
3. Run the checklist below while signed in. If anything is blocked, roll back (below) and tell me what failed.

### Checklist (about 5 minutes)

- Dashboard loads, ideas and team overview show
- Board: tasks show, create, move, edit in the side panel, delete
- Inbox: tasks assigned to you show with the studio name
- Ideas, News (create, edit, publish), Roadmap, Network (contacts), Email (subscribers, campaigns, settings)
- AI: Player Signal, Search, Build
- Teams: switch workspace, create a studio, join with a code from a second account, leave
- Settings: notifications toggles, integrations
- Signed out: public news, article, roadmap and beta pages load
- Beta: a tester can apply, and once approved, send a report with a screenshot

### Rollback

Firebase console → Firestore → Rules → **Rules history** → pick the previous version → Restore. Or paste `docs/firestore.rules.previous` and publish.

## Notes

- The rules couldn't be run in the Firestore emulator here (it needs Java). They were checked against every query and write in the app: each list query filters on a field the rules can check (`familyId`, `userId`, `scopeId`, `assigneeId` or `testerUid`).
- Server routes use Firebase Admin, which isn't affected by these rules.

# Monitoring and alerts

## How you find out about an attack

| Channel | When |
|---|---|
| **Email** to everyone in `ADMIN_EMAILS` | Immediately for high-severity events; once per 30 min when 20+ suspicious requests arrive within 10 minutes |
| **Discord** (optional, `SECURITY_WEBHOOK_URL`) | Same alerts, instantly on your phone |
| **`/admin/security`** | Full log for the last 7 days: counts, most active IPs, every event. "Send test alert" checks delivery. |
| **Google Cloud Monitoring** (set up once, see below) | Firestore rule denials and traffic spikes, which happen in the browser and never reach our server |

## What gets logged (`security_events`, server-only, kept 30 days)

| Event | Severity | Meaning |
|---|---|---|
| Admin API denied | high | A signed-in non-admin called an admin API |
| Invalid sign-in token | warn | Forged or malformed token (expired ones are normal and ignored) |
| Access to another workspace | warn | Signed-in user asked for a studio they're not in |
| Rate limit hit | warn | Over 120 API requests/min from one IP, 20 AI calls/min per user, 30 link previews/min |
| Daily AI limit reached | warn | An account used its 300 AI calls for the day |
| Cron called without secret | warn | Someone tried to trigger the daily email job |
| Blocked internal URL | warn | Link preview asked for a private address (SSRF attempt) |
| Admin action / Studio deleted / Ownership transferred | info | Audit trail, no alert |

During a flood, each server instance writes at most 40 events a minute and counts the rest (`+N more`), so an attack can't run up Firestore usage.

## Protections in place

- Security headers on every page: no framing by other sites (except `/p/*` public pages), `nosniff`, HSTS, strict referrer, camera/mic/location disabled, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
- All API routes: per-IP rate limit. AI routes: per-user per-minute and daily limits (`ai_usage`), so a stolen account can't drain the AI budget.
- Sign-in tokens are verified locally with Firebase Admin (no API-key lookups from the server).
- `/api/metadata` (link previews): signed-in only, public http(s) hosts only, redirects re-checked, 256 KB read limit.
- The open image proxy (`images.remotePatterns: **`) was removed; nothing used it.

## One-time console setup

1. **Google Cloud Monitoring alerts** (free): console.cloud.google.com → Monitoring → Alerting → Create policy.
   - Metric `Firestore Instance → Rules evaluation count`, filter `result = DENY`, threshold e.g. > 200 in 5 min. Spots someone poking at the database directly.
   - Metric `Firestore Instance → Document reads`, threshold e.g. > 20,000 in 1 hour. Spots scraping before the free quota (50k/day) runs out.
   - Notification channel: your email (and the Google Cloud mobile app if you want push).
2. **Restrict the Firebase browser API key**: Google Cloud → APIs & Services → Credentials → "Browser key (auto created by Firebase)" → Application restrictions: Websites → `https://patchplan.net/*`, `http://localhost:3000/*` (plus `https://*.vercel.app/*` if you use preview deploys). The server no longer uses this key, so nothing breaks.
3. **Firebase Authentication → Settings**:
   - Authorized domains: keep only `patchplan.net`, `localhost` and the Firebase defaults; remove old `*.vercel.app` entries you don't use.
   - User actions: turn on **Email enumeration protection**.
   - Password policy: require at least 8 characters with a number.
4. **App Check** (later, optional): register reCAPTCHA v3, then enforce for Firestore so only patchplan.net can use your Firebase project. Needs a code change; ask before enabling enforcement or local dev breaks.
5. **GitHub**: Settings → Code security → turn on Dependabot alerts and secret scanning.
