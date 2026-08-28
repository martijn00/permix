# Fastify (`permix/fastify`)

Docs: https://permix.letstri.dev/docs/integrations/fastify

Follow [server.md](server.md). `setupMiddleware` is a **plugin** — `await fastify.register(...)`. Setup callback receives `{ request, reply }`.

```ts
import { createPermix } from 'permix/fastify'

const permix = createPermix<{ post: ['create', 'read'] }>()

await fastify.register(
  permix.setupMiddleware(({ request }) => rulesFor(request.user))
)
```

Guard routes with `preHandler: permix.checkMiddleware('post.create')`.
