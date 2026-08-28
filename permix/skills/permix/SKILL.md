---
name: permix
description: >-
  Applies Permix authorization once a schema exists. Follow the workflow: enforce on the server, gate UI, hydrate for SSR, then verify. Covers permix.check() paths and ReBAC, UI adapters (react, vue, solid, svelte), full-stack adapters (next, tanstack-start, react-router, nuxt, astro), HTTP/RPC middleware, Nest, Drizzle, Effect, Standard Schema, catalog extraction, HTTP PDP, and provider identity (Supabase, Better Auth, Clerk, Convex). Use for anything past initial setup. For schema and first permix.setup(), use permix-getting-started first.
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
  - 'letstri/permix:docs/content/docs/guide/concepts.mdx'
  - 'letstri/permix:docs/content/docs/guide/security.mdx'
  - 'letstri/permix:docs/content/docs/guide/choose-adapter.mdx'
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
  - 'letstri/permix:docs/content/docs/integrations/drizzle.mdx'
  - 'letstri/permix:docs/content/docs/integrations/effect.mdx'
  - 'letstri/permix:docs/content/docs/integrations/standard-schema.mdx'
  - 'letstri/permix:docs/content/docs/integrations/pdp.mdx'
  - 'letstri/permix:docs/content/docs/integrations/supabase.mdx'
  - 'letstri/permix:docs/content/docs/integrations/better-auth.mdx'
  - 'letstri/permix:docs/content/docs/integrations/clerk.mdx'
  - 'letstri/permix:docs/content/docs/integrations/convex.mdx'
  - 'letstri/permix:permix/src/core/check.ts'
---

# Permix

Assumes a `permix` instance already exists (see **permix-getting-started**). **Follow the workflow below step by step.** Load the reference a step names. Get API signatures from the linked docs — do not invent adapter APIs.

## Architecture target

- One `Definition` is the vocabulary for the whole app. Client hooks, server middleware, and provider adapters use the same path strings (`post.update`).
- Rules are assigned per user/request with `setup` / `setupMiddleware` / a provider `resolveRules`. Checks never invent permissions that are not in the schema.
- The server is the enforcement boundary. UI `check` only hides or disables controls.
- SSR sends a boolean snapshot (`dehydrate`) for first paint, then the client calls `setup()` again so function/ReBAC rules return.

## Invariants (what every change must satisfy)

1. **Same schema, same paths.** Client and server share one `Definition` (or `ValidateDefinition`). Do not hand-write parallel string unions.
2. **Server enforces; client is UX.** Every path the UI checks is also checked in middleware, a server function, a Route Handler, or a provider adapter.
3. **`hydrate` restores booleans only.** Call `setup()` on the client after hydrate for function-based rules. `isReady` stays false until `setup()`.
4. **Do not `check` before ready.** Gate UI with `isReady` / `isReadyAsync`. On the server, `setupMiddleware` (or the Nest guard / RPC `setupContext`) runs before `checkMiddleware`.
5. **v4 action tuples**, not v3 `{ action, dataType }`. Entity data uses `{ name, type }` / `schema` / `action()`.
6. **Import the framework subpath.** `permix/react`, `permix/next`, `permix/express`, … — never guess a `permix/remix` export or a core-only middleware API.
7. **Provider identity is not authorization.** JWT/session claims and Clerk `has()` feed `resolveRules`. They do not replace Permix rules or Postgres RLS.

## Workflow

Run these in order for a new app, a new feature, or an audit.

1. **Choose mode.**
   - **New app:** detect the stack, then → `references/example.md` for a matching example. ✓ You know the UI, server, and (if any) provider adapters.
   - **Audit:** list every `check()` / `<Check>` in the client and every unprotected mutation/route. ✓ You know which paths have no server twin.
2. **Confirm the schema.** If it does not exist, stop and use **permix-getting-started**. For generated vocabulary → `references/extraction.md`. For Zod/Valibot entity types → `references/standard-schema.md`. ✓ Paths used in UI exist on the server definition.
3. **Write rules** from auth/session/role. Prefer `template` for roles. Capture the **actor** in closures at setup time; pass the **resource** at check time. → `references/check.md`.
4. **Enforce on the server.** Load exactly one of:
   - HTTP kernel + delta: `references/server.md` then `express.md` / `hono.md` / `fastify.md` / `node.md` / `elysia.md`
   - RPC: `references/trpc.md` or `references/orpc.md`
   - Nest: `references/nest.md`
   - Full-stack: `references/next.md` / `tanstack-start.md` / `react-router.md` / `nuxt.md` / `astro.md`
   - Provider: `references/supabase.md` / `better-auth.md` / `clerk.md` / `convex.md`
   - Remote PDP: `references/pdp.md` ✓ Mutations cannot succeed without a server check of the same path.
5. **Gate UI** with the matching frontend reference: `references/react.md` / `vue.md` / `solid.md` / `svelte.md`. ✓ Destructive actions hide while `!isReady` or when `check` is false.
6. **Hydrate if SSR.** → `references/hydration.md`. ✓ First paint uses dehydrated booleans; client `setup()` restores closures.
7. **Verify** against the checklist below.

## Verify before done

- [ ] One shared `Definition`; no ad-hoc permission strings.
- [ ] Every UI path has a server/middleware/provider check.
- [ ] `setup` / `setupMiddleware` / `setupContext` / guard runs before `check`.
- [ ] SSR: `hydrate` then `setup()`; `isReady` is false until client `setup()`.
- [ ] Entity actions with `type` / `schema` / `required: true` pass resource data.
- [ ] Imports use `permix/<adapter>`, not a guessed package.
- [ ] Provider adapters authenticate the request; RLS still protects browser-reachable tables.
- [ ] v4 tuples, not v3 object definitions.

## Reference index

**Core** (any app):

- [`references/check.md`](references/check.md) — paths, callbacks, `~all`/`~any`, ReBAC, `isReady`.
- [`references/hydration.md`](references/hydration.md) — `dehydrate` / `hydrate` / `PermixHydrate`.
- [`references/security.md`](references/security.md) — enforcement boundary, hydrate limits, stale JWTs, RLS.
- [`references/example.md`](references/example.md) — invariant → `examples/` map.

**UI**

- [`references/react.md`](references/react.md) · [`vue.md`](references/vue.md) · [`solid.md`](references/solid.md) · [`svelte.md`](references/svelte.md)

**Full-stack**

- [`references/next.md`](references/next.md) · [`tanstack-start.md`](references/tanstack-start.md) · [`react-router.md`](references/react-router.md) · [`nuxt.md`](references/nuxt.md) · [`astro.md`](references/astro.md)

**HTTP / RPC**

- [`references/server.md`](references/server.md) — shared `setupMiddleware` / `checkMiddleware` kernel.
- [`express.md`](references/express.md) · [`hono.md`](references/hono.md) · [`fastify.md`](references/fastify.md) · [`node.md`](references/node.md) · [`elysia.md`](references/elysia.md)
- [`nest.md`](references/nest.md) · [`trpc.md`](references/trpc.md) · [`orpc.md`](references/orpc.md)

**Opt-in**

- [`references/drizzle.md`](references/drizzle.md) · [`effect.md`](references/effect.md) · [`standard-schema.md`](references/standard-schema.md) · [`extraction.md`](references/extraction.md)

**Providers**

- [`references/pdp.md`](references/pdp.md) · [`supabase.md`](references/supabase.md) · [`better-auth.md`](references/better-auth.md) · [`clerk.md`](references/clerk.md) · [`convex.md`](references/convex.md)
