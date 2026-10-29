# Friction Log

What was hard, confusing or slow while building PatchPlan for the **Nebius × NVIDIA hackathon**, and how we got past it.

We wrote this down as it happened. Our goal is to help the teams behind these tools, and other builders who use them next.

**Stack used:** NVIDIA Nemotron models on **Nebius AI Studio**, **Tavily** web search, the **Steam** reviews API, **Firebase** (Auth and Firestore), **Next.js 14** on **Vercel**, and **Resend** for email.

---

## At a glance

| # | Area | What went wrong | Impact |
|---|------|-----------------|--------|
| 1 | Nebius | The model we used was removed and only returned a 404 | 🔴 High |
| 2 | Nemotron | "Thinking" text appeared in answers by default | 🟠 Medium |
| 3 | Nebius | JSON mode and options work differently from model to model | 🟠 Medium |
| 4 | Nebius | Raw error messages were too technical to show users | 🟡 Low |
| 5 | Tavily | Searching a game name returned other products with the same name | 🔴 High |
| 6 | Tavily | No reliable way to limit search to one subreddit | 🟠 Medium |
| 7 | Steam | The well-known reviews URL is deprecated and redirects | 🟠 Medium |
| 8 | Nemotron | 74 player reports were sorted into 0 signals | 🔴 High |
| 9 | Firebase | An email was sent but never saved to history | 🟠 Medium |
| 10 | Firebase | Allowed users saw "Private preview" until they logged in again | 🟡 Low |
| 11 | Next.js | Public roadmap changes took minutes to show | 🟠 Medium |
| 12 | tldraw | Leaving the Ideas page crashed with "e is not a function" | 🟠 Medium |

---

## AI: Nebius and NVIDIA Nemotron

### 1. The model disappeared and only returned a 404
**What happened:** Build and Player Signal suddenly failed. The cause was a 404 for `nvidia/Llama-3_3-Nemotron-Super-49B-v1_5`. The error didn't say the model had been retired or suggest a replacement.

**How we fixed it:** We checked the current model list and moved to `nvidia/nemotron-3-super-120b-a12b`. We also moved model names into environment variables (`NEMOTRON_LARGE_MODEL`), so a future change won't need a code release.

**Suggestion:** When a retired model is requested, return a clear message such as "This model was retired on DATE, try X". A short deprecation notice before removal would also help.

### 2. "Thinking" text showed up in answers
**What happened:** Nemotron reasons step by step by default. That reasoning text uses extra tokens, costs more and breaks JSON parsing.

**How we fixed it:** We turn it off with `chat_template_kwargs: { enable_thinking: false }`. Some models reject this option, so if the request fails we retry once without it.

**Suggestion:** One page listing which models support thinking on and off, and the exact parameter name for each, would save a lot of trial and error.

### 3. JSON output works differently on each model
**What happened:** `response_format` (JSON mode) worked on some models and returned errors on others.

**How we fixed it:** We first ask for JSON mode. If the model refuses, we ask for JSON in the prompt instead and parse the answer carefully.

**Suggestion:** Add a "supports JSON mode" column to the model list.

### 4. Error messages were too technical for users
**What happened:** Provider errors include raw technical details. That's fine in logs, but confusing (and sometimes revealing) on screen.

**How we fixed it:** We now save the raw error in server logs only. Users see a short, friendly message such as "PatchPlan AI is busy right now, try again".

**Suggestion:** None needed. This is good practice for anyone building on an AI API.

---

## Search: Tavily

### 5. Search results were about the wrong product
**What happened:** We tested Player Signal with a game called *Mixtape*. Most results were about other things with the same name: a music app, Steam Workshop items and other games. Only one result was about the real game.

**How we fixed it:**
- We keep a result only if the game name appears as a whole word in its title or link.
- We drop app store, Workshop and shared-file links.
- We tell the user how many unrelated results were skipped.
- For Steam games we now read reviews directly from Steam, so we don't need to search for them at all.

**Suggestion:** An option to require an exact phrase, or to exclude domains per query, would help a lot for short or common names.

