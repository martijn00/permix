# Nuxt (`permix/nuxt`)

Docs: https://permix.letstri.dev/docs/integrations/nuxt Example: https://github.com/letstri/permix/tree/main/examples/nuxt

`permix/nuxt` is **server-only**. It stores one instance per Nitro request on `event.context`. Calling `setup()` again in the same request replaces rules.

```ts
import { createPermix } from 'permix/nuxt'

export const permix = createPermix<{
  post: ['read', { name: 'update'; type: Post }]
}>()
```

Client: a **core** singleton + `PermixProvider` / `PermixHydrate` from [vue.md](vue.md). Dehydrate in a server plugin so the client bundle never imports `h3`.

Do not import `permix/nuxt` in Vue client components. Shared hydrate rules: [hydration.md](hydration.md).
