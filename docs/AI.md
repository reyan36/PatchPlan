# PatchPlan AI

PatchPlan AI lives at `/ai` (the **AI** item in the navbar). It runs on NVIDIA Nemotron models through Nebius Token Factory. Every model, Tavily and Discord call happens in `src/app/api/ai/*` route handlers, so no keys reach the browser. Each route checks the caller's Firebase ID token.

## Setup

1. Copy the AI block from `.env.example` into `.env.local` and fill it in.
2. Confirm the Nemotron model IDs your key can use (see the `curl` line in `.env.example`) and set `NEMOTRON_SMALL_MODEL` / `NEMOTRON_LARGE_MODEL` if they differ from the defaults.
3. Create a Discord application with a bot user, enable the **Message Content** intent, invite it to your server, and give it View Channel + Read Message History on the feedback channel. Paste that channel's ID into **AI → Player Signal → Sources**. The existing webhook in Settings → Integrations still posts updates back.
4. The AI collections are covered by [`firestore.rules`](../firestore.rules) (see [SECURITY.md](SECURITY.md)). They're scoped the same way as `tasks` (`familyId` for studios, `userId` for personal):
   - `signals`: triaged player feedback
   - `modules`: AI-built tools
   - `module_rows`: rows in those tools (each row also carries `moduleId`)

## Player Signal

`collect` → `triage` → approve → ship → `patch-notes` → publish

| Step | Where | Model |
| --- | --- | --- |
| Collect from Discord, Steam, Reddit, web or pasted text | `api/ai/signal/collect` | none (Discord REST + Tavily) |
| Sort into bug / balance / feature / praise and group duplicates | `api/ai/signal/triage` | small |
| Match each group to a board task or draft a new one | `api/ai/signal/triage` | large |
| Approve: link to the task, or create it in the board's first column | client → `tasks`, `signals` | none |
| Write patch notes for linked tasks that reached **Done** | `api/ai/patch-notes` | large |
| Publish: News article (Patch Notes), roadmap item in the last column, Discord embed crediting reporters | client → `articles`, `roadmap`, webhook | none |

Reports already stored in a signal are skipped on the next run, so collecting again doesn't create duplicates. The patch-notes HTML is assembled on the server from escaped model output, so player text can't inject markup.

## Search Everything

The client gathers tasks, design docs (ideas), news, roadmap items, contacts and signals for the active workspace. The route keeps the 40 best keyword matches, and the small model reranks them and writes a one-line answer. Results link straight to the item; board tasks open via `/board?task=<id>`.

## Build Anything

The large model turns a description into a module schema: fields (text, longtext, number, select, checkbox, date, progress, url), a view (table, board or cards) and sample rows. The server validates the schema before returning it. You preview and edit it, can refine it with follow-up prompts, then add it to the workspace. Modules open at `/modules/<id>`.
