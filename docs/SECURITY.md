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
