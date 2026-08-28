# Examples (invariant → repo)

Runnable apps live in https://github.com/letstri/permix/tree/main/examples. Use them to see a rule in real code rather than restating it here.

When an example and an invariant disagree, the invariants in `SKILL.md` win.

## Invariant → where to see it

| Invariant | Example |
| --- | --- |
| Schema + `setup` + `check` | `examples/react`, `examples/vue`, `examples/solid`, `examples/svelte` |
| Role templates | `examples/role-based` |
| ReBAC closures (actor at setup, resource at check) | `examples/rebac` |
| Feature flags as permissions | `examples/feature-flags` |
| Enum-backed actions | `examples/enum-based` |
| Next.js resolver + Cache Components + client `permix/react` | `examples/next` |
| TanStack Start middleware + router-context hydrate | `examples/tanstack-start` |
| Nuxt / Nitro + Vue hydrate | `examples/nuxt` |
| React Router 7 middleware | `examples/react-router` |
| Astro `locals` + island hydrate | `examples/astro` |
| Nest guard + `@Check` | `examples/nest` |
| Express + tRPC + React | `examples/express-trpc-react` |
| Express HTTP only | `examples/express` |
| Generated catalog from `permission()` markers | `examples/extracted-catalog` |
| Provider adapters (Better Auth, Clerk, Supabase, Convex, PDP) | `examples/provider-adapters` |

## Pick by stack

| Stack | Start here |
| --- | --- |
| SPA React/Vue/Solid/Svelte | matching `examples/<framework>` |
| Next.js App Router 15+ | `examples/next` |
| TanStack Start | `examples/tanstack-start` |
| Remix / React Router 7 | `examples/react-router` (no `permix/remix`) |
| HTTP API | `examples/express` then the matching [server.md](server.md) delta |
