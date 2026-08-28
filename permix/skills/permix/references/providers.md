# Provider integrations and HTTP PDP

Keep the Permix `Definition` as the canonical vocabulary. Provider inference helpers may derive compatible definitions, but identity and rules must resolve per request or invocation.

## Shared adapter and HTTP PDP

- Use `createAdapter` from `permix/adapter` to authenticate input, resolve rules, and create one isolated Permix instance for a single or batch check.
- Use `createPdpHandler` and `createPdpClient` from `permix/pdp` for a fetch-standard authorization service.
- Caller mode derives identity from the caller credential. Service mode may name a subject only after `authenticateService` succeeds.
- A `PermissionCatalog` adds discovery and coverage metadata; it is never required to authorize.

## Supabase

- Use `createSupabaseClaimsAdapter` for verified JWT claims or `createSupabaseUserAdapter` when the complete Auth user is required.
- Browser-accessible tables still require native Postgres RLS. App-layer Permix checks do not replace RLS.
- Treat JWT authorization claims as potentially stale until token refresh.
- Use `createSupabasePolicyManifest` to type-check the mapping from canonical paths to tables and operations; apply SQL policies explicitly.

## Better Auth and Clerk

- Better Auth exposes a native server/client plugin pair through `createBetterAuthPermixPlugin` and `createBetterAuthPermixClient`.
- Clerk uses `createClerkPermix` with either an authenticated Auth object or an injected request authenticator. Use `permix/clerk/next` only for the thin Next.js `auth()` convenience.
- Both integrations expose dehydrated permissions for UX checks. Authenticate every endpoint and continue enforcing permissions on the server.
- Clerk organization checks require an active organization. Prefer an explicit bearer token when the intended organization context matters.

## Convex

- Wrap queries, mutations, actions, and HTTP actions with `createConvexPermix`.
- Each invocation resolves `ctx.auth.getUserIdentity()` before handler work and injects an isolated `permix` instance into the handler context.
- `ConvexDefinition` and `defineConvexTableSelection` provide optional definition inference from the generated data model.
