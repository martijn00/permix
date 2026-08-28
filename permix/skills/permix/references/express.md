# Express (`permix/express`)

Docs: https://permix.letstri.dev/docs/integrations/express Example: https://github.com/letstri/permix/tree/main/examples/express

Follow [server.md](server.md). Context for setup is `{ req, res, next }`.

```ts
import { createPermix } from 'permix/express'

const permix = createPermix<{ post: ['create', 'read'] }>()

app.use(permix.setupMiddleware(({ req }) => rulesFor(req.user)))
app.post('/posts', permix.checkMiddleware('post.create'), handler)

app.get('/posts/:id', (req, res) => {
  const p = permix.getOrThrow(req)
  if (!p.check('post.read', post)) return res.status(403).end()
})
```
