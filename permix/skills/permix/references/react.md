# React (`permix/react`)

Docs: https://permix.letstri.dev/docs/integrations/react Example: https://github.com/letstri/permix/tree/main/examples/react

## Factory (recommended)

Call `createPermix` from `permix/react` once at module scope. It returns a Permix instance plus bound `PermixProvider`, `usePermix`, `Check`, and `PermixHydrate` with an isolated context. Nested factories do not share state.

```ts
import { createPermix } from 'permix/react'

export const { permix, PermixProvider, PermixHydrate, usePermix, Check } =
  createPermix<{ post: ['create', 'read', { name: 'update'; type: Post }] }>()
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

function EditButton({ post }: { post: Post }) {
  const { check, isReady } = usePermix()
  if (!isReady || !check('post.update', post)) return null
  return <button>Edit</button>
}
```

```tsx
<Check path="post.create" otherwise={<span>Denied</span>}>
  <CreateForm />
</Check>
```

Supports React 18 and React 19. Native `useEffectEvent` is used on 19.2+; React 18 uses a compatible fallback.

Call `permix.setup(roleRulesFor(user))` after session loads.

## Compatible alternative

`PermixProvider` with a `permix` prop, `usePermix(permix)`, and `createComponents(permix)` still work. Pass the **same** instance to the provider and the hook — in development a mismatch throws.

## SSR

Wrap with `PermixHydrate` and call client `setup()` after hydrate — [hydration.md](hydration.md). Next.js / TanStack Start / React Router own their own wiring.

## Pitfalls

- Show a skeleton while `!isReady`; hook `check` returns `false` when not ready.
- UI checks are not enforcement — [security.md](security.md).
- Full-stack apps: server import is `permix/next` (or Start / React Router), client import is `permix/react`.
