# tRPC (`permix/trpc`)

Docs: https://permix.letstri.dev/docs/integrations/trpc Example: https://github.com/letstri/permix/tree/main/examples/express-trpc-react

Not HTTP `setupMiddleware`. Use `setupContext` in a procedure middleware, then `checkMiddleware` on procedures.

```ts
import { createPermix } from 'permix/trpc'

const permix = createPermix<{
  post: ['create', 'read']
}>().contextKey('permissions') // omit for default key 'permix'

const protectedProcedure = t.procedure.use(({ ctx, next }) =>
  next({
    ctx: permix.setupContext({
      post: { create: true, read: true },
    }),
  })
)

export const createPost = protectedProcedure
  .use(permix.checkMiddleware('post.create'))
  .mutation(handler)
```

`onForbidden` is an option to `createPermix`, not `.contextKey()`. Use `.contextKey()` when two Permix instances share one context (permissions vs feature flags).
