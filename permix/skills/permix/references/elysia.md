# Elysia (`permix/elysia`)

Docs: https://permix.letstri.dev/docs/integrations/elysia

Follow [server.md](server.md). Setup is `onBeforeHandle(permix.setupMiddleware(({ context }) => rules))`. Guards use `beforeHandle: permix.checkMiddleware('post.create')`.

Do not type the check handler against Elysia's full `Context` (validated `query`/`body` will fail). The adapter only needs `permix` + `set`.

```ts
import { createPermix } from 'permix/elysia'

const permix = createPermix<{ post: ['create', 'read'] }>()

new Elysia()
  .onBeforeHandle(permix.setupMiddleware(({ context }) => rulesFor(context)))
  .post('/posts', handler, {
    beforeHandle: permix.checkMiddleware('post.create'),
  })
```
