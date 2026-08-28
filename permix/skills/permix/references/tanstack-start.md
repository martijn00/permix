# TanStack Start (`permix/tanstack-start`)

Docs: https://permix.letstri.dev/docs/integrations/tanstack-start Example: https://github.com/letstri/permix/tree/main/examples/tanstack-start

Two instances, two jobs:

|  | Server request context | Router context |
| --- | --- | --- |
| Created by | `setupMiddleware()` / `createSetupHandler` | `getRouter()` |
| Read with | `permix.get(context)` | `context.permix` |
| Available in | server functions, server routes | `beforeLoad`, `loader`, components |
| Rules | full, including functions | hydrated booleans |
| Trustworthy | yes — enforcement | no — UX only |

Share the definition with `ValidateDefinition`. Client UI uses [react.md](react.md).

**Typing the router context without passing `context: { permix }` in `getRouter()` leaves `context.permix` undefined.**

**Server-only imports:** if the setup callback imports auth/DB/`node:` modules, do **not** put that callback inside `setupMiddleware()` from the library — Start only strips `.server()` it sees in **app** source. Use:

```ts
createMiddleware().server(
  permix.createSetupHandler(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    return {/* rules */}
  })
)
```

Hydrate the router-context instance in the root `beforeLoad`, then wrap `PermixProvider` with that same instance. See [hydration.md](hydration.md).
