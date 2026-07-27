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

Persistence is abstracted behind the `LedgerClient` interface in `packages/api`; the app
ships with a local AsyncStorage-backed implementation, so it is fully offline-first. Swap in
a REST/Supabase client later without touching screens or the engine.

## Commands

```sh
pnpm install
pnpm test          # engine scenario tests (vitest, packages/domain)
pnpm typecheck     # strict TS across every package
pnpm lint
pnpm --filter mobile dev    # expo start (press w for web, or scan the QR code)
```
