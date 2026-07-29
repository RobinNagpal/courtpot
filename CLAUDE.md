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
- Types come from `packages/schemas` (Zod schemas + inferred types) — that is the single
  source of truth. Infer from a schema rather than hand-writing a parallel interface.
- `tsconfig` strict mode stays on. `pnpm typecheck` must pass clean across every package.
