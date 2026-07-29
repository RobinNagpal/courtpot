# Architecture — how the app runs

CourtPot is one Expo codebase that ships to **iOS, Android and web**. There is no separate
web app: the browser build is the same React Native tree rendered through
`react-native-web`, bundled by Metro. Alongside it sits an optional REST API
(`apps/server`) that the app can be pointed at instead of local device storage.

- Web dev server: **http://localhost:7070** (`apps/mobile`)
- API dev server: **http://localhost:7071** (`apps/server`)

---

## 1. Package graph

The monorepo enforces a strict one-directional dependency rule, so the money logic stays
testable without React, Expo, or a database anywhere near it.

```mermaid
flowchart TD
    subgraph apps
        mobile["apps/mobile<br/>Expo app — screens & navigation"]
        server["apps/server<br/>Hono REST API + Prisma"]
    end

    subgraph packages
        api["packages/api<br/>LedgerClient + TanStack Query hooks"]
        ui["packages/ui<br/>NativeWind components, formatCents"]
        domain["packages/domain<br/>balance engine — pure TS, unit-tested"]
        schemas["packages/schemas<br/>Zod schemas + inferred types"]
    end

    pg[("Postgres")]

    mobile --> api
    mobile --> ui
    mobile --> domain
    mobile --> schemas
    api --> domain
    api --> schemas
    ui --> domain
    domain --> schemas
    server --> domain
    server --> schemas
    server --> pg

    classDef leaf fill:#e8f0fe,stroke:#4a7ebb
    class schemas,domain leaf
```

`schemas` depends on nothing. `domain` depends only on `schemas` — no React, no Expo, no
Prisma — which is why the engine tests (`packages/domain/test/engine.test.ts`) run as plain
vitest with no harness.

Note that `packages/api` is shared by the app only; `apps/server` deliberately does **not**
import it. Instead it re-implements the same five-collection shape server-side
(`CollectionStore` in `apps/server/src/collections.ts` mirrors `CollectionClient` in
`packages/api/src/client.ts`), so the two sides agree by convention over a shared Zod schema
rather than by sharing transport code.

---

## 2. Two run modes

The same build runs either fully offline or against Postgres. The switch is one env var,
resolved in `apps/mobile/lib/config.ts`, and it decides two things at module load: which
`LedgerClient` gets built, and whether the login gate appears at all.

```mermaid
flowchart TD
    start["EXPO_PUBLIC_API_URL"] --> check{"value?"}

    check -->|"a URL"| remote["Server mode"]
    check -->|"the literal: local"| local["Local mode"]
    check -->|"unset + __DEV__"| dev["Server mode<br/>defaults to :7071"]
    check -->|"unset + production"| local

    local --> lc["createLocalLedgerClient()<br/>AsyncStorage"]
    remote --> rc["createRestLedgerClient()<br/>fetch + Bearer token"]
    dev --> rc

    lc --> noauth["isRemote = false<br/>AuthGate passes straight through —<br/>no login screen"]
    rc --> auth["isRemote = true<br/>AuthGate requires username + PIN"]

    classDef localCls fill:#e6f4ea,stroke:#34a853
    classDef remoteCls fill:#fce8e6,stroke:#ea4335
    class local,lc,noauth localCls
    class remote,dev,rc,auth remoteCls
```

The dev default is deliberate: an unset var in development points at `localhost:7071` so
`pnpm dev` always exercises the login path. Set `EXPO_PUBLIC_API_URL=local` to get the
offline mode back without a server. A production build with the var unset falls back to
local mode — a shipped binary never guesses an API origin.

Because both clients satisfy the same `LedgerClient` interface, **no screen and no hook
knows which mode it is in.** Swapping persistence touches only `apps/mobile/lib/storage.ts`.

---

## 3. What happens on `pnpm dev` (web)

```mermaid
sequenceDiagram
    participant You
    participant Turbo as turbo run dev
    participant Metro as Metro (:7070)
    participant Browser
    participant API as Hono API (:7071)
    participant PG as Postgres

    You->>Turbo: pnpm dev
    par both apps start, persistent
        Turbo->>Metro: expo start --port 7070
        Turbo->>API: prisma generate && tsx watch src/index.ts
    end
    API->>PG: ensureFirstUser() — seed "test" user if members table empty
    Note over API: prints the generated PIN to stdout

    You->>Browser: open localhost:7070
    Browser->>Metro: GET /
    Metro->>Metro: bundle expo-router/entry<br/>(RN → react-native-web, NativeWind → CSS)
    Metro-->>Browser: single-page JS bundle

    Browser->>Browser: RootLayout → AuthGate
    Browser->>API: POST /api/auth/login {username, pin}
    API->>PG: findUnique(username), compare pin
    API-->>Browser: {token, member}
    Browser->>API: GET /api/members … (Authorization: Bearer)
    API->>PG: findMany ×5 collections
    API-->>Browser: rows
```

Two details specific to the web target:

