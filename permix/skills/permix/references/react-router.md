# React Router 7 (`permix/react-router`)

Docs: https://permix.letstri.dev/docs/integrations/react-router Example: https://github.com/letstri/permix/tree/main/examples/react-router

Remix apps that moved to React Router 7 use this adapter. **There is no `permix/remix` export.**

Stores a per-request instance on middleware context (`context.set` / `context.get`). Enable React Router middleware (`v8_middleware` or the current flag). Each `createPermix()` call uses its own context key so two factories do not collide.

```ts
import type { ValidateDefinition } from 'permix'
import { createPermix } from 'permix/react-router'

export type PermissionsDefinition = ValidateDefinition<{
  post: ['read', { name: 'update'; type: Post }]
}>

export const permix = createPermix<PermissionsDefinition>()
```

Use `setupMiddleware` / `checkMiddleware` in the middleware pipeline. Check in loaders/actions via `permix.get(context)`. Client hydrate uses [react.md](react.md) — [hydration.md](hydration.md).
