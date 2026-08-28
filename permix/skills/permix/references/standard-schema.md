# Standard Schema (`permix/standard-schema`)

Docs: https://permix.letstri.dev/docs/integrations/standard-schema

Reuse Zod / Valibot / ArkType / Effect Schema types for entity data. Two entry points:

| Import | Use when |
| --- | --- |
| `action` from `permix` | Existing `createPermix<D>()` tree; type a few actions |
| `createPermix` from `permix/standard-schema` | One entity per schema, CRUD by default |

Type inference is always on. Runtime parsing is **off** unless `{ validate: 'deny' | 'throw' }` on the **factory**. Core `createPermix<D>()` never parses.

If both `type` and `schema` are set, **`type` wins**. `'deny'` is preferred in UI `check()` paths; `'throw'` on the server when invalid payloads are programmer errors. Async schemas throw — `check()` is synchronous.

```ts
import { action, createPermix } from 'permix'
import { z } from 'zod'

const postSchema = z.object({ id: z.string(), authorId: z.string() })
const definition = {
  post: ['create', action('edit', postSchema, { required: true })],
} as const
export const permix = createPermix<typeof definition>()
```

Extraction never copies validators into JSON — [extraction.md](extraction.md).
