# Scheduled maintenance

Plan downtime ahead of time so studios and players know what's happening.

## Setup (once)

Add your email to `ADMIN_EMAILS` (comma-separated for several people):

- Locally: `.env.local`
- Production: Vercel → Settings → Environment Variables → `ADMIN_EMAILS` → redeploy

Only signed-in accounts whose **verified** email is on that list can use the controls. Google sign-ins are always verified.

## Scheduling a window

1. Sign in and open **`/admin/maintenance`**.
2. Fill in a title, what's affected (or nothing for the whole platform), an optional note, and the start and end. Times are in your local time zone; quick buttons set 30 minutes to 4 hours.
3. Click **Schedule**.

You can **Edit** or **Delete** upcoming windows, **Start now** to begin early, and **End now** to finish early. Changes reach the status page within about a minute (it's cached for 60 seconds).

## What people see

- **Status page → Maintenance tab** (`/status?tab=maintenance`): in progress (with a progress bar), upcoming, and the last 30 days. Times show in each visitor's own time zone.
- **Status page → Overview**: a banner when maintenance is running or starts within 7 days. During a window, the affected services show **Maintenance** instead of Operational (a real outage still shows as an outage), and the headline reads "Scheduled maintenance in progress".
- **Inside the app**: signed-in users see a slim banner from 24 hours before until the window ends. They can dismiss it; it comes back once the window starts.

## How it works

- Windows are stored in the `maintenance` Firestore collection. Browsers have no access (the rules don't list it); the server reads it for `/api/status` and writes it through `/api/admin/maintenance`.
- A window can be at most 7 days long.
