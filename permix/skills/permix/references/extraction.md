# Permission extraction

Docs: https://permix.letstri.dev/docs/guide/extraction Example: https://github.com/letstri/permix/tree/main/examples/extracted-catalog

Use when the app wants a typed vocabulary generated from actual `permission()` markers — not for granting access or replacing `setup()`.

```ts
import { permission } from 'permix'

export const comment = permission({
  key: 'tasks.comment',
  title: 'Comment on tasks',
  annotations: { surfaces: ['web', 'api'] },
})
```

Keys and metadata must be **static**. Dynamic keys fail the scan.

```bash
pnpm permix extract
pnpm permix extract --watch
pnpm permix extract --check
```

Default outputs: `.permix/permissions.ts` and `.permix/permissions.json`. Repeat `--include` / `--exclude` for monorepos.

```ts
import { createPermix } from 'permix'
import { type Definition, permissions } from './.permix/permissions'

const permix = createPermix<Definition>()
permix.check(permissions.tasks.comment)
```

Payload types: generated `definePermissionOverlay()` + `action()`. Never put validators in JSON; extraction does not enable runtime validation — [standard-schema.md](standard-schema.md).

Next.js: `withPermix(nextConfig, options)` from `permix/next/config`, or `createPermixPlugin(options)`.

Removing a marker only prunes generated TS/JSON. Review roles, RLS, and provider policies separately.
