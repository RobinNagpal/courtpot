# CourtPot

A badminton club app (rankings, matchmaking and more later). The first module is
**cost splitting**: tracking shared court-booking costs across members and guests,
and answering one question per person — how much do they owe, or how much are they owed?

## Stack

Expo (React Native, iOS + Android + web) · Expo Router · NativeWind · TanStack Query · Zod · Turborepo · TypeScript (strict).

## Monorepo layout

```
apps/
  mobile/       Expo app — screens, navigation, NativeWind UI only
  server/       REST API — Hono + Prisma + Postgres, username/PIN auth
packages/
  domain/       Pure balance engine (computeBalances, suggestSettlements, split math). No React/Expo. Unit-tested.
  schemas/      Zod schemas + inferred types — the single source of truth for types and validation
  api/          Data-access client interface + TanStack Query hooks (queries, optimistic mutations, derived balances)
  ui/           Shared NativeWind components & design tokens (BalanceChip, Button, formatCents, …)
  config/       Shared tsconfig, eslint flat config, tailwind preset
```

Dependency rule: `schemas` depends on nothing; `domain` depends only on `schemas`;
`api` depends on `schemas` + `domain`; `ui` depends on `domain`; `mobile` depends on all.

## How the money works

- All amounts are **integer cents**; formatting to `$` happens only at the display edge (`formatCents`).
- **Member bookings**: the sum of the payers' amounts is split equally among the players;
  payers are credited what they fronted. Equal splits are exact — `floor(total / n)` plus one
  cent each to the first `r` members by sorted id, so shares always sum to the total.
- **Guest bookings**: the guest is charged the amount; the funder (a member, or `"ALL"` =
  the common members' budget) is credited.
- **Transfers**: sender credited, receiver debited; between any member or guest.
- Balances are **derived, never stored**, and the engine guarantees that the sum of all
  balances is exactly zero (`reconcileTotal`).
- **Settle up** greedily matches the largest debtor to the largest creditor and can log the
  suggested payments as real transfers.

Persistence is abstracted behind the `LedgerClient` interface in `packages/api`, with two
implementations: a local AsyncStorage one (fully offline, the default) and a REST one backed
by `apps/server`. Set `EXPO_PUBLIC_API_URL` to switch the app into server mode.

## Server mode (Postgres + Prisma + username/PIN login)

`apps/server` is a small Hono API over Postgres via Prisma. Members sign in with a
**username + 4-digit PIN**. PINs are generated server-side when a member is created and are
**never returned by any API** (enforced with Prisma's global `omit`); the organiser reads
them with an operator CLI instead. Sessions are bearer tokens stored in the database.

```sh
cd apps/server
cp .env.example .env          # set DATABASE_URL (Neon/Supabase/Railway/local Postgres)
pnpm db:migrate               # apply migrations (prisma migrate deploy)
pnpm db:seed                  # create the five regulars, prints their PINs
pnpm dev                      # API on http://localhost:3001
pnpm pins                     # operator-only: print every member's PIN from the DB
pnpm user:test                # create a test member with random username + PIN, prints both
```

On its very first start against an empty database the server bootstraps a predefined
test user (username `test`) and prints its PIN to the console — so a fresh deployment
is immediately loggable-into. Subsequent starts are a no-op.

Then run the app against it: `EXPO_PUBLIC_API_URL=http://localhost:3001 pnpm --filter mobile dev`.
Login is intentionally simple for now (plain PIN comparison, no rate limiting) — email-based
auth can replace it later behind the same `AuthApi` interface.

## Commands

```sh
pnpm install
pnpm test          # engine scenario tests (vitest, packages/domain)
pnpm typecheck     # strict TS across every package
pnpm lint
pnpm --filter mobile dev    # expo start (press w for web, or scan the QR code)
```
