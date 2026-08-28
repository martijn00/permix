# Permix — frontend (React / Vue / Solid / Svelte)

Pick the package subpath for your framework. Pattern is the same: `createPermix` from `permix/<framework>` returns a factory plus bound Provider, `usePermix()`, `Check`, and `PermixHydrate`. Call `setup` / `install` when the user is known.

Docs: https://permix.letstri.dev/docs/integrations/react

## React

Call `createPermix` from `permix/react` once at module scope — same name as `permix/next` and `permix/express`. Nested factories do not share state.

```ts
import { createPermix } from 'permix/react'

export const { permix, PermixProvider, PermixHydrate, usePermix, Check } =
  createPermix<{ post: ['create', 'read'] }>()
```

```tsx
import { PermixProvider, usePermix, Check } from './lib/permix'

export function App() {
  return (
    <PermixProvider>
      <Routes />
    </PermixProvider>
  )
}

function EditButton({ post }) {
  const { check, isReady } = usePermix()

  if (!isReady) return null

  if (!check('post.update', post)) return null

  return <button>Edit</button>
}
```

```tsx
<Check path="post.create" otherwise={<span>Denied</span>}>
  <CreateForm />
</Check>
```

Supports React 18 and React 19. Native `useEffectEvent` is used on React 19.2+; React 18 uses a compatible fallback.

### Setup after auth

```ts
await loadUser()
permix.install({ rules: roleRulesFor(user) })
```

### SSR

Use `PermixHydrate` for first-paint booleans, then `install({ rules })` on the client for function rules — see **SSR and hydration** below.

## Vue

Docs: https://permix.letstri.dev/docs/integrations/vue

```ts
import { createPermix } from 'permix/vue'

export const { permix, PermixProvider, usePermix, Check } = createPermix<{
  post: ['create', 'read']
}>()
```

```ts
import { PermixProvider } from './lib/permix'

createApp({
  components: { PermixProvider, App },
  template: '<PermixProvider><App /></PermixProvider>',
}).mount('#app')
```

`usePermix()` takes no instance argument. `isReady` is a computed ref.

## Solid

Docs: https://permix.letstri.dev/docs/integrations/solid

Same factory from `permix/solid`. `isReady` is a function (`isReady()`).

## Svelte

Docs: https://permix.letstri.dev/docs/integrations/svelte

Requires Svelte 5. Same factory from `permix/svelte`.

```svelte
<script lang="ts">
  import { PermixProvider, usePermix } from '$lib/permix'

  let { children } = $props()
  const permissions = usePermix()
</script>

<PermixProvider>
  {@render children()}
</PermixProvider>
```

