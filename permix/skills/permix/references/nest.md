# NestJS (`permix/nest`)

Docs: https://permix.letstri.dev/docs/integrations/nest Example: https://github.com/letstri/permix/tree/main/examples/nest

Not `setupMiddleware`. Register `permix.guard(...)` as global `APP_GUARD`. The guard always attaches a per-request instance and only **enforces** when `@Check` is present.

```ts
import { APP_GUARD } from '@nestjs/core'
import { createPermix } from 'permix/nest'

export const permix = createPermix<{
  post: ['create', 'read', { name: 'update'; type: Post }]
}>()

{
  provide: APP_GUARD,
  useValue: permix.guard(({ req }) => ({
    post: { create: !!req.user, read: true, update: false },
  })),
}

@Get()
@permix.Check('post.read')
findAll() {}
```

Entity checks run in the handler after the resource is loaded: `permix.getOrThrow(req).check('post.update', post)`. Works with Express and Fastify HTTP adapters.
