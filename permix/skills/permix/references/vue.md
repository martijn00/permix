# Vue (`permix/vue`)

Docs: https://permix.letstri.dev/docs/integrations/vue Example: https://github.com/letstri/permix/tree/main/examples/vue

Create the core instance with `createPermix` from `permix`. Wrap the tree with `PermixProvider` and pass the **same** instance to `usePermix`.

```vue
<script setup lang="ts">
import { PermixProvider } from 'permix/vue'
import { permix } from './lib/permix'
</script>

<template>
  <PermixProvider :permix="permix">
    <YourApp />
  </PermixProvider>
</template>
```

```ts
import { usePermix } from 'permix/vue'
import { permix } from './lib/permix'

export function usePermissions() {
  return usePermix(permix)
}
```

```ts
import { createComponents } from 'permix/vue'

export const { Check } = createComponents(permix)
```

Call `permix.setup(...)` after auth. Gate on `isReady`. Declarative `<Check path="post.create">` uses `path` (not v3 `entity` + `action`).

Nuxt SSR uses this adapter on the client — [nuxt.md](nuxt.md). Shared hydrate rules: [hydration.md](hydration.md).
