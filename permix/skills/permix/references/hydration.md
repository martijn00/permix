# SSR dehydrate / hydrate

Docs: https://permix.letstri.dev/docs/guide/hydration

Send a JSON snapshot of booleans to the browser so the first paint can respect permissions without re-fetching policy.

## Server

```ts
permix.setup(serverRules)

const state = permix.dehydrate()
// { post: { create: true, read: false } } — functions evaluated once without data
```

Pass `state` to the client (RSC payload, loader data, embed in HTML).

## Client

```ts
permix.hydrate(state)
// isReady() is still FALSE — hydrate only restores booleans
```

Function-based rules are **lost** in JSON (dehydration calls functions with no data; missing required data → `false`).

**Always call `setup` again on the client** with full rules (including closures):

```ts
permix.hydrate(serverState)
permix.setup(clientRulesForUser) // restores functions + sets ready
```

```text
Server: setup(rules) → dehydrate() → send state
Client: hydrate(state) → setup(fullRules) → isReady() → check()
```

## Framework wiring

Use the adapter that matches the app; do not invent a custom snapshot format:

- React islands — [react.md](react.md) (`PermixHydrate`)
- Next.js — [next.md](next.md)
- TanStack Start — [tanstack-start.md](tanstack-start.md)
- Nuxt — [nuxt.md](nuxt.md) (Vue `PermixHydrate`)
- React Router 7 — [react-router.md](react-router.md)
- Astro islands — [astro.md](astro.md)

## Pitfalls

| Issue | Cause |
| --- | --- |
| UI stuck not ready | `hydrate` without follow-up `setup` |
| Wrong dynamic checks | Relying on dehydrated booleans only |
| Mismatch server/client | Different schemas or missing actions in client `setup` |

For static-only permissions (all booleans), dehydrate + hydrate + `setup` with the same booleans is enough; still call `setup` to mark ready.
