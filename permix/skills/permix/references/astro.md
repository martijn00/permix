# Astro (`permix/astro`)

Docs: https://permix.letstri.dev/docs/integrations/astro Example: https://github.com/letstri/permix/tree/main/examples/astro

Stores a per-request instance on `context.locals`. Compatible with `defineMiddleware` and `sequence`.

```ts
import { createPermix } from 'permix/astro'

export const permix = createPermix<{
  post: ['read', 'create']
}>()
```

```ts
import { defineMiddleware } from 'astro:middleware'
import { permix } from './lib/permix'

export const onRequest = defineMiddleware(
  permix.setupMiddleware(({ request }) => {
    /* rules from cookies/headers */
  })
)
```

Guard endpoints with `checkMiddleware`. In `.astro` pages, `permix.get(Astro)` or `permix.get(Astro.locals)`.

Islands hydrate with [react.md](react.md) / [vue.md](vue.md) / [solid.md](solid.md) / [svelte.md](svelte.md) — [hydration.md](hydration.md). Kernel pattern: [server.md](server.md).
