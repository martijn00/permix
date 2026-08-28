# Solid (`permix/solid`)

Docs: https://permix.letstri.dev/docs/integrations/solid Example: https://github.com/letstri/permix/tree/main/examples/solid

```tsx
import { PermixProvider, usePermix, createComponents } from 'permix/solid'
import { permix } from './lib/permix'

export function App() {
  return (
    <PermixProvider permix={permix}>
      <YourApp />
    </PermixProvider>
  )
}

export function usePermissions() {
  return usePermix(permix)
}

export const { Check } = createComponents(permix)
```

Pass the **same** instance to provider and hook. Call `setup` after auth. Gate on `isReady`. Hydrate with `PermixHydrate` — [hydration.md](hydration.md).

First paint after dehydrate must see boolean checks without waiting for an effect (the adapter subscribes during render).
