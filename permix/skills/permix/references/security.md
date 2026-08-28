# Security (enforcement boundary)

Docs: https://permix.letstri.dev/docs/guide/security

## Client checks are UX

`usePermix`, `<Check>`, and hydrated booleans hide buttons. They do not protect APIs. Mirror every path with server middleware, a server function, a Route Handler, or a provider `check()`.

## Hydrate is a snapshot, not policy

`dehydrate()` evaluates functions **without** entity data. Closures are not in the JSON. After hydrate, call `setup()` on the client. See [hydration.md](hydration.md).

## Next.js Route Handlers and Server Actions

`permix/next` `cache()` identity is **RSC only**. Inside a Route Handler or Server Action, `createPermix()` + `setup()` a **core** instance per invocation. Do not call the RSC facade and assume it shares the layout's instance.

## Provider JWTs and sessions

Verified identity feeds `resolveRules`. Treat JWT authorization claims as potentially stale until refresh. Do not trust user-controlled metadata as authorization input. Clerk organization checks need an active organization; prefer an explicit bearer token when org context matters.

## Database access

App-layer Permix does not replace Postgres RLS (or Convex/table rules). Enable RLS on every browser-reachable Supabase table. See [supabase.md](supabase.md).

## Checklist

- [ ] Mutations cannot succeed by calling the API with a forged client
- [ ] Same path strings on UI and server
- [ ] Rules derived from authenticated session/context, not client headers alone
- [ ] Entity checks pass the loaded resource (`required: true` where needed)