`isReady` is a reactive getter — access it as `permissions.isReady` (don't destructure).

## UX guidelines

- Show loading or skeleton while `!isReady` — `check` returns `false` when rules are not ready in hooks.
- Hide destructive actions when denied. If you disable instead, set the tooltip from `explain().reasons` — do not invent a denial string.
- Keep permission strings in sync with server middleware paths.

## SSR and hydration

Docs: https://permix.letstri.dev/docs/guide/hydration

Send a JSON snapshot of booleans to the browser so the first paint can respect permissions without re-fetching policy on the client.

### Server

```ts
permix.setup(serverRules)

const state = permix.dehydrate()
// { post: { create: true, read: false } } — functions evaluated once without data
```

Pass `state` to the client (embed in HTML, RSC payload, loader data, etc.).

### Client

```ts
permix.hydrate(state)
// isReady() is still FALSE — hydrate only restores booleans
```

Function-based rules are **lost** in JSON (dehydration calls functions with no data; missing required data → `false`).

**Always call `install({ rules })` (or `setup`) again on the client** with full rules (including closures):

```ts
permix.hydrate(serverState) // booleans; does not fire setup
permix.install({ rules: clientRulesForUser }) // restores functions + sets ready
```

Skipping client `install`/`setup` after hydrate leaves dynamic/ReBAC checks wrong. `hydrate()` does **not** fire the `setup` hook.

### React

```tsx
import type { DehydratedState } from 'permix'
import { permix, PermixHydrate, PermixProvider } from './lib/permix'

function App({
  dehydratedState,
}: {
  dehydratedState: DehydratedState<{ post: ['create', 'read'] }>
}) {
  return (
    <PermixProvider>
      <PermixHydrate state={dehydratedState}>
        <YourApp />
      </PermixHydrate>
    </PermixProvider>
  )
}
```

Run client `permix.install({ rules })` where you restore the session. `PermixHydrate` supplies dehydrated booleans on the first render. `isReady` stays `false` until client `setup()` / `install({ rules })`.

### Next.js / TanStack Start / Nuxt / React Router

Use framework helpers from `permix/next`, `permix/tanstack-start`, `permix/nuxt`, or `permix/react-router` when available — they wire dehydrate/hydrate into the framework data flow. Nuxt hydrates the client with `PermixProvider` / `PermixHydrate` from `permix/vue`. React Router 7 covers Remix; there is no `permix/remix` export.

**Next.js App Router (`permix/next`)** — `createPermix(resolveRules)` caches one initialized instance per request. Async Server Components `await getPermix()` / `await check()`. Non-async Server Components call `usePermix()` (React `use()`); `check()` is sync at the call site. Keep layouts/pages synchronous; put async permission/data work in feature components behind page-owned Suspense. Cookie/session checks stay out of the shared App Shell. `"use cache"` / `next/root-params` belong in the **app** resolver, not inside Permix. `"use cache: private"` payloads should check permission before loading data and return `null` when denied; `notFound()`/`redirect()` stay uncached. Client `check` is a UI hint. Route Handlers and Server Actions must `createPermix()` + `setup()` a core instance per invocation — they do not share RSC `cache()`.

In TanStack Start, `permix.get(context)` only works in server functions and server routes. To check inside `beforeLoad`/`loader`, put a core instance on the **router context** in `getRouter()` (`context: { permix }`), type it with `createRootRouteWithContext`, hydrate it in the root route's `beforeLoad`, then call `context.permix.check(...)` in any child route. Passing only the context type without the runtime value leaves `context.permix` undefined.

TanStack Start bundle caveat: if the `setupMiddleware()` callback imports server-only code (auth library, DB client, `node:` builtins), those imports leak into the client bundle — Start only strips `.server()` bodies it sees in app source, not the one hidden inside the library. Use `createMiddleware().server(permix.createSetupHandler(callback))` in `src/start.ts` instead; same behavior, but the boundary is visible to the compiler and the callback gets pruned.

Docs:

- https://permix.letstri.dev/docs/integrations/next
- https://permix.letstri.dev/docs/integrations/tanstack-start
- https://permix.letstri.dev/docs/integrations/nuxt
- https://permix.letstri.dev/docs/integrations/react-router

### Flow diagram

```text
Server: setup(rules) → dehydrate() → send state
Client: hydrate(state) → install({ rules: fullRules }) → isReady() → check() / usePermix
```

### Pitfalls

| Issue | Cause |
| --- | --- |
| UI stuck not ready | `hydrate` without follow-up `install({ rules })` / `setup` |
| Wrong dynamic checks | Relying on dehydrated booleans only |
| Mismatch server/client | Different schemas or missing actions in client `setup` |

For static-only permissions (all booleans), dehydrate + hydrate + `install({ rules })` with the same booleans is enough; still call `install`/`setup` to mark ready.

## Examples in the Permix repo

- React: https://github.com/letstri/permix/tree/main/examples/react
- Vue: https://github.com/letstri/permix/tree/main/examples/vue
- Solid: https://github.com/letstri/permix/tree/main/examples/solid
- Svelte: https://github.com/letstri/permix/tree/main/examples/svelte
- Next.js (SSR): https://github.com/letstri/permix/tree/main/examples/next
- Nuxt (SSR): https://github.com/letstri/permix/tree/main/examples/nuxt
- React Router 7 (SSR): https://github.com/letstri/permix/tree/main/examples/react-router
- Role templates: https://github.com/letstri/permix/tree/main/examples/role-based
- ReBAC: https://github.com/letstri/permix/tree/main/examples/rebac