**What worked well:** Changing `max_results` (up to 20) doesn't change the cost, so we can collect more results at the same price. Pricing was simple to plan around: about 3,100 searches for $25.

### 6. Hard to stay inside one subreddit
**What happened:** Adding a subreddit to the query still returned posts from other subreddits.

**How we fixed it:** We filter the results ourselves and keep only links that contain `/r/<subreddit>/`.

**Suggestion:** Add a way to limit results to a URL path, not just a domain.

---

## Player data: Steam

### 7. The common reviews URL is deprecated
**What happened:** Most guides and examples use `store.steampowered.com/appreviews/...`. That URL now redirects and doesn't return review data.

**How we fixed it:** We switched to the official Web API, `IUserReviewsService/GetAppReviews`. It's free, needs no key and returns reviews reliably.

**Suggestion:** Valve could link the old URL's docs to the new endpoint, since most search results still point to the old one.

---

## Prompting: sorting feedback into signals

### 8. 74 reports became 0 signals
**What happened:** Player Signal collected 74 reports, but the AI grouped them into nothing. There were two causes:
1. Our prompt told the model to skip feedback "about another product with the same name". Steam reviews never mention the game's name, so the model skipped all of them.
2. The model listed report numbers in different formats (`4`, `"4"`, `#4`), and our code only understood one.

**How we fixed it:**
- The rule now applies only to web and Reddit results. Steam, Discord and manual reports are never skipped.
- We accept every number format.
- Batches of more than 30 reports go to the larger model.
- We log the raw reply whenever no groups come back.

**Lesson:** A small rule in a prompt can quietly remove all of your data. Test prompts with real data from every source.

---

## Platform: Firebase, Next.js and libraries

### 9. Email sent, but no record of it
**What happened:** A scheduled digest email was delivered, but it never appeared in PatchPlan's email history. Saving the record failed because one field had the value `undefined`, and Firestore's server SDK rejects that.

**How we fixed it:**
- We clean the data before saving.
- Saving the record and updating "last sent" now happen separately, so one failing doesn't stop the other.
- We added the missing record by hand.
- We added an "Upcoming digest" card with a Skip button, so owners can see what will be sent and cancel it.

**Suggestion:** Firestore could name the field that is `undefined` in its error message.

### 10. "Private preview" until you logged in again
**What happened:** Users who were allowed to use AI still saw "Private preview" until they logged out and back in. Our check ran before Firebase had finished restoring the signed-in user.

**How we fixed it:** We now run the check only after the user is loaded.

### 11. Public roadmap updates were slow
**What happened:** Public pages are cached so they load fast for players. As a result, edits on the dashboard took up to a minute or more to show. Making a new share link seemed to "fix" it, which was confusing.

**How we fixed it:** Every dashboard edit now asks the server to refresh only that studio's public pages. Changes now show within about a second.

### 12. Crash when leaving a whiteboard
**What happened:** After opening the Canvas tab on an idea, going back crashed the page with "e is not a function". tldraw treats whatever `onMount` returns as a cleanup function. Our `onMount` was `async`, so it returned a Promise, and calling a Promise crashes.

**How we fixed it:** `onMount` is no longer `async`. It returns a real cleanup function.

**Suggestion:** tldraw could warn in development when `onMount` returns something that isn't a function.

---

## What worked really well

- **Nemotron on Nebius is cheap and fast.** One AI call costs about $0.0006 on Nano 30B and about $0.003 on Super 120B. That made it easy to set monthly caps and keep AI on for judges.
- **Nebius uses an OpenAI-style API**, so getting started took minutes.
- **Tavily's flat price per search** made costs easy to predict.
- **The official Steam reviews API** is free and gives real player feedback without scraping.

## What we built because of this friction

- **Spending caps** and a pause switch for AI, plus a sign-in allow list.
- **Friendly error messages**, with technical details kept in server logs only.
- **Relevance filters** that report how many results were skipped and why.
- **A health check** for each service at `/api/health?check=ai|db|auth|email|discord`.
