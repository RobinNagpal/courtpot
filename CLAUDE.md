# CourtPot — Working Agreements

## Git identity

Always commit as the **robinnagpal.tiet@gmail.com** GitHub account
([github.com/RobinNagpal](https://github.com/RobinNagpal)) — never the work account.

```sh
git config user.name "Robin Nagpal"
git config user.email "robinnagpal.tiet@gmail.com"
```

Check `git config user.email` before the first commit in a session.

## Types

Use strict types everywhere. Nearly all code should be TypeScript, and it should have
**no `any` and no `unknown`** types.

- Model the real shape instead of escaping the type system — no `any`, no `unknown`, and no
  `as` casts standing in for either.
- **Use an `enum` wherever a value comes from a fixed set** — roles, statuses, actions, kinds.
  Never pass bare strings around for these. Pair the enum with `z.nativeEnum(…)` so the same
  set validates at every boundary.
- Types come from `packages/schemas` (Zod schemas + inferred types) — that is the single
  source of truth. Infer from a schema rather than hand-writing a parallel interface.
- `tsconfig` strict mode stays on. `pnpm typecheck` must pass clean across every package.

## Database naming

**Table names are plural `snake_case`; column names are `snake_case`** — lower case words
joined by underscores. Postgres folds unquoted identifiers to lower case, so a
`MemberBooking` table has to be written `"MemberBooking"` in every hand-written query;
snake_case never needs quoting. Tables hold many rows, so they are named for the collection:
`members`, `guest_bookings`, `auth_sessions`.

Prisma keeps its own conventions — models stay singular `PascalCase`, fields stay
`camelCase` — and `@@map` / `@map` are the only place the two meet:

```prisma
model GuestBooking {
  guestId String @map("guest_id")
  paidBy  String @map("paid_by")

  @@map("guest_bookings")
}
```

- Add a plural `@@map` to every new model, and `@map` to every field whose name is not
  already a single lower-case word.
- **Renames need hand-written migrations.** `prisma migrate dev` cannot tell a rename from a
  drop-and-recreate, so it will generate `DROP TABLE` + `CREATE TABLE` and destroy the rows.
  Write `ALTER TABLE … RENAME` / `ALTER TABLE … RENAME COLUMN` by hand, and remember that
  renaming a table leaves its constraints and indexes on the old name — rename those too
  (`…_pkey`, `…_key`, `…_fkey`) so Prisma's expected names still match.
- Verify a hand-written migration by applying it to a throwaway database and running
  `prisma migrate diff --from-url <that db> --to-schema-datamodel prisma/schema.prisma
  --script`. It must report an empty migration.

### No database enums

**Enums live in TypeScript only; the database column is a plain string.** `Role` is a TS enum
in `packages/schemas`, and `members.role` / `team_members.role` are `TEXT`. Adding a role is a
one-line code change with no migration, and no Postgres enum type has to be kept in step.

`RoleSchema` (`z.nativeEnum(Role)`) is what guarantees the string is valid — parse at every
boundary that reads the column, so an unrecognised value fails loudly instead of flowing
through as an arbitrary string.

Do not add `enum` blocks to `schema.prisma`.

## Roles

Four roles, defined once as the `Role` enum in `packages/schemas/src/roles.ts`:

| Role | Can |
|---|---|
| `Admin` | manage members, teams, team allocation, and all PINs |
| `TeamMemberAdmin` | add members to their own team; set the **initial** PIN for a new member only |
| `TeamMember` | record bookings, transfers and guests |
| `TeamMemberViewer` | read only |

A role is stored in two places, and the distinction matters:

- **`members.role`** — the platform role. Only `Admin` grants anything here.
- **`team_members.role`** — the role within one team. A member belongs to many teams and can
  hold a different role in each.

The rules themselves live in `packages/domain/src/permissions.ts` as pure functions (`can`,
`canSetPin`, `effectiveRole`) so they are unit-testable without a database. Ledger rows are
not team-scoped, so `effectiveRole` decides what a member may do: a platform `Admin` always
wins, otherwise the highest of their team roles, falling back to the platform role when they
belong to no team. Gate routes with `requireCan(Action.…)` rather than comparing roles inline.
