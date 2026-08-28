# Permission extraction

Use extraction when an application wants one typed permission vocabulary generated from actual source usage.

## Mark and generate

```ts
import { permission } from 'permix'

export const comment = permission({
  key: 'tasks.comment',
  title: 'Comment on tasks',
  annotations: {
    surfaces: ['web', 'api'],
  },
})
```

Keys and metadata must be static. Run:

```bash
pnpm permix extract
pnpm permix extract --watch
pnpm permix extract --check
```

The default outputs are `.permix/permissions.ts` and `.permix/permissions.json`. Use repeatable `--include` and `--exclude` flags for monorepos.

## Consume the generated definition

```ts
import { createPermix } from 'permix'
import { type Definition, permissions } from './.permix/permissions'

const permix = createPermix<Definition>()
permix.check(permissions.tasks.comment)
```

For payload data, call the generated `definePermissionOverlay()` with existing `action()` values, then use `Definition<typeof overlay>`. Never put validators in JSON or assume extraction enables runtime validation.

Use the generated `definePermissionConfig()` to type central metadata. Inline metadata is the default; central metadata wins. Generate once before importing the generated helper into a new central config.

Next.js projects can wrap config with `withPermix(nextConfig, options)` from `permix/next/config`. Use `createPermixPlugin(options)` when a preconfigured wrapper is easier to compose.

Removing a marker only prunes generated TS/JSON. Always review persisted roles, provider policies, SQL/RLS, and other downstream systems separately.