- `app.json` sets `web.bundler: "metro"` and `web.output: "single"` — a client-rendered SPA,
  not static per-route HTML. Every Expo Router route is served by the same entry bundle.
- `AsyncStorage` on web is backed by `localStorage`. So both the ledger data in local mode
  and the persisted TanStack Query cache live in the browser's `localStorage`, which means
  they are per-origin and survive reload but not a different browser or profile.

The `prisma generate` in the server's `dev` script is load-bearing: `@prisma/client` is
hoisted to the repo root, so its install-time postinstall cannot find
`apps/server/prisma/schema.prisma` and leaves behind a stub that throws
`"@prisma/client did not initialize yet"`.

---

## 4. Read path — how a screen gets balances

Balances are never fetched and never stored. They are recomputed from the five cached
collections on every render, in the client, by the pure engine.

```mermaid
flowchart TD
    screen["app/(tabs)/index.tsx<br/>Balances screen"] --> useBalances["useBalances()"]
    useBalances --> useLedgerInput["useLedgerInput()"]

    useLedgerInput --> q1["useMembers()"]
    useLedgerInput --> q2["useGuests()"]
    useLedgerInput --> q3["useMemberBookings()"]
    useLedgerInput --> q4["useGuestBookings()"]
    useLedgerInput --> q5["useTransfers()"]

    q1 & q2 & q3 & q4 & q5 --> cache[("TanStack Query cache<br/>staleTime 1min · gcTime 1wk<br/>networkMode: always")]

    cache -->|"miss / stale"| client["useLedgerClient()"]
    client --> localC["local: AsyncStorage<br/>read → Zod parse"]
    client --> restC["rest: fetch → Zod parse"]

    cache -->|"all 5 present"| compute["computeBalances(input)<br/>useMemo, pure"]
    compute --> out["BalanceT[]<br/>positive owedCents = owes"]
    out --> screen

    cache <--> persist[("AsyncStorage<br/>persisted cache")]
```

`networkMode: "always"` matters: in local mode there is no network, so the default
"pause when offline" behaviour would stall every query and mutation. The long `gcTime`
exists so the persisted cache is still useful after a cold start.

Because balances are derived from the cache rather than the server, an optimistic write
updates every balance on screen instantly — `useCollectionMutations` applies the row to the
cache in `onMutate`, rolls back in `onError`, and invalidates in `onSettled`. There is no
"recompute balances" request to wait for.

---

## 5. Server request pipeline

Every collection endpoint is generated from one function, so all five behave identically.

```mermaid
flowchart TD
    req["Request"] --> cors["cors() — all origins"]
    cors --> health{"path?"}

    health -->|"/health"| ok["200 ok:true"]
    health -->|"/api/auth/login"| login["authRouter — public<br/>pin compared with omit:{pin:false}"]
    health -->|"/api/*"| guard["requireAuth middleware"]

    guard --> tok{"Bearer token<br/>in AuthSession?"}
    tok -->|"no"| unauth["401 Unauthorized"]
    tok -->|"yes"| ctx["c.set('memberId', …)"]

    ctx --> router["collectionRouter(schema, store)"]
    router --> zv["zValidator('json', schema)<br/>same Zod schema as the client"]
    zv --> store["CollectionStore → Prisma → Postgres"]
    store --> reparse["Zod parse on the way out<br/>(strips pin, null → undefined)"]
    reparse --> resp["JSON response"]

    store -.->|"delete a person"| refs["countPersonReferences()<br/>from packages/domain"]
    refs -.->|"> 0"| conflict["409 ConflictError"]

    classDef errCls fill:#fce8e6,stroke:#ea4335
    class unauth,conflict errCls
```

Two things worth knowing about this pipeline:

**PINs cannot leak by accident.** The Prisma client is constructed as
`new PrismaClient({ omit: { member: { pin: true } } })`, so `pin` is absent from every query
result process-wide. Exactly two call sites opt back in with `omit: { pin: false }` — the
login comparison and the operator CLI (`pnpm pins`). The type is encoded too:
`Db = PrismaClient<{ omit: { member: { pin: true } } }>`.

**Authorisation is coarse.** `requireAuth` establishes *that* a valid session exists and
stashes `memberId`, but no collection route reads it. Any signed-in member can read and
write every row — the model is a single shared club ledger, not per-user data. Worth
knowing before this is exposed to a wider group; the login is documented as intentionally
simple for now (plain PIN comparison, no rate limiting).

---

## Commands

```sh
pnpm install
pnpm dev                       # turbo: web on :7070 + API on :7071
pnpm --filter mobile web       # web only
pnpm --filter server dev       # API only (regenerates the Prisma client first)

pnpm test                      # engine scenario tests (vitest, packages/domain)
pnpm typecheck                 # strict TS across every package
pnpm lint
```

Server setup, first run:

```sh
cd apps/server
cp .env.example .env           # set DATABASE_URL
pnpm db:migrate                # prisma migrate deploy
pnpm dev                       # bootstraps a "test" user and prints its PIN if the DB is empty
pnpm pins                      # operator-only: print every member's PIN
```
