# Drizzle (`permix/drizzle`)

Docs: https://permix.letstri.dev/docs/integrations/drizzle

Generates one permission entity per table with CRUD actions by default.

| Import                  | Drizzle version                      |
| ----------------------- | ------------------------------------ |
| `permix/drizzle`        | v1 (`>=1.0.0-rc`) — tables and views |
| `permix/drizzle/legacy` | v0 (`>=0.30 <1`) — tables only       |

```ts
import { createPermix } from 'permix/drizzle'

const permix = createPermix(schema)

permix.setup({
  users: { create: true, read: true, update: false, delete: false },
  posts: { create: true, read: true, update: true, delete: false },
})

permix.check('users.read')
```

This is a definition factory, not HTTP middleware. Still enforce with a server adapter. Custom action lists are documented on the integration page — do not invent a second schema mapper.
