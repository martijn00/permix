# Node HTTP (`permix/node`)

Docs: https://permix.letstri.dev/docs/integrations/node

Follow [server.md](server.md). There is no framework router — **await** `setupMiddleware` inside `http.createServer` (or equivalent) before `checkMiddleware`.

```ts
import { createPermix } from 'permix/node'

const permix = createPermix<{ post: ['create', 'read'] }>()

const server = http.createServer(async (req, res) => {
  const next = () => {}
  await permix.setupMiddleware(({ req }) => rulesFor(req))(req, res, next)
  // then checkMiddleware or getOrThrow(req)
})
```

For Fetch-style `(req, next) => Response` (srvx and similar), use `permix/server` instead of `permix/node`.
