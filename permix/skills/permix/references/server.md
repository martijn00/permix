# Server middleware kernel

Authorization must run on the server. Client checks are UX only — [security.md](security.md).

Docs (canonical Express shape): https://permix.letstri.dev/docs/integrations/express

Import from the **framework subpath**, not bare `permix`.

## Pattern

1. `createPermix<D>()` from `permix/<adapter>`
2. `setupMiddleware(rules | ({ ctx }) => rules)` **before** guards
3. `checkMiddleware('post.create')` (path, callback, or `~all`/`~any`)
4. `getOrThrow(req)` in handlers for entity checks after the resource is loaded

Denied requests default to `403` with `{ error: 'Forbidden' }`. Customize with `onForbidden` on `createPermix`.

```ts
app.use(
  permix.setupMiddleware(async ({ req }) => {
    const user = req.user
    return {
      post: {
        create: true,
        update: (post) => post.authorId === user.id,
      },
    }
  })
)

app.post('/posts', permix.checkMiddleware('post.create'), createPostHandler)
```

Templates: `app.use(permix.setupMiddleware(permix.template(adminRules)()))`.

## Deltas (load after this file)

| Adapter | Reference |
| --- | --- |
| Express | [express.md](express.md) |
| Hono | [hono.md](hono.md) |
| Fastify | [fastify.md](fastify.md) |
| Node `http` | [node.md](node.md) |
| Web `Request`/`Response` / srvx | use `permix/server` — same kernel, `({ req })` is a Fetch `Request` |
| Elysia | [elysia.md](elysia.md) |
| Astro | [astro.md](astro.md) |
| Nest | [nest.md](nest.md) (guard, not middleware) |
| tRPC / oRPC | [trpc.md](trpc.md) / [orpc.md](orpc.md) (`setupContext`, not `setupMiddleware`) |

## Checklist

- [ ] Setup runs before check
- [ ] Rules from authenticated context, not client headers alone
- [ ] Entity checks pass resource data
- [ ] Same paths as the UI
