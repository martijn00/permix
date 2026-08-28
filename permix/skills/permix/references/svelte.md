# Svelte (`permix/svelte`)

Docs: https://permix.letstri.dev/docs/integrations/svelte Example: https://github.com/letstri/permix/tree/main/examples/svelte

Requires **Svelte 5**. Pass the **same** instance to `PermixProvider` and `usePermix`.

```svelte
<script lang="ts">
  import { PermixProvider } from 'permix/svelte'
  import { permix } from './lib/permix'

  let { children } = $props()
</script>

<PermixProvider {permix}>
  {@render children()}
</PermixProvider>
```

`usePermix(permix)` returns `{ check, isReady }` where `isReady` is a **reactive getter** — access `permissions.isReady`; do not destructure.

`createComponents(permix)` returns a typed `Check` that uses `children` / `otherwise` snippets:

```svelte
<Check path="post.create">
  <CreateForm />
  {#snippet otherwise()}
    Denied
  {/snippet}
</Check>
```

Call `setup` after auth. Hydrate with `PermixHydrate` — [hydration.md](hydration.md).
