# oRPC (`permix/orpc`)

Docs: https://permix.letstri.dev/docs/integrations/orpc

Same shape as [trpc.md](trpc.md): `setupContext` in middleware, then `checkMiddleware`.

```ts
import { createPermix } from 'permix/orpc'

const permix = createPermix<{
  post: ['create', 'read']
}>().contextKey('permissions')

const protectedMiddleware = os.$context<Context>().use(({ context, next }) =>
  next({
    context: permix.setupContext({
      post: { create: true, read: true },
    }),
  })
)
```

`onForbidden` belongs on `createPermix`. Custom `contextKey` is required if two instances share one oRPC context.
