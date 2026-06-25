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
          └─ Job ─── Stop (multi-drop)
                │
                ├── Driver ── Vehicle (default)
                └── Vehicle

RateCard (CUSTOMER | DRIVER) → scoped by owner / vehicle type / day / time
```

See `prisma/schema.prisma` for the full schema and `src/lib/pricing.ts` for the
pricing engine.
