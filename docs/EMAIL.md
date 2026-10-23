# Email

The **Email** page (`/email`) lets a studio collect player emails, design newsletters and send them. It can also send an automatic weekly or daily update built from published news and tasks moved to Done.

## One-time setup (whoever runs PatchPlan)

Studios never see this. You set it once for the whole PatchPlan deployment, and every workspace can then collect sign-ups and send email. All keys are server-side. Put them in `.env.local` locally and in Vercel → Settings → Environment Variables for production. `GET /api/email/status` shows which ones are set.

| Variable | What it's for | Where to get it |
| --- | --- | --- |
| `RESEND_API_KEY` | Sends the emails | [resend.com](https://resend.com) → API Keys |
| `EMAIL_FROM_ADDRESS` | The "from" address, e.g. `updates@yourgame.com` | Resend → Domains: add your domain and its DNS records (SPF, DKIM). Use an address on that domain. |
| `FIREBASE_SERVICE_ACCOUNT` | Lets the server save public sign-ups, process unsubscribes and send scheduled digests | Firebase console → Project settings → Service accounts → Generate new private key. Paste the JSON on one line, or base64-encode it. |
| `NEXT_PUBLIC_APP_URL` | Base URL for links and unsubscribe pages | Your production URL |
| `CRON_SECRET` | Lets only Vercel Cron trigger digests | Any long random string |

## What studios see

Nothing to configure. Each workspace (a studio, or a personal workspace) has its own subscribers, campaigns and settings:

- **Studio name** defaults to the workspace name and appears on emails and the sign-up page.
- **Replies** go to the workspace owner's account email unless changed.
- A **business address** for the footer is optional but recommended, because some anti-spam laws (like CAN-SPAM) require one.

All of these can be changed in Email → Settings or Settings → Email.

## Studios' own domains (optional)

By default every studio sends from your shared `EMAIL_FROM_ADDRESS`, with its studio name as the display name. A studio can switch to its own address, like `news@mail.theirgame.com`, from Email → Settings → **Send from your own domain**:

1. The studio enters a domain. A subdomain such as `mail.theirgame.com` is recommended so it doesn't affect their normal inbox.
2. PatchPlan registers it in **your** Resend account (`POST /domains`) and shows the DNS records, each with a copy button.
3. The studio adds the records where they bought the domain, then presses **Check verification**.
4. Once Resend reports the domain as verified, every email from that studio, including automatic digests, sends from their address.

Notes:
- No extra keys are needed; it uses `RESEND_API_KEY`. Each Resend plan allows a certain number of domains, and the free plan is very limited. When you hit the limit, studios see a friendly message and keep sending from the shared address.
- If a studio's domain stops verifying (for example, they deleted the DNS records), sends automatically fall back to the shared address. The domain is then marked for re-checking. Only the recipients who hadn't received the email yet are retried.
- A domain can only be connected to one studio. Your own sending domain can't be claimed.
- Domain state is stored in `email_domains/{scopeId}`, and the one-studio-per-domain lock in `email_domain_claims/{domain}`. Only the server writes these, through Firebase Admin. Your Firestore rules should **deny all client access** to both, so a studio can't mark a domain as verified itself.
- API: `GET/POST/PATCH/DELETE /api/email/domain`. Every call checks that the caller is a member of the workspace.

## How it works

- **Sign-ups:** forms on the public News, Roadmap and article pages, plus a standalone page at `/p/subscribe/<workspace or slug>`. The standalone page can be embedded with `?embed=1`. Sign-ups go through `POST /api/email/subscribe`, which has a honeypot field and a per-IP throttle. Each studio stores one record per email, so signing up again reactivates the existing record instead of creating a duplicate.
- **Lists:** subscribers choose from three lists: Weekly update, Daily digest and Announcements. Every campaign targets either all subscribers or one list.
- **Designer:** emails are built from blocks: heading, text, image, button, news posts, changelog, social links, divider and spacer. You also set the accent colour, light or dark mode, font and logo. The live preview uses the same renderer as the real send (`src/lib/email/render.ts`), so what you see is what players get. **Write with AI** drafts the copy with Nemotron.
- **Sending:** `POST /api/email/send` reads the saved campaign on the server and checks that the caller belongs to the workspace. It then sends through Resend in batches of 100, and each recipient gets their own unsubscribe link. Messages include `List-Unsubscribe` one-click headers. **Send test** sends one copy, only to your own address.
- **Unsubscribe:** `/p/unsubscribe` checks the subscriber's private token and marks them unsubscribed. They can undo it on the same page. Studios can't manually re-add someone who opted out.
- **Automatic updates:** `vercel.json` runs `/api/email/cron` daily at 15:00 UTC. It sends the daily digest, and the weekly update on each studio's chosen weekday, only when there's new news or shipped work. Vercel's Hobby plan allows one cron run per day; on Pro you can make it hourly.

## Firestore rules

These are covered by [`firestore.rules`](../firestore.rules) (see [SECURITY.md](SECURITY.md)). Studio members read and write them from the browser, scoped like the other collections:

- `subscribers`: `scopeId` is the workspace (family id, or the user's uid for personal workspaces)
- `campaigns`: `familyId` / `userId`, like `tasks`
- `email_settings/{scopeId}`

Public visitors never touch these collections directly. Sign-up and unsubscribe go through the server with Firebase Admin.

## Limits

- Resend's free tier allows 100 emails a day and 3,000 a month. Sends are paced for its default rate of 2 requests per second.
- Each send runs in one serverless call (60 s), which covers about 10,000 recipients. Larger lists need a queue.
- Open and click tracking isn't built in. Resend's dashboard shows delivery stats.
