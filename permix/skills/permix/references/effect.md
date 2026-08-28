# Effect (`permix/effect`)

Docs: https://permix.letstri.dev/docs/integrations/effect

Exposes the **full** Permix instance as an Effect `Context` tag + `Layer` (including `setup`, `hydrate`, hooks). Checks return `Effect<boolean>`. Depends only on `effect` (no `@effect/platform`).

```ts
import { createPermix } from 'permix/effect'

const permix = createPermix<{
  post: ['create', 'read']
}>()

const PermixLive = permix.layer({
  post: { create: true, read: true },
})
```

Dynamic rules: `permix.layerSetup(Effect.gen(...))` so requirements (e.g. `CurrentUser`) flow through.

Do not treat this as Express-style middleware. Compose with Effect HTTP/RPC yourself, or use a server adapter next to it.
