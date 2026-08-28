---
name: permix
description: >-
  Applies Permix authorization once a schema exists: permix.check() paths and ReBAC callbacks, frontend bindings, server middleware, HTTP PDP, and provider integrations for Supabase, Better Auth, Clerk, and Convex. Use for checking permissions, gating UI, protecting routes, or resolving rules from provider identity. For creating the schema and first `permix.setup()`, use permix-getting-started first.
metadata:
  type: core
  library: permix
  library_version: '4.1.2' # x-release-please-version
requires:
  - permix-getting-started
sources:
  - 'letstri/permix:docs/content/docs/guide/check.mdx'
  - 'letstri/permix:docs/content/docs/guide/rebac.mdx'
  - 'letstri/permix:docs/content/docs/guide/ready.mdx'
  - 'letstri/permix:docs/content/docs/guide/extraction.mdx'
  - 'letstri/permix:docs/content/docs/guide/hydration.mdx'
  - 'letstri/permix:docs/content/docs/integrations/react.mdx'
  - 'letstri/permix:docs/content/docs/integrations/vue.mdx'
  - 'letstri/permix:docs/content/docs/integrations/solid.mdx'
  - 'letstri/permix:docs/content/docs/integrations/svelte.mdx'
  - 'letstri/permix:docs/content/docs/integrations/next.mdx'
  - 'letstri/permix:docs/content/docs/integrations/tanstack-start.mdx'
  - 'letstri/permix:docs/content/docs/integrations/nuxt.mdx'
  - 'letstri/permix:docs/content/docs/integrations/react-router.mdx'
  - 'letstri/permix:docs/content/docs/integrations/express.mdx'
  - 'letstri/permix:docs/content/docs/integrations/hono.mdx'
  - 'letstri/permix:docs/content/docs/integrations/fastify.mdx'
  - 'letstri/permix:docs/content/docs/integrations/nest.mdx'
  - 'letstri/permix:docs/content/docs/integrations/trpc.mdx'
  - 'letstri/permix:docs/content/docs/integrations/orpc.mdx'
  - 'letstri/permix:docs/content/docs/integrations/node.mdx'
  - 'letstri/permix:docs/content/docs/integrations/server.mdx'
  - 'letstri/permix:docs/content/docs/integrations/astro.mdx'
  - 'letstri/permix:docs/content/docs/integrations/elysia.mdx'
  - 'letstri/permix:docs/content/docs/integrations/pdp.mdx'
  - 'letstri/permix:docs/content/docs/integrations/supabase.mdx'
  - 'letstri/permix:docs/content/docs/integrations/better-auth.mdx'
  - 'letstri/permix:docs/content/docs/integrations/clerk.mdx'
  - 'letstri/permix:docs/content/docs/integrations/convex.mdx'
  - 'letstri/permix:permix/src/core/check.ts'
---

# Permix — check, frontend, server

Assumes a `permix` instance already exists (see **permix-getting-started**). Load the reference file that matches the task instead of reading everything:

| Task | Reference |
| --- | --- |
| `permix.check()` paths, callbacks, `~all`/`~any`, ReBAC/ABAC with entity data, `isReady` | [references/check.md](references/check.md) |
| Generate typed permission constants, metadata, and a `Definition` from source markers | [references/extraction.md](references/extraction.md) |
| React, Vue, Solid, or Svelte UI — `createPermix` from `permix/react` (or `PermixProvider` / `usePermix` / `createComponents`), SSR `dehydrate`/`hydrate` for Next.js / TanStack Start / Nuxt / React Router | [references/frontend.md](references/frontend.md) |
| Protecting Express, Hono, Fastify, NestJS, tRPC, oRPC, Node, Elysia, or Astro routes — `setupMiddleware`, `checkMiddleware`, or Nest `guard` / `@Check` | [references/server.md](references/server.md) |
| HTTP PDP/client or provider identity with Supabase, Better Auth, Clerk, or Convex | [references/providers.md](references/providers.md) |

## Rules that apply everywhere

- **Authorization must run on the server.** Client-side `check` (React/Vue/Solid/Svelte) is UX only — mirror every path with `checkMiddleware` in [references/server.md](references/server.md).
- **Use the same schema and path strings** (`post.update`, not ad-hoc strings) across client hooks and server middleware, or types and behavior drift apart.
- **`check` before `isReady`** throws `PermixNotReadyError` — gate UI with `isReady`/`isReadyAsync`, and call `setupMiddleware` before `checkMiddleware` on the server.
- **SSR `hydrate` alone is not enough.** It only restores booleans; call `setup` again on the client for function-based/ReBAC rules — see the SSR section of [references/frontend.md](references/frontend.md).
