# TMS — Transparent Management System

A management system for **same-day, multi-drop transport operations**. Store
customer accounts and contacts, manage your fleet and drivers, book multi-drop
jobs, allocate them to drivers, price them with a flexible rate-card engine, and
track live job status from a management dashboard.

## Features

- **Customers & contacts** — accounts with payment terms, addresses and multiple
  contacts.
- **Fleet & drivers** — vehicles (bike → artic) and drivers, with a default
  vehicle per driver.
- **Bookings** — same-day jobs with any number of collection/delivery stops,
  time windows, and per-stop contacts.
- **Allocation** — an allocation board to assign unallocated jobs to drivers and
  see each driver's live workload.
- **Rate cards / pricing engine** — prices are `max(distance × rate-per-mile,
  minimum charge)`. Rate cards can be scoped by:
  - **owner** — a specific customer/driver, or a global default,
  - **vehicle type**,
  - **day type** — weekday / Saturday / Sunday / bank holiday,
  - **time band** — daytime / out-of-hours.

  Both **customer revenue** and **driver cost** are priced, and job **margin**
  is shown. The most specific matching card wins (owner › vehicle › day › time).
- **Status tracking** — jobs flow `Booked → Allocated → On route → Completed →
  Invoiced`; stops are progressed individually and roll the job status forward.
- **Service levels** — same-day direct / same-day standard / timed / overnight.
- **Authentication & roles** — login with four roles: **admin** & **operator**
  (management back-office), **driver** (driver app), **customer** (portal).
- **Proof of delivery & timeline** — capture a signature (on-screen), signer
  name and notes per stop; every status change is recorded to a timestamped
  **audit timeline** shown on the job, the portal and the driver app.
- **Driver web app** (`/driver`) — mobile-friendly. Drivers see their allocated
  jobs, tap-to-call/-map each stop, mark arrived/failed and capture POD.
- **Customer portal** (`/portal`) — customers self-serve book jobs against their
  account (priced on their rate card) and track their own deliveries live.
- **Invoicing** (`/invoices`) — generate invoices from completed, un-invoiced
  jobs per customer (one line per job), with numbering, due dates from the
  account's payment terms, and a draft → sent → paid (or void) workflow.
- **Postcode lookup & auto-distance** — postcode → town/region autofill and
  geocoding via the free [postcodes.io](https://postcodes.io) API (no key). Job
  distance is auto-estimated from the route when left at 0. Pluggable: swap in a
  house-level address provider in `src/lib/postcode.ts`.
- **Email notifications** — booking confirmation, allocation and completion
  emails. Uses SMTP when configured (see `.env.example`); otherwise every
  message is recorded to the `NotificationLog` table and logged to the console,
  so nothing is lost before SMTP is set up.

## Demo logins

After seeding, all demo users share the password **`password`**:

| Email | Role |
| --- | --- |
| `admin@tms.example` | Admin (management) |
| `ops@tms.example` | Operator (management) |
| `dave@tms.example` | Driver (driver app) |
| `janet@acme.example` | Customer (portal) |

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router, React 19, Server Actions)
- TypeScript + Tailwind CSS
- [Prisma](https://www.prisma.io/) ORM + PostgreSQL
- [Zod](https://zod.dev/) for input validation

## Getting started

### 1. Database

Either use the bundled Docker Postgres:

```bash
docker compose up -d
```

…or point `DATABASE_URL` at any PostgreSQL 14+ instance.

```bash
cp .env.example .env   # edit DATABASE_URL if needed
```

### 2. Install & set up

```bash
npm install
npx prisma migrate deploy   # apply migrations
npm run db:seed             # load demo data (optional)
```

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (runs `prisma generate`) |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Drop, re-migrate and reseed |

## Data model

```
Customer ─┬─ Contact
          ├─ User (CUSTOMER role)
          ├─ Invoice ── InvoiceLine
          └─ Job ─┬─ Stop (multi-drop, with geocode + POD)
                  ├─ JobEvent (audit timeline)
                  ├─ Driver ── Vehicle (default), User (DRIVER role)
                  ├─ Vehicle
                  └─ Invoice

RateCard (CUSTOMER | DRIVER) → scoped by owner / vehicle type / day / time
NotificationLog → every email sent or logged
```

See `prisma/schema.prisma` for the full schema, `src/lib/pricing.ts` for the
pricing engine, `src/lib/auth.ts` for sessions/roles and `src/lib/postcode.ts`
for postcode lookup.

> **Note on outbound network:** postcode lookup (postcodes.io) and SMTP email
> need outbound internet access from wherever the app runs. Both fail soft — if
> the network is unavailable the app falls back to manual address entry and to
> logging notifications — so the system is fully usable offline during
> development.
