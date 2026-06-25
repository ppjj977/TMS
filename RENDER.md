# Deploying TMS to Render

This repo ships a [`render.yaml`](./render.yaml) Blueprint that provisions a web
service **and** a PostgreSQL database in one step.

## Prerequisites

- A [Render](https://render.com) account (free).
- This repository pushed to GitHub/GitLab and connected to Render.

## 1. Create the Blueprint

1. In the Render dashboard: **New ▸ Blueprint**.
2. Select this repository and the branch
   `claude/transparent-management-system-pp9ru7` (or `main` once merged).
3. Render reads `render.yaml` and shows a plan: one web service (`tms`) and one
   database (`tms-db`). Click **Apply**.

Render then:
- creates the Postgres database,
- injects its connection string as `DATABASE_URL`,
- generates a random `SESSION_SECRET`,
- runs `npm install && prisma migrate deploy && npm run build`,
- starts the app with `npm run start`.

The first deploy takes a few minutes. When it's live you'll get a URL like
`https://tms.onrender.com`.

## 2. Demo data (automatic)

The build runs `db:seed`, which **only populates an empty database** — on first
deploy it loads the demo customers, drivers, rate cards and logins, and on every
deploy after that it's a no-op (it detects existing data and skips).

- To force a wipe-and-reseed, set `FORCE_SEED=true` on the service and redeploy
  (then remove it).
- Render's **Shell** is a paid feature, so this app seeds itself in the build
  instead of needing shell access.

## 3. Sign in

Visit your Render URL — it redirects to `/login`. Demo accounts (password
`password`):

| Email | Area |
| --- | --- |
| `admin@tms.example` | Management back-office |
| `dave@tms.example` | Driver app (`/driver`) |
| `janet@acme.example` | Customer portal (`/portal`) |

**Change these before any real use** — see the seed file `prisma/seed.ts`.

## 4. (Optional) Enable real email

By default, notification emails are recorded to the `NotificationLog` table and
the logs. To send real email, add these env vars to the `tms` service
(**Environment** tab) and redeploy:

```
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
```

## Notes & gotchas

- **Free tier sleeps.** Free web services spin down after ~15 min idle; the next
  request cold-starts in ~30–60s. Upgrade the instance to keep it warm.
- **Free Postgres expires.** Render's free database is removed after 90 days.
  For anything beyond a trial, move it to a paid database (then just update
  `DATABASE_URL`).
- **Region.** Edit the `region` in `render.yaml` (web service *and* database
  must match) to your nearest — e.g. `oregon`, `ohio`, `singapore`.
- **Migrations** run automatically on every deploy via `prisma migrate deploy`.
