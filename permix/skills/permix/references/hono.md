# Hono (`permix/hono`)

Docs: https://permix.letstri.dev/docs/integrations/hono

Follow [server.md](server.md). Setup callback receives `{ c }` (Hono context).

```ts
import { createPermix } from 'permix/hono'

const permix = createPermix<{ post: ['create', 'read'] }>()

app.use(
  permix.setupMiddleware(({ c }) => {
    const user = c.get('user')
    return { post: { create: true, read: true } }
  })
)
```

Guard routes with `permix.checkMiddleware('post.create')`. Read the instance with `permix.getOrThrow(c)`.
