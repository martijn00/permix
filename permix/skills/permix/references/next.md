# Next.js (`permix/next`)

Docs: https://permix.letstri.dev/docs/integrations/next Example: https://github.com/letstri/permix/tree/main/examples/next

Requires **Next.js 15+**. Client UI still uses [react.md](react.md).

`createPermix(resolveRules)` from `permix/next` caches **one Promise** of a fully initialized instance per RSC request (`React.cache()`).

- Async Server Components: `await permix.getPermix()` / `await permix.check(...)`
- Non-async Server Components: `permix.usePermix()` (React `use()`); `check()` stays sync at the call site

Keep layouts/pages **synchronous**. Put async permission/data work in feature components behind **page-owned** Suspense. Cookie/session outcomes stay out of the shared App Shell.

```ts
import { createPermix } from 'permix/next'
import { getSession } from '@/lib/auth'

export const permix = createPermix<{
  post: [{ name: 'update'; type: { authorId: string } }]
}>(async () => {
  const session = await getSession()
  return {
    post: {
      update: (post) => post?.authorId === session?.userId,
    },
  }
})
```

## Must not

- Route Handlers and Server Actions **do not** share the RSC `cache()` identity. `createPermix()` + `setup()` a **core** instance per invocation — [security.md](security.md).
- Do not block the static shell on dehydrated state; hydrate permission islands only.
- `"use cache"` / `next/root-params` belong in the **app** resolver, not inside Permix. `"use cache: private"` payloads should check permission before loading data and return `null` when denied; `notFound()` / `redirect()` stay uncached.

Extraction: `withPermix` from `permix/next/config` — [extraction.md](extraction.md).
